const auth = require('../middlewares/auth');
const controller = require('../controllers/Sensors');

const SensorRoutes = (app) => {
    app.post('/sensors/register', auth, (req, res) => {
        return controller.register(req, res);
    })

    app.get('/sensors/getSensors', auth, (req, res) => {
        return controller.getSensors(req, res);
    })
}

module.exports = SensorRoutes;