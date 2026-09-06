const prisma = require('../lib/prisma');
const { SensorType, IngestionStatus } = require('../generated/prisma/enums');
const timespan = require('jsonwebtoken/lib/timespan');

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
            const injectionsList = req.body;
            const validInjections = [];
            
            if (!Array.isArray(injectionsList)) {
                throw new Error("Invalid data format. Expected an array of records.");
            }

            for (const injection of injectionsList) {
                if (!injection.sensorCode || injection.ts === undefined || injection.value === undefined) {
                    throw new Error('Any required field is missing');
                }

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