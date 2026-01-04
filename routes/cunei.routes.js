const router = require('express').Router();
const c = require('../controllers/cunei.controller');

router.post('/', c.addCunei);
router.get('/', c.getCunei);
router.get('/scrap', c.scrapCunei);

module.exports = router;