const { revokeToken } = require('../middlewares/tokenBlacklists');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv/config');
}

const { KEY } = process.env;

const register = async (req, res) => {
    try {
        if (!req.body) { return res.status(400).send("Content can not be empty!"); }

        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).send("All fields are required");
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) { return res.status(400).send("User already exists"); }

        const user = await prisma.user.create({
            data: {                
                email,
                password: await bcrypt.hash(password, 10)
            }
        });

        return res.status(201).json(user);
    } catch (err) {
        console.log("Error registering user:", err);
        return res.status(400).send(err);
    }
}

const login = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).send("Content can not be empty!");
        }

        if (!req.body.email || !req.body.password) {
            return res.status(400).send("All fields are required");
        }

        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).send("Invalid credentials");
        }

        const token = jwt.sign({ email }, KEY, { expiresIn: '15m' });
        res.cookie('accessToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000, // 15 minutos
            path: '/'
        })

        return res.status(200).json({ message: "User logged in successfully", user: { name: user.name, email: user.email, password: user.password } });
            
    } catch (err) {
        console.log("Error logging in user:", err);
        return res.status(400).send(err);
    }
}

const logout = (req, res) => {
    try {
        const token = req.cookies.accessToken;

        if (!token) { return res.status(400).send("Access denied!"); }

        const expiresAt = req.user.exp * 1000;
        revokeToken(token, expiresAt);

        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        return res.status(200).send("User logged out successfully");
    } catch (err) {
        console.log("Error logging out user:", err);
        return res.status(400).send(err);
    }
}

module.exports = { register, login, logout };