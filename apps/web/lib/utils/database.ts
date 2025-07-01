import { Pool } from 'pg';

/**
 * Database connection singleton
 * 
 * Ensures we only have one connection pool instance across the application
 * to prevent connection exhaustion issues.
 */

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
      // Connection pool configuration
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

export const getDatabase = () => DatabaseConnection.getInstance();
export const getDatabasePool = () => getDatabase().getPool();
