const prisma = require('../lib/prisma');
const { SensorType, SensorStatus } = require('../generated/prisma/enums');
const validarUrlMiddleware = require('../middlewares/urlValidator');

const register = async (req, res) => {
    try {
        if (!req.body) { return res.status(400).send("Content can not be empty!"); }

        const { sensorName, sensorCode, type, status, url, userId } = req.body;

        if (!sensorName || sensorName.length < 2 || sensorName.length > 10) {
            return res.status(400).send("Sensor name must be between 3 and 10 characters");
        }
        
        if (!sensorCode || sensorCode.length < 2 || sensorCode.length > 10) {
            return res.status(400).send("Sensor code must be between 3 and 10 characters");
        }

        if (!type || !status || !userId ) {
            return res.status(400).send("Any required fields are missing");
        }

        if (!Object.values(SensorType).includes(type)) {
            return res.status(400).send(`Invalid sensor type. Allowed values: ${Object.values(SensorType).join(', ')}`);
        }

        if (!Object.values(SensorStatus).includes(status)) {
            return res.status(400).send(`Invalid sensor status. Allowed values: ${Object.values(SensorStatus).join(', ')}`);
        }

        const existingSensor = await prisma.sensor.findUnique({
            where: { sensorCode }
        });

        if (existingSensor) { return res.status(400).send("Sensor already exists"); }

        let sensorUrl = null;
        if (type && type === SensorType.HTTP_POLL) {
            let validationSuccess = false;

            // Si la URL no es válida, el middleware enviará una respuesta de error y no se ejecutará el resto del código.
            validarUrlMiddleware(req, res, () => {
                validationSuccess = true;
            });

            // La respuesta de error ya se ha enviado desde el middleware.
            if (!validationSuccess) { return; }

            sensorUrl = req.body.url;
        }

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

module.exports = { register };