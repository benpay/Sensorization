const jwt = require('jsonwebtoken');
const { isTokenRevoked } = require('../middlewares/tokenBlacklists');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv/config'); 
}

const {KEY} = process.env;

const verifyToken = (req, res, next) => {
    const authorization = req.headers.authorization;
    const bearerToken = authorization && authorization.startsWith('Bearer ')
        ? authorization.slice(7)
        : null;
    const token = req.cookies.accessToken || bearerToken;

    if (!token) return res.status(401).send("Access Denied");
    if (isTokenRevoked(token)) return res.status(401).send("Token has been revoked");
    
    try {
        const decoded = jwt.verify(token, KEY);
        req.user = decoded;
        next();
        
    } catch (err) {
        return res.status(400).send("Invalid Token");
    }
}

exports = module.exports = verifyToken;