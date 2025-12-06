/**
 * API: Bundler Test Scheduler
 * Manage scheduled transactions for test wallets
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection, clusterApiUrl, Keypair } from '@solana/web3.js';
import { BundlerScheduler, ScheduleConfig } from '@/app/lib/bundler/scheduler';
import { TestWallet } from '@/app/lib/bundler/test-utils';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network as any);
const connection = new Connection(rpcUrl, 'confirmed');

// Global scheduler instance (in production, use a proper state management)
let schedulerInstance: BundlerScheduler | null = null;

function getScheduler(): BundlerScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new BundlerScheduler(connection);
    loadWalletsAndSchedules();
  }
  return schedulerInstance;
}

function loadWalletsAndSchedules(): void {
  try {
    const walletsFile = path.join(process.cwd(), 'scripts', 'bundler-test-wallets.json');
    if (!fs.existsSync(walletsFile)) {
      return;
    }

    const walletsData = JSON.parse(fs.readFileSync(walletsFile, 'utf-8'));
    const configFile = path.join(process.cwd(), 'scripts', 'bundler-test-config.json');
    const config = JSON.parse(fs.readFileSync(configFile, 'utf-8')).testConfig;

    // Load wallets and setup schedules
    walletsData.forEach((walletData: any) => {
      const secretKey = Buffer.from(walletData.privateKey, 'hex');
      const keypair = Keypair.fromSecretKey(secretKey);

      const testWallet: TestWallet = {
        index: walletData.index,
        keypair,
        address: walletData.address,
        label: walletData.label,
        group: walletData.group,
      };

      // Setup schedule based on group
      if (testWallet.group === 'dcaBuy' && config.walletGroups?.dcaBuy?.schedule?.enabled) {
        const scheduleConfig: ScheduleConfig = config.walletGroups.dcaBuy.schedule;
        schedulerInstance!.addWalletSchedule(testWallet, scheduleConfig);
      } else if (testWallet.group === 'scheduledSell' && config.walletGroups?.scheduledSell?.schedule?.enabled) {
        const scheduleConfig: ScheduleConfig = config.walletGroups.scheduledSell.schedule;
        schedulerInstance!.addWalletSchedule(testWallet, scheduleConfig);
      }
    });
  } catch (error) {
    console.error('Error loading wallets and schedules:', error);
  }
}

/**
 * GET /api/bundler-test/scheduler
 * Get scheduler status and schedules
 */
export async function GET(request: NextRequest) {
  try {
    const scheduler = getScheduler();
    const schedules = scheduler.getSchedules();

    return NextResponse.json({
      success: true,
      schedules: schedules.map(s => ({
        wallet: {
          index: s.wallet.index,
          address: s.wallet.address,
          label: s.wallet.label,
          group: s.wallet.group,
        },
        config: s.config,
        lastExecution: s.lastExecution?.toISOString(),
        executionCount: s.executionCount,
      })),
      total: schedules.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get scheduler status',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bundler-test/scheduler
 * Control scheduler (start/stop) or update schedules
 * Body: { action: 'start' | 'stop' | 'update', walletIndex?: number, config?: ScheduleConfig }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, walletIndex, config } = body;

    const scheduler = getScheduler();

    if (action === 'start') {
      scheduler.start();
      return NextResponse.json({
        success: true,
        message: 'Scheduler started',
      });
    } else if (action === 'stop') {
      scheduler.stop();
      return NextResponse.json({
        success: true,
        message: 'Scheduler stopped',
      });
    } else if (action === 'update' && walletIndex && config) {
      // Load wallet
      const walletsFile = path.join(process.cwd(), 'scripts', 'bundler-test-wallets.json');
      const walletsData = JSON.parse(fs.readFileSync(walletsFile, 'utf-8'));
      const walletData = walletsData[walletIndex - 1];

      if (!walletData) {
        return NextResponse.json(
          {
            success: false,
            error: `Wallet ${walletIndex} not found`,
          },
          { status: 404 }
        );
      }

      const secretKey = Buffer.from(walletData.privateKey, 'hex');
      const keypair = Keypair.fromSecretKey(secretKey);

      const testWallet: TestWallet = {
        index: walletData.index,
        keypair,
        address: walletData.address,
        label: walletData.label,
        group: walletData.group,
      };

      scheduler.addWalletSchedule(testWallet, config as ScheduleConfig);

      return NextResponse.json({
        success: true,
        message: `Schedule updated for wallet ${walletIndex}`,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action or missing parameters',
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to control scheduler',
      },
      { status: 500 }
    );
  }
}


