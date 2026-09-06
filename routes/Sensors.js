const auth = require('../middlewares/auth');
const controller = require('../controllers/Sensors');
const ingestion = require('../controllers/Ingestions');

const SensorRoutes = (app) => {
    app.post('/sensors/registerSensor', auth, (req, res) => {
        return controller.registerSensor(req, res);
    })

    app.get('/sensors/getSensors', auth, (req, res) => {
        return controller.getSensors(req, res);
    })

    app.get('/sensors/getSensorById/:id', auth, (req, res) => {        
        return controller.getSensorById(req, res);
    })

    app.patch('/sensors/updateSensorById/:id', auth, (req, res) => {
        return controller.updateSensorById(req, res);
    })

    app.delete('/sensors/deleteSensorById/:id', auth, (req, res) => {
        return controller.deleteSensorById(req, res);
    })

    app.post('/ingestion/ingest/:id/ingest', auth, (req, res) => {
        return ingestion.ingest(req, res);
    })
}

module.exports = SensorRoutes;