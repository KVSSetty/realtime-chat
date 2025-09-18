const { Pool } = require('pg');
require('dotenv').config();

async function resetDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🗑️  Starting database reset...');

    // Drop all tables in reverse dependency order
    const dropSQL = `
      DROP TABLE IF EXISTS room_memberships CASCADE;
      DROP TABLE IF EXISTS messages CASCADE;
      DROP TABLE IF EXISTS messages_2025_09 CASCADE;
      DROP TABLE IF EXISTS messages_2025_10 CASCADE;
      DROP TABLE IF EXISTS chat_rooms CASCADE;
      DROP TABLE IF EXISTS users CASCADE;

      -- Drop functions
      DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
      DROP FUNCTION IF EXISTS create_monthly_partition(text, date) CASCADE;
    `;

    await pool.query(dropSQL);
    console.log('✅ Dropped all tables and functions');

    // Re-run migrations
    const { runMigrations } = require('./migrate');
    await runMigrations();

    console.log('🎉 Database reset completed successfully');

  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  resetDatabase();
}

module.exports = { resetDatabase };