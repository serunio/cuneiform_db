const { user } = require('pg/lib/defaults');
const db = require('../src/db');
const {JSDOM} = require('jsdom');
const {strokes} = require('./../compressor.mts')
const {getFeatures} = require('./../transform.mts')

exports.getCuneiAll = async (req, res) => {
    const result = await db.query('select * from cunei');
    const rows = result.rows;
    res.send(rows);
}

exports.getCunei = async (req, res) => {
    const result = await db.query('select * from cunei where id = $1', [req.params.id])
    const row = result.rows[0]
    res.send(row);
}

exports.getCuneiForUser = async (req, res) => {
    const userId = req.decodedJWT.uid;

    const result = await db.query(
        `
        SELECT
            c.id,
            c.phonetic,
            c.unicode,
            COUNT(s.user_id) FILTER (WHERE s.user_id = $1) AS user_count,
            COUNT(s.user_id) FILTER (WHERE s.user_id IS NOT NULL) AS total_count
        FROM cunei c
        LEFT JOIN submissions s ON s.cunei_id = c.id
        WHERE c.chosen = true
        GROUP BY c.id, c.phonetic, c.unicode
        `,
        [userId]
    );

    res.send(result.rows);
};

exports.chooseCunei = async (req, res) => {
    const id = req.params.id
    try {
        const result = await db.query('update cunei set chosen = true where id = $1', [id])
        console.log(result)
        res.send(`cunei ${id} chosen`)
    } catch (e) {
        console.log(e)
        res.status(500).send(e.message)
    }
}

exports.getNextCunei = async (req, res) => {
    const result = await db.query('select * from cunei where id > $1 order by id limit 1', [req.params.id])
    const row = result.rows[0]
    res.send(row);
}

exports.getPreviousCunei = async (req, res) => {
    const result = await db.query('select * from cunei where id < $1 order by id limit 1', [req.params.id])
    const row = result.rows[0]
    res.send(row);
}

exports.getNext = async (req, res) => {
    const userId = req.decodedJWT.uid;

    const result = await db.query(
        `
        SELECT
            c.id,
            c.phonetic,
            c.unicode,
            COUNT(s.user_id) FILTER (WHERE s.user_id = $1) AS user_count,
            COUNT(s.user_id) FILTER (WHERE s.user_id IS NOT NULL) AS total_count
        FROM cunei c
        LEFT JOIN submissions s ON s.cunei_id = c.id
        WHERE c.chosen = true
        GROUP BY c.id, c.phonetic, c.unicode
        ORDER BY user_count, total_count, RANDOM()
        LIMIT 1`,
        [userId]
    );

    const row = result.rows[0]
    res.send(row);
}

exports.guess = async (req, res) => {
    const data = req.body.submission;
    if (data === "")
        res.send('empty data')
    const sign= {N:0, NE:0, E:0, SE:0, S:0, SW:0, W:0, NW:0, H:0, crosses:0}
    const features = {...sign, ...getFeatures(strokes.fromBuffer(r.data))}
    const result = await db.query(
        `select * from cunei_stats
            where n=$1 and
            where ne=$2 and
            where e=$3 and
            where se=$4 and
            where s=$5 and
            where sw=$6 and
            where w=$7 and
            where nw=$8 and
            where h=$9 and
            where crosses=$10`,
            [features.N, features.NE, features.E, features.SE, features.S, features.SW, features.W, features.NW, features.H, features.crosses]
    )   
    res.send(result.rows)
}

exports.scrapCunei = async (req, res) => {
    const response = await fetch('https://home.zcu.cz/~ksaskova/ListOfCuneiformSigns.html');
    const html = await response.text();
    const dom = new JSDOM(html);
    const rows = dom.window.document.querySelectorAll('tr');
    const values = [];
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const cellValues = Array.from(cells).map(cell => cell.querySelector('p').textContent.trim());
        const unicodeUrIII = cellValues[0].replace(/\s+/g, ' ');
        const unicodeNeoAssyrian = cellValues[1].replace(/\s+/g, ' ');
        const phonetic = cellValues[2].replace(/\s+/g, ' ');
        if (phonetic.match(/\.|over|x|squared|\+|crossing/) || unicodeUrIII !== unicodeNeoAssyrian || unicodeUrIII.length !== 2) return;
        values.push({unicode: unicodeUrIII, phonetic: phonetic});
    });

    await db.query(
        'TRUNCATE TABLE cunei RESTART IDENTITY CASCADE'
    );

    for (const row of values) {
        await db.query(
            `
            INSERT INTO cunei (unicode, phonetic)
            VALUES ($1, $2)
            ON CONFLICT (unicode) DO NOTHING
            `,
            [row.unicode, row.phonetic]
        );
    }
    res.send(`Scraped and inserted ${values.length} cunei`);
}