import { Pool, PoolClient } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

export class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (process.env.NODE_ENV === 'development') {
        console.log('Query executed:', { text, duration, rows: res.rowCount });
      }

      return res;
    } catch (error) {
      console.error('Database query error:', { text, params, error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async migrate(): Promise<void> {
    console.log('Running database migrations...');

    try {
      const migrationPath = join(__dirname, '../../migrations/001_initial_schema.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf8');

      await this.query(migrationSQL);
      console.log('✅ Database migration completed successfully');
    } catch (error) {
      console.error('❌ Database migration failed:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT NOW()');
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // Utility method to create monthly message partitions
  async createMessagePartition(year: number, month: number): Promise<void> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;

    try {
      await this.query(
        'SELECT create_monthly_partition($1, $2)',
        ['messages', startDate]
      );
      console.log(`✅ Created message partition for ${year}-${month}`);
    } catch (error) {
      console.error(`❌ Failed to create partition for ${year}-${month}:`, error);
      throw error;
    }
  }
}

// Singleton instance
export const database = new Database();