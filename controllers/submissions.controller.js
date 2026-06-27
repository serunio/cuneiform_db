const db = require('../src/db')
const {compress, decompress} = require('../compressor.mts')

exports.add = async (req, res) => {
    const cuneiId = req.body.cuneiId;
    const data = req.body.submission;
    if (data === "")
        res.send('empty data')
    const dataCompressed = compress(data);
    const userId = req.decodedJWT.uid;

    try {
        await db.query(
            'INSERT INTO submissions (cunei_id, user_id, data) VALUES ($1, $2, $3)',
            [cuneiId, userId, dataCompressed]
        );
    } catch (e) {
        console.log(e);
        return res.status(500).send('db error');
    }

    res.send('cunei submitted');
};

exports.getAll = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                s.user_id,
                s.id,
                s.data,
                c.unicode,
                c.phonetic
            FROM submissions s
            JOIN cunei c ON s.cunei_id = c.id
        `);

        const rowsDecompressed = result.rows.map(r => ({
            ...r,
            data: decompress(r.data)
        }));

        res.send(rowsDecompressed);
    } catch (e) {
        console.log(e);
        res.status(500).send('db error');
    }
};