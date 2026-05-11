const db = require('../src/db');
const {auth} = require('./../firebase')
const jwt = require('jsonwebtoken')

exports.login = async (req, res) => {
    const header = req.headers.authorization
    if(!header?.startsWith("Bearer ")) {
        return res.status(401).send("No token")
    }
    const token = header.split(" ")[1]

    let decoded
    try {
        decoded = await auth().verifyIdToken(token)
    } catch (e) {
        console.log(e)
        return res.status(401).send("Unauthorized")
    }
    const user = db.prepare('select * from users where id = ?').get(decoded.uid)
    if (user === undefined) {
        db.prepare('insert into users (id, email, name) values (?, ?, ?)')
            .run(decoded.uid, decoded.email, decoded.name)
    }

    const payload = {
        uid: decoded.uid,
        name: decoded.name,
        email: decoded.email,
        admin: user?.admin ?? 0
    }

    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '1h'})
    res.send(jwtToken)
}