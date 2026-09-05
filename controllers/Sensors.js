const prisma = require('../lib/prisma');
const { SensorType, SensorStatus } = require('../generated/prisma/enums');
const validarUrlMiddleware = require('../middlewares/urlValidator');

const register = async (req, res) => {
    const token = req.cookies.accessToken;
    if (!token) { return res.status(400).send("Access denied!"); }
    
    try {
        // 1. Los datos ya vienen 100% validados por Zod aquí gracias al middleware
        const { sensorName, sensorCode, type, status, url, userId } = req.body;

        // 2. Única validación lógica / de base de datos que se queda en el controlador
        const existingSensor = await prisma.sensor.findUnique({
            where: { sensorCode }
        });
        if (existingSensor) {
            return res.status(400).send("Sensor already exists");
        }

        // 3. Ejecución directa de la validación de formato si es HTTP_POLL
        let sensorUrl = null;
        if (type === SensorType.HTTP_POLL) {
            let validationSuccess = false;

            // Tu middleware actual para verificar el formato físico de la URL
            validarUrlMiddleware(req, res, () => {
                validationSuccess = true;
            });

            if (!validationSuccess) { return; }
            sensorUrl = url;
        }

        // 4. Inserción directa
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

module.exports = { register, getSensors };