const router = require('express').Router();
const c = require('../controllers/submissions.controller');
const m = require('../controllers/middleware')

router.post('/', m.verifyJWT, m.checkBlacklist, c.add)
router.get('/', c.getAll)

module.exports = router;