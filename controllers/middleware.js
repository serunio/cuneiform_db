const db = require('../src/db');
const jwt = require('jsonwebtoken')

exports.adminMiddleware =  (req, res, next) => {
    const header = req.headers.authorization
    if(!header?.startsWith('ApiKey ') )
        return res.status(401).send("Unauthorized")
    const key = header.split(' ')[1]
    if(key !== process.env.ADMIN_API_KEY)
        return res.status(403).send("Forbidden")
    next()
}

exports.verifyJWT = (req, res, next) => {
    const header = req.headers.authorization
    if(!header?.startsWith("Bearer ")) {
        return res.status(401).send("No token")
    }
    const token = header.split(" ")[1]
    let decoded
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (e) {
        console.log(e)
        return res.status(401).send("Unauthorized (JWT verification failed)")
    }
    req.decodedJWT = decoded
    next()
}

exports.verifyAdmin = (req, res, next) => {
    const decodedJWT = req.decodedJWT

    if (decodedJWT.admin !== 1) {
        return res.status(401).send("Unauthorized (no admin in JWT)")
    }
    const result = db.prepare(`select admin = true as 'isAdmin' from users where id = ?`).get(decodedJWT.uid)
    if (result['isAdmin'] !== 1) {
        return res.status(401).send("Unauthorized (no admin in db)")
    }
    next()
}