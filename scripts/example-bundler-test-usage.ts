/**
 * Example: Using Bundler Test Utilities
 * 
 * This file demonstrates how to use the bundler test utilities
 * programmatically in your own scripts.
 */

import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import { createTestWallets, sendSolFromWallet, sendTokenFromWallet, getWalletBalance, TestWallet } from '../app/lib/bundler/test-utils';
import { BundlerScheduler, ScheduleConfig } from '../app/lib/bundler/scheduler';

// Example 1: Create wallets and send from them
async function example1_CreateAndSend() {
  console.log('Example 1: Create wallets and send SOL\n');

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // You need a funding wallet with SOL
  const fundingWallet = Keypair.generate(); // In real usage, load from private key
  
  // Create 10 test wallets
  const wallets = await createTestWallets(
    connection,
    fundingWallet,
    10,
    0.1 // 0.1 SOL per wallet
  );

  console.log(`Created ${wallets.length} wallets\n`);

  // Send SOL from wallet 1 to wallet 2
  const signature = await sendSolFromWallet(connection, {
    fromWallet: wallets[0],
    toAddress: wallets[1].address,
    amount: 0.01,
  });

  console.log(`Sent 0.01 SOL from ${wallets[0].label} to ${wallets[1].label}`);
  console.log(`Signature: ${signature}\n`);
}

// Example 2: Setup scheduler for DCA and sells
async function example2_Scheduler() {
  console.log('Example 2: Setup scheduler\n');

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const fundingWallet = Keypair.generate();
  
  // Create wallets
  const wallets = await createTestWallets(connection, fundingWallet, 20, 0.1);

  // Setup scheduler
  const scheduler = new BundlerScheduler(connection);

  // Setup DCA buy for wallets 1-10
  const dcaWallets = wallets.filter(w => w.index <= 10);
  dcaWallets.forEach(wallet => {
    const scheduleConfig: ScheduleConfig = {
      enabled: true,
      intervalMinutes: 60, // Every hour
      amountPerBuy: 0.01,
      targetToken: 'SOL',
      maxBuys: 10,
    };
    scheduler.addWalletSchedule(wallet, scheduleConfig);
  });

  // Setup scheduled sell for wallets 11-20
  const sellWallets = wallets.filter(w => w.index > 10 && w.index <= 20);
  const destinationAddress = fundingWallet.publicKey.toString();
  
  sellWallets.forEach(wallet => {
    const scheduleConfig: ScheduleConfig = {
      enabled: true,
      intervalMinutes: 30, // Every 30 minutes
      amountPerSell: 0.002,
      token: 'SOL',
      maxSells: 20,
      destinationAddress,
    };
    scheduler.addWalletSchedule(wallet, scheduleConfig);
  });

  // Start scheduler
  scheduler.start();
  console.log('Scheduler started. Schedules will execute automatically.\n');

  // Get all schedules
  const schedules = scheduler.getSchedules();
  console.log(`Active schedules: ${schedules.length}\n`);

  // Stop scheduler after 5 minutes (example)
  setTimeout(() => {
    scheduler.stop();
    console.log('Scheduler stopped.\n');
  }, 5 * 60 * 1000);
}

// Example 3: Check balances and send tokens
async function example3_BalancesAndTokens() {
  console.log('Example 3: Check balances and send tokens\n');

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const fundingWallet = Keypair.generate();
  
  const wallets = await createTestWallets(connection, fundingWallet, 5, 0.1);

  // Check balances
  for (const wallet of wallets) {
    const balance = await getWalletBalance(connection, wallet);
    console.log(`${wallet.label}: ${balance.toFixed(4)} SOL`);
  }

  // Send token (if you have a token mint)
  // const tokenMint = 'YOUR_TOKEN_MINT_ADDRESS';
  // const signature = await sendTokenFromWallet(connection, {
  //   fromWallet: wallets[0],
  //   toAddress: wallets[1].address,
  //   amount: 100,
  //   tokenMint,
  // });
  // console.log(`Sent 100 tokens. Signature: ${signature}`);
}

// Example 4: Manual control of individual wallets
async function example4_ManualControl() {
  console.log('Example 4: Manual control\n');

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const fundingWallet = Keypair.generate();
  
  const wallets = await createTestWallets(connection, fundingWallet, 50, 0.1);

  // Manually send from specific wallets
  const wallet21 = wallets[20]; // Wallet 21
  const wallet22 = wallets[21]; // Wallet 22

  // Send from wallet 21 to wallet 22
  await sendSolFromWallet(connection, {
    fromWallet: wallet21,
    toAddress: wallet22.address,
    amount: 0.005,
  });

  console.log(`Sent 0.005 SOL from ${wallet21.label} to ${wallet22.label}\n`);

  // Send to external address
  const externalAddress = 'YOUR_EXTERNAL_ADDRESS';
  await sendSolFromWallet(connection, {
    fromWallet: wallet21,
    toAddress: externalAddress,
    amount: 0.01,
  });

  console.log(`Sent 0.01 SOL from ${wallet21.label} to external address\n`);
}

// Run examples (uncomment the one you want to test)
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Bundler Test Examples');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Uncomment to run specific example:
  // await example1_CreateAndSend();
  // await example2_Scheduler();
  // await example3_BalancesAndTokens();
  // await example4_ManualControl();

  console.log('Uncomment an example in main() to run it.');
}

if (require.main === module) {
  main();
}

export { example1_CreateAndSend, example2_Scheduler, example3_BalancesAndTokens, example4_ManualControl };



