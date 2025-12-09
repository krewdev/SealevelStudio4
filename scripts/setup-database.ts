#!/usr/bin/env ts-node
/**
 * Database Setup Script
 * 
 * This script sets up the PostgreSQL database for Sealevel Studio.
 * It can be used to:
 * - Initialize the database schema
 * - Verify database connection
 * - Run migrations
 * 
 * Usage:
 *   npm run setup:database
 *   or
 *   ts-node scripts/setup-database.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local file if it exists
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      const value = valueParts.join('=').trim();
      if (key && value && !process.env[key]) {
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        process.env[key] = cleanValue;
      }
    }
  });
}

// Get script directory (works with ts-node)
const scriptDir = path.resolve(process.cwd());

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set.');
  console.error('   Please set it in your .env.local file:');
  console.error('   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sealevelstudio');
  process.exit(1);
}

// At this point, databaseUrl is guaranteed to be defined
const dbUrl: string = databaseUrl;

// Create connection pool
const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Read and execute SQL file
 */
async function executeSqlFile(filePath: string): Promise<void> {
  const fullPath = path.join(scriptDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ SQL file not found: ${fullPath}`);
    throw new Error(`SQL file not found: ${fullPath}`);
  }

  const sql = fs.readFileSync(fullPath, 'utf8');
  console.log(`📄 Executing: ${filePath}`);
  
  try {
    await pool.query(sql);
    console.log(`✅ Successfully executed: ${filePath}`);
  } catch (error: any) {
    // Ignore "already exists" errors for CREATE TABLE IF NOT EXISTS
    if (error.message.includes('already exists')) {
      console.log(`⚠️  Tables already exist in: ${filePath} (skipping)`);
    } else {
      throw error;
    }
  }
}

/**
 * Check database connection
 */
async function checkConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log(`   Server time: ${result.rows[0].now}`);
    return true;
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Check if tables exist
 */
async function checkTables(): Promise<void> {
  const tables = [
    'wallet_email_mappings',
    'recovery_tokens',
    'recovery_rate_limits',
    'email_verification_tokens',
    'feature_transactions',
  ];

  console.log('\n📊 Checking database tables...');
  
  for (const table of tables) {
    try {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      if (result.rows[0].exists) {
        // Get row count
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        const count = countResult.rows[0].count;
        console.log(`   ✅ ${table} (${count} rows)`);
      } else {
        console.log(`   ❌ ${table} (missing)`);
      }
    } catch (error: any) {
      console.log(`   ⚠️  ${table} (error checking: ${error.message})`);
    }
  }
}

/**
 * Main setup function
 */
async function setupDatabase(): Promise<void> {
  console.log('🚀 Setting up Sealevel Studio database...\n');
  console.log(`📡 Database URL: ${dbUrl.replace(/:[^:@]+@/, ':****@')}\n`);

  try {
    // Check connection
    const connected = await checkConnection();
    if (!connected) {
      console.error('\n❌ Cannot connect to database. Please check:');
      console.error('   1. Is PostgreSQL running?');
      console.error('   2. Is DATABASE_URL correct?');
      console.error('   3. Are credentials correct?');
      process.exit(1);
    }

    // Execute schema files
    console.log('\n📋 Setting up database schema...\n');
    
    await executeSqlFile('app/lib/database/schema.sql');
    await executeSqlFile('app/lib/database/transactions-schema.sql');

    // Run migrations
    console.log('\n🔄 Running migrations...\n');
    const migrationsDir = path.join(scriptDir, 'app/lib/database/migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      for (const file of migrationFiles) {
        const migrationPath = path.join('app/lib/database/migrations', file);
        try {
          await executeSqlFile(migrationPath);
        } catch (error: any) {
          // Ignore "already exists" errors for constraints
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key value')) {
            console.log(`⚠️  Migration ${file} already applied (skipping)`);
          } else {
            throw error;
          }
        }
      }
    }

    // Check tables
    await checkTables();

    console.log('\n✅ Database setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Verify your DATABASE_URL in .env.local');
    console.log('   2. Test the connection with: npm run dev');
    console.log('   3. Check database logs if you encounter issues');

  } catch (error: any) {
    console.error('\n❌ Database setup failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup
setupDatabase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

