const router = require('express').Router();
const c = require('../controllers/users.controller');
const m = require('../controllers/middleware')

router.get('/login', c.login);
router.get('/me', m.verifyJWT, c.me)
router.post('/blacklist', m.verifyJWT, m.verifyAdmin, c.blacklist)

module.exports = router;