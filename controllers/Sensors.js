const prisma = require('../lib/prisma');
const { SensorType } = require('../generated/prisma/enums');
const {validateUrl, validateSensor} = require('../validators/sensor.schema');

const register = async (req, res) => {
    const token = req.cookies.accessToken;
    if (!token) { return res.status(400).send("Access denied!"); }

    try {
        const { sensorName, sensorCode, type, status, userId } = req.body;

        let validationSuccess = false;        
        validateSensor(req, res, () => {
            validationSuccess = true;
        });
        if (!validationSuccess) { return; }

        const existingSensor = await prisma.sensor.findUnique({
            where: { sensorCode }
        });

        if (existingSensor) {
            return res.status(400).send("Sensor already exists");
        }

        const sensorUrl = req.body.url || null;
        const sensor = await prisma.sensor.create({
            data: {
                sensorName,
                sensorCode,
                type,
                status,
                url: sensorUrl,
                userId
            }
        });

        return res.status(201).json(sensor);

    } catch (err) {
        console.log("Error registering sensor:", err);
        return res.status(400).send(err);
    }
}

const getSensors = async (req, res) => {
    const token = req.cookies.accessToken;
    if (!token) { return res.status(400).send("Access denied!"); }

    try {
        const sensors = await prisma.sensor.findMany();

        return res.status(200).json(sensors);

    } catch (err) {
        console.log("Error fetching sensors:", err);
        return res.status(400).send(err);
    }
}

const getSensorById = async (req, res) => {
    const token = req.cookies.accessToken;
    if (!token) { return res.status(400).send("Access denied!"); }

    try {
        const sensorId = parseInt(req.params.id);
        if (isNaN(sensorId)) {
            return res.status(400).send("Invalid sensor ID");
        }

        const sensorById = await prisma.sensor.findUnique({
            where: { id: parseInt(sensorId) }
        });

        return res.status(200).json(sensorById);

    } catch (err) {
        console.log("Error fetching sensor by ID:", err);
        return res.status(400).send(err);
    }
}

const updateSensorById = async (req, res) => {
    const token = req.cookies.accessToken;
    if (!token) { return res.status(400).send("Access denied!"); }

    try {
        const { sensorName, sensorCode, type, status, url } = req.body;
        const sensorId = parseInt(req.params.id);

        if (isNaN(parseInt(sensorId))) {
            return res.status(400).send("Invalid sensor ID");
        }
                
        let sensorUrl = null;
        if ((type !== SensorType.HTTP_POLL && type !== SensorType.MANUAL_UPLOAD)){
            return res.status(400).send("Type must be either HTTP_POLL or MANUAL_UPLOAD");
        }

        if (status !== 'active' && status !== 'paused') {
            return res.status(400).send("Status must be either active or paused");
        }

        if (type === SensorType.HTTP_POLL) {
            let validationSuccess = false;

            validateUrl(req, res, () => {
                validationSuccess = true;
            });

            if (!validationSuccess) { return; }
            sensorUrl = url;
        }

        const sensorNameExists = await prisma.sensor.findUnique({
            where: { sensorName }
        });
        
        if (sensorNameExists && sensorNameExists.id !== sensorId) {
            return res.status(400).send("A sensor with this name already exists");
        }

        const updateSensor = await prisma.sensor.update({
            where: { id: sensorId },
            data: {
                sensorName: sensorName || prisma.skip,
                sensorCode: sensorCode || prisma.skip,
                type: type || prisma.skip,
                status: status || prisma.skip,
                url: sensorUrl || prisma.skip
            }
        });

        return res.status(200).json(updateSensor);

    } catch (err) {
        console.log("Error updating sensor:", err);
        return res.status(400).send(err);
    }
}

const deleteSensorById = async (req, res) => {
    const token = req.cookies.accessToken;
    if (!token) { return res.status(400).send("Access denied!"); }

    try {
        const sensorId = parseInt(req.params.id);
        if (isNaN(sensorId)) {
            return res.status(400).send("Invalid sensor ID");
        }

        const deletedSensor = await prisma.sensor.delete({
            where: { id: sensorId }
        });

        return res.status(200).json(deletedSensor);

    } catch (err) {
        console.log("Error deleting sensor:", err);
        return res.status(400).send(err);
    }
}

module.exports = { register, getSensors, getSensorById, updateSensorById, deleteSensorById };