const Database = require('better-sqlite3');

const db = new Database(process.env.DATABASE);

db.exec(`
  CREATE TABLE IF NOT EXISTS cunei (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unicode TEXT NOT NULL UNIQUE,
    phonetic TEXT NOT NULL,
    description TEXT
  );
`);

module.exports = db;
