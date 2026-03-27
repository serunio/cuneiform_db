const router = require('express').Router();
const c = require('../controllers/users.controller');

router.get('/login', c.login);

module.exports = router;