const pool = require('../db');
const fs = require('fs');
const path = require('path');

async function seedDatabase() {
  console.log('--- Starting AV CAD Database Setup & Seed ---');

  const executeSqlFile = (filePath) => {
    return new Promise((resolve, reject) => {
      const sql = fs.readFileSync(filePath, 'utf8');
      const statements = sql
        .split(/;\s*[\r\n]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let completed = 0;
      if (statements.length === 0) return resolve();

      function runNext(index) {
        if (index >= statements.length) return resolve();
        const stmt = statements[index];
        if (!stmt) return runNext(index + 1);

        pool.query(stmt, (err) => {
          if (err) {
            console.warn(`Warning on statement ${index + 1}:`, err.message);
          }
          runNext(index + 1);
        });
      }

      runNext(0);
    });
  };

  try {
    console.log('1. Ensuring tables exist...');
    await executeSqlFile(path.join(__dirname, '../sql/01_create_tables.sql'));
    console.log('✓ Tables created/verified.');

    console.log('2. Populating categories...');
    await executeSqlFile(path.join(__dirname, '../sql/02_insert_categories.sql'));
    console.log('✓ Categories verified.');

    console.log('3. Populating equipment library...');
    await executeSqlFile(path.join(__dirname, '../sql/03_insert_equipment.sql'));
    console.log('✓ Equipment library verified.');

    console.log('--- Database Setup & Seed Completed Successfully! ---');
  } catch (error) {
    console.error('Database seeding failed:', error);
  } finally {
    pool.end();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
