const db = require('../src/db');
const {auth} = require('./../firebase')
const jwt = require('jsonwebtoken')

exports.login = async (req, res) => {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
        return res.status(401).send("No token");
    }

    const token = header.split(" ")[1];

    let decoded;
    try {
        decoded = await auth().verifyIdToken(token);
    } catch (e) {
        console.log(e);
        return res.status(401).send("Unauthorized");
    }

    try {
        const result = await db.query(
            'SELECT * FROM users WHERE id = $1',
            [decoded.uid]
        );

        const user = result.rows[0];

        if (!user) {
            await db.query(
                'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
                [decoded.uid, decoded.email, decoded.name]
            );
        }

        const payload = {
            uid: decoded.uid,
            name: decoded.name,
            email: decoded.email,
            admin: user?.admin ?? false
        };

        const jwtToken = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.send(jwtToken);

    } catch (e) {
        console.log(e);
        res.status(500).send("db error");
    }
};

exports.me = async (req, res) => {
    res.status(200).send("ok")
}