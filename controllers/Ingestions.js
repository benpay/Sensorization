const prisma = require('../lib/prisma');
const { SensorType, IngestionStatus } = require('../generated/prisma/enums');
const timespan = require('jsonwebtoken/lib/timespan');
const { validateUrl } = require('../validators/sensor.schema');

const ingest = async (req, res) => {
    const token = req.cookies.accessToken;
    if (!token) { return res.status(400).send("Access denied!"); }

    const sensorId = req.params.id;
    const sensor = await prisma.sensor.findUnique({
        where: { id: sensorId }
    });

    if (!sensor) {
        return res.status(404).send("Sensor not found");
    }

    if (sensor.type === SensorType.MANUAL_UPLOAD) {
        const run = await prisma.ingestion.create({
            data: {
                sensorId,
                startedAt: new Date(),
                status: IngestionStatus.error,
                recordsProcessed: 0,
            }
        });

        try {
            const validInjections = [];
            let injectionsList;

            if (sensor.type === SensorType.HTTP_POLL) {
                if (!sensor.url) {
                    throw new Error("HTTP_POLL sensor require a configured URL")
                }

                let validationSuccess = false;
                validateUrl(req, res, () => {
                    validationSuccess = true;
                });
                if (!validationSuccess) { return; }

                const response = await fetch(sensor.url);
                if (!response.ok) {
                    throw new Error('Not OK to fetch data from remote url')
                }

                injectionsList = await response.json();
            }
            else if (sensor.type === SensorType.MANUAL_UPLOAD) { injectionsList = req.body }
            else {
                throw new Error("Something went wrong");
            }

            /** CASE OF FORMAT A */
            if (Array.isArray(injectionsList)) {
                for (const injection of injectionsList) {
                    if (!injection.sensorCode || injection.ts === undefined || injection.value === undefined) {
                        throw new Error('Any required field is missing');
                    }

                    console.log(sensor.sensorCode)
                    if (injection.sensorCode !== sensor.sensorCode) {
                        continue;
                    }

                    const date = new Date(injection.ts);
                    if (isNaN(date.getTime())) {
                        throw new Error('Date ISO is not valid', injection.ts);
                    }

                    if (typeof injection.value !== 'number') {
                        throw new Error('Temperature value is not valid', injection.value)
                    }

                    validInjections.push({
                        sensorId: sensorId,
                        timestamp: date,
                        valueC: injection.value
                    });
                }
            }
            /** CASE OF FORMAT B */
            else if (typeof injectionsList === 'object' && 'deviceId' in injectionsList) {
                if (injectionsList.deviceId !== sensor.sensorCode) {
                    throw new Error('deviceId ', injectionsList.deviceId, ' does not match with sensor ', sensor.sensorCode);
                }

                if (!Array.isArray(injectionsList.data) || injectionsList.data.length === 0) {
                    throw new Error('Request requires a non-empty data array');
                }

                injectionsList.data.forEach(injection => {
                    if (injection.time === undefined || injection.temp === undefined) {
                        throw new Error('Missing time or temp field');
                    }

                    if (typeof injection.time !== 'number') {
                        throw new Error('Unix timestamp must be a number')
                    }

                    if (typeof injection.temp !== 'number') {
                        throw new Error('Temperature value must be a number');
                    }

                    validInjections.push({
                        sensorId: sensorId,
                        timestamp: new Date(injection.time * 1000),
                        valueC: injection.temp
                    });
                });
            }

            if (validInjections.length === 0) {
                throw new Error(`There are no injections for sensor ${sensor.sensorCode}`);
            }

            await prisma.temperature.createMany({
                data: validInjections
            });

            const updatedRun = await prisma.ingestion.update({
                where: { id: run.id },
                data: {
                    status: IngestionStatus.success,
                    finishedAt: new Date(),
                    recordsProcessed: validInjections.length
                },
            });

            return res.status(201).json(updatedRun);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);

            await prisma.ingestion.update({
                where: { id: run.id },
                data: {
                    status: IngestionStatus.error,
                    finishedAt: new Date(),
                    errorMessage
                }
            });
            return res.status(400).send(errorMessage);
        }
    }
}

module.exports = { ingest };