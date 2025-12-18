/**
 * Seed Transactions Script
 * Run this script to populate the database with test transaction data
 * 
 * Usage:
 *   npm run seed:transactions
 *   or
 *   ts-node scripts/seed-transactions.ts
 */

import fetch from 'node-fetch';

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SEED_TOKEN = process.env.SEED_API_TOKEN || 'dev-seed-token';

async function seedTransactions(count: number = 50, clearExisting: boolean = true) {
  try {
    console.log(`🌱 Seeding ${count} test transactions...`);

    const response = await fetch(`${API_URL}/api/transactions/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SEED_TOKEN}`,
      },
      body: JSON.stringify({ count, clearExisting }),
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Successfully seeded ${result.inserted} transactions!`);
      console.log(`   Transactions are now available in RecentTransactions component`);
    } else {
      console.error('❌ Failed to seed transactions:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error seeding transactions:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const count = parseInt(process.argv[2] || '50', 10);
  const clearExisting = process.argv[3] !== 'false';
  
  seedTransactions(count, clearExisting);
}

export { seedTransactions };

