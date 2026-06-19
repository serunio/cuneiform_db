const { Pool } = require('pg');

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    family: 4
});

async function initDb() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS cunei
        (
            id BIGSERIAL PRIMARY KEY,
            unicode TEXT NOT NULL UNIQUE,
            phonetic TEXT NOT NULL,
            description TEXT,
            chosen BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS users
        (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            name TEXT,
            admin BOOLEAN NOT NULL DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS submissions
        (
            id BIGSERIAL PRIMARY KEY,
            cunei_id BIGINT NOT NULL REFERENCES cunei(id),
            user_id TEXT NOT NULL REFERENCES users(id),
            data BYTEA NOT NULL
        );
    `);
}

initDb()
    .then(() => console.log('Database initialized'))
    .catch(console.error);

module.exports = db;