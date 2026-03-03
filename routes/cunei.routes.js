const router = require('express').Router();
const c = require('../controllers/cunei.controller');

router.get('/', c.getCuneiAll);
router.get('/scrap', c.scrapCunei);
router.get('/:id', c.getCunei)

module.exports = router;