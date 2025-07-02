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
    // Log environment check for debugging
    console.log('Database connection - DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('Database connection - DB_HOST:', process.env.DB_HOST);
    
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
      // Connection pool configuration
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Increased timeout to 10 seconds
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
