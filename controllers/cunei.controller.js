const db = require('../src/db');
const {JSDOM} = require('jsdom');


exports.getCuneiAll = (req, res) => {
    const rows = db.prepare('select * from cunei').all()
    res.send(rows);
}

exports.getCunei = (req, res) => {
    const row = db.prepare('select * from cunei where id = ?').get(req.params.id)
    res.send(row);
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
    db.prepare('delete from cunei').run()
    db.prepare('delete from sqlite_sequence where name=\'cunei\'').run()
    const insert = db.prepare(
        'INSERT OR IGNORE INTO cunei (unicode, phonetic) VALUES (?, ?)'
    );

    const insertMany = db.transaction((rows) => {
        for (const row of rows) {
            insert.run(row.unicode, row.phonetic);
        }
    });

    insertMany(values);
    res.send(`Scraped and inserted ${values.length} cunei`);
}