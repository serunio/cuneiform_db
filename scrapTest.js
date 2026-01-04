const {JSDOM} = require("jsdom");

async function fetchHtml() {
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
        if (phonetic.match(/\.|over|x|squared/) || unicodeUrIII !== unicodeNeoAssyrian) return;
        values.push({unicode: unicodeUrIII, phonetic});
    });
    console.log(values);
}

fetchHtml().then(() => {
});