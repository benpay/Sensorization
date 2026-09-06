const auth = require('../middlewares/auth');
const controller = require('../controllers/Sensors');

const SensorRoutes = (app) => {
    app.post('/sensors/register', auth, (req, res) => {
        return controller.register(req, res);
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

    
}

module.exports = SensorRoutes;