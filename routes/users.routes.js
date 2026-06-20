const router = require('express').Router();
const c = require('../controllers/users.controller');
const m = require('../controllers/middleware')

router.get('/login', c.login);
router.get('/me', m.verifyJWT, c.me)

module.exports = router;