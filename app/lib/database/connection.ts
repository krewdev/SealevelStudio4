/**
 * Database Connection Utility
 * Handles PostgreSQL database connections with connection pooling
 */

import { Pool, PoolClient, QueryResult } from 'pg';

let pool: Pool | null = null;

/**
 * Get database connection pool
 * Creates a singleton pool instance
 */
export function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      // Fallback to in-memory mode if no database configured
      console.warn('⚠️  DATABASE_URL not configured. Wallet recovery will use in-memory storage.');
      return null as any;
    }

    pool = new Pool({
      connectionString: databaseUrl,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return pool;
}

/**
 * Execute a database query
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database not configured. Please set DATABASE_URL environment variable.');
  }
  return pool.query<T>(text, params);
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database not configured. Please set DATABASE_URL environment variable.');
  }
  return pool.connect();
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
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

/**
 * Close the database pool (for cleanup)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Check if database is available
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    if (!pool) return false;
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

