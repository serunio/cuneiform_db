const db = require('../src/db');
const {JSDOM} = require('jsdom');

exports.addCunei = (req, res) => {
    // Logic to add a new cunei
    res.send('Cunei added');
}

exports.getCunei = (req, res) => {
    // Logic to get all cunei
    res.send('List of cunei');
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
        if (phonetic.match(/\.|over|x|squared|\+|crossing/) || unicodeUrIII !== unicodeNeoAssyrian) return;
        values.push({unicode: unicodeUrIII, phonetic: phonetic});
    });
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