const router = require('express').Router();
const c = require('../controllers/cunei.controller');
const m = require('../controllers/middleware')

router.get('/', c.getCuneiAll);
router.get('/for-user', m.verifyJWT, c.getCuneiForUser)
router.get('/next', m.verifyJWT, c.getNext)
router.get('/scrap', m.adminMiddleware, c.scrapCunei);
router.post('/choose/:id', m.verifyJWT, m.verifyAdmin, c.chooseCunei)
router.post('/guess', c.guess)
router.get('/:id', c.getCunei)
router.get('/:id/next', c.getNextCunei)
router.get('/:id/previous', c.getPreviousCunei)


module.exports = router;