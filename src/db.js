const Database = require('better-sqlite3');

const db = new Database(process.env.DATABASE);

db.exec(`
    CREATE TABLE IF NOT EXISTS cunei
    (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        unicode     TEXT NOT NULL UNIQUE,
        phonetic    TEXT NOT NULL,
        description TEXT,
        chosen      integer default false
    );

    CREATE TABLE IF NOT EXISTS users
    (
        id    text PRIMARY KEY,
        email TEXT NOT NULL,
        name  TEXT,
        admin int  not null default false
    );

    create table if not exists submissions
    (
        id       integer primary key autoincrement,
        cunei_id integer not null,
        user_id  text    not null,
        data     blob    not null,

        foreign key (cunei_id) references cunei (id),
        foreign key (user_id) references users (id)
    );
`);

module.exports = db;

