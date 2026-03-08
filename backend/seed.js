import { pool } from './db.js';
import { mockDeals } from '../src/data/mockData.js';

async function seed() {
    console.log('🔄 Starting database seed...');

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
        console.log('Dropping existing tours table...');
        await pool.query('DROP TABLE IF EXISTS tours;');

        console.log('Creating tours table...');
        await pool.query(createTableQuery);

        console.log('Inserting mock deals...');
        for (const deal of mockDeals) {
            const insertQuery = `
                INSERT INTO tours (
                    destination, country, flag, resort, stars, nights, meals,
                    operator, price, "oldPrice", discount, "departureDate", "daysLeft", image, urgent, "ultraHot", description, postlink
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            `;
            const values = [
                deal.destination, deal.country, deal.flag, deal.resort, deal.stars, deal.nights, deal.meals,
                deal.operator, deal.price, deal.oldPrice, deal.discount, deal.departureDate, deal.daysLeft, deal.image, deal.urgent, deal.ultraHot, 'Моковый тур для теста верстки', 'https://t.me/travel'
            ];
            await pool.query(insertQuery, values);
        }

        console.log(`✅ Successfully seeded ${mockDeals.length} tours into PostgreSQL!`);
    } catch (err) {
        console.error('❌ Error seeding database:', err);
    } finally {
        pool.end();
    }
}

seed();
