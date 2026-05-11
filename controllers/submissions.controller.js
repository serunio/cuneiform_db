const db = require('../src/db')
const {compress, decompress} = require('../compressor.mts')

exports.add = (req, res) => {
    const cuneiId = req.body.cuneiId
    const data = req.body.submission
    const dataCompressed = compress(data)
    const userId = req.decodedJWT.uid
    try {
        db.prepare('insert into submissions (cunei_id, user_id, data) values (?,?,?)').run(cuneiId, userId, dataCompressed)
    } catch (e) {
        console.log(e)
        res.status(500).send('db error')
    }
    res.send('cunei submitted')
}

exports.getAll = (req, res) => {
    const rows = db.prepare('select s.user_id, s.id, s.data, c.unicode, c.phonetic from submissions s join cunei c on s.cunei_id = c.id').all()
    const rowsDecompressed = rows.map(r => ({...r, data: decompress(r.data)}))
    res.send(rowsDecompressed)
}