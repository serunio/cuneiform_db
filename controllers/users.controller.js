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
        decoded = await auth.verifyIdToken(token);
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

        const isNewResult = await db.query(
            'SELECT COUNT(*) FROM submissions WHERE user_id = $1',
            [decoded.uid]
        )

        const submissionsCount = parseInt(isNewResult.rows[0].count)

        const payload = {
            uid: decoded.uid,
            name: decoded.name,
            email: decoded.email,
            admin: user?.admin ?? false,
            isNew: submissionsCount === 0
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
    const userId = req.decodedJWT.uid;
    const result = await db.query(`SELECT blacklist from users where id=$1`, [userId])
    const isBlacklisted = result.rows[0].blacklist
    if (isBlacklisted)
        res.status(401).send('Blacklisted')
    else
        res.status(200).send("ok")
}

exports.blacklist = async (req, res) => {
    const userId = req.body.user_id
    try {
        await db.query('UPDATE users SET blacklist = true WHERE id = $1', [userId])
        res.status(200).send('ok')
    } catch (e) {
        console.log(e);
        res.status(500).send("db error");
    }

    
}