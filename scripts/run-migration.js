/**
 * Database migration runner
 * Executes all .sql files in migrations/ against Supabase
 * 
 * Usage: npm run migrate
 * Requires: DATABASE_URL in .env
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

async function runMigration() {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    if (files.length === 0) {
        console.log('No migration files found.');
        return;
    }

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected.\n');

        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');
            
            console.log(`Running: ${file}`);
            
            try {
                await client.query(sql);
                console.log('  Success\n');
            } catch (err) {
                console.error(`  Error: ${err.message}\n`);
                throw err;
            }
        }

        console.log('All migrations completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
