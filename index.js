const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const routes = require('./routes/Users');
const SensorRoutes = require('./routes/Sensors');
const cookieParser = require('cookie-parser');
const cors = require('cors');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv/config'); 
}

const {PORT} = process.env;

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
routes(app);
SensorRoutes(app);
server.listen(PORT, () => {
    console.log("Server is running on port ", PORT);
});