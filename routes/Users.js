const auth = require('../middlewares/auth');
const controller = require('../controllers/Users');

const UserRoutes = (app) => {
    app.post('/login', (req, res) => {
        return controller.login(req, res);
    })

    app.post('/register', (req, res) => {
        return controller.register(req, res);
    })

    app.post('/logout', auth, (req, res) => {
        return controller.logout(req, res);
    })
    
    app.get('/me', auth, (req, res) => {
        return res.status(200).send("Welcome 🙌 ");
    })
}

module.exports = UserRoutes;