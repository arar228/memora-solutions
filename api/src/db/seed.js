import { pool } from './pool.js';

async function seed() {
    console.log('[Seed] Starting database seed...');

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS tours (
            id SERIAL PRIMARY KEY,
            destination VARCHAR(50) NOT NULL,
            country VARCHAR(100) NOT NULL,
            flag VARCHAR(10) NOT NULL,
            resort VARCHAR(255) NOT NULL,
            stars INTEGER NOT NULL,
            nights INTEGER NOT NULL,
            meals VARCHAR(20) NOT NULL,
            operator VARCHAR(100) NOT NULL,
            price INTEGER NOT NULL,
            oldPrice INTEGER NOT NULL,
            discount INTEGER NOT NULL,
            departureDate DATE NOT NULL,
            daysLeft INTEGER NOT NULL,
            image TEXT NOT NULL,
            urgent BOOLEAN NOT NULL DEFAULT false,
            "ultraHot" BOOLEAN NOT NULL DEFAULT false,
            description TEXT,
            postlink VARCHAR(255)
        );
    `;

    try {
        console.log('[Seed] Dropping existing tours table...');
        await pool.query('DROP TABLE IF EXISTS tours;');

        console.log('[Seed] Creating tours table...');
        await pool.query(createTableQuery);

        console.log('[Seed] Table created. Seed complete.');
    } catch (err) {
        console.error('[Seed] Error:', err);
    } finally {
        pool.end();
    }
}

seed();
