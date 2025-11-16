/**
 * SEAL Token Airdrop System
 * 
 * New Flow:
 * 1. Reserve airdrop when SEAL token is minted (not at attestation)
 * 2. User must have beta tester cNFT to claim the reserved airdrop
 * 3. Claimable airdrop system (not automatic)
 */

import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
} from '@solana/spl-token';
import { SEAL_TOKEN_ECONOMICS } from './config';
import { WalletContextState } from '@solana/wallet-adapter-react';

/**
 * Airdrop SEAL tokens to beta tester
 */
export async function airdropSealToBetaTester(
  connection: Connection,
  treasuryWallet: Keypair, // Treasury wallet that holds SEAL tokens
  recipientWallet: PublicKey
): Promise<string> {
  const sealMint = new PublicKey(SEAL_TOKEN_ECONOMICS.mint.address);
  const airdropAmount = SEAL_TOKEN_ECONOMICS.beta_tester.airdrop_amount;
  const decimals = SEAL_TOKEN_ECONOMICS.mint.decimals;
  
  // Calculate amount in smallest unit
  const amount = BigInt(airdropAmount) * BigInt(10 ** decimals);
  
  // Get recipient's associated token account
  const recipientATA = await getAssociatedTokenAddress(
    sealMint,
    recipientWallet
  );
  
  // Get treasury's associated token account
  const treasuryATA = await getAssociatedTokenAddress(
    sealMint,
    treasuryWallet.publicKey
  );
  
  const transaction = new Transaction();
  
  // Check if recipient ATA exists
  try {
    await getAccount(connection, recipientATA);
  } catch {
    // Create ATA if it doesn't exist
    transaction.add(
      createAssociatedTokenAccountInstruction(
        treasuryWallet.publicKey, // Payer
        recipientATA,
        recipientWallet,
        sealMint
      )
    );
  }
  
  // Add transfer instruction
  transaction.add(
    createTransferInstruction(
      treasuryATA,
      recipientATA,
      treasuryWallet.publicKey,
      amount
    )
  );
  
  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = treasuryWallet.publicKey;
  
  // Sign and send
  transaction.sign(treasuryWallet);
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [treasuryWallet],
    { commitment: 'confirmed' }
  );
  
  return signature;
}

/**
 * Reserve airdrop when SEAL token is minted
 * This should be called when a user mints SEAL tokens
 * The airdrop is reserved but not distributed until user claims it with cNFT
 */
export async function reserveAirdropOnMint(
  walletAddress: PublicKey
): Promise<{ reserved: boolean; reservationId: string }> {
  // Generate unique reservation ID
  const reservationId = `airdrop-${walletAddress.toString()}-${Date.now()}`;
  
  // In production, store reservation in database:
  // await db.airdropReservations.create({
  //   id: reservationId,
  //   wallet: walletAddress.toString(),
  //   amount: SEAL_TOKEN_ECONOMICS.beta_tester.airdrop_amount,
  //   status: 'reserved',
  //   requiresCNFT: true,
  //   createdAt: new Date(),
  //   claimedAt: null,
  // });
  
  // For now, store in localStorage (client-side only, temporary)
  if (typeof window !== 'undefined') {
    const reservations = JSON.parse(localStorage.getItem('seal_airdrop_reservations') || '[]');
    reservations.push({
      id: reservationId,
      wallet: walletAddress.toString(),
      amount: SEAL_TOKEN_ECONOMICS.beta_tester.airdrop_amount,
      status: 'reserved',
      requiresCNFT: true,
      createdAt: new Date().toISOString(),
      claimedAt: null,
    });
    localStorage.setItem('seal_airdrop_reservations', JSON.stringify(reservations));
  }
  
  return { reserved: true, reservationId };
}

/**
 * Check if user has a reserved airdrop
 */
export async function checkReservedAirdrop(
  walletAddress: PublicKey
): Promise<{ hasReservation: boolean; reservationId?: string; amount?: number }> {
  // In production, query database:
  // const reservation = await db.airdropReservations.findOne({
  //   wallet: walletAddress.toString(),
  //   status: 'reserved',
  // });
  
  // For now, check localStorage
  if (typeof window !== 'undefined') {
    const reservations = JSON.parse(localStorage.getItem('seal_airdrop_reservations') || '[]');
    const reservation = reservations.find(
      (r: any) => r.wallet === walletAddress.toString() && r.status === 'reserved'
    );
    
    if (reservation) {
      return {
        hasReservation: true,
        reservationId: reservation.id,
        amount: reservation.amount,
      };
    }
  }
  
  return { hasReservation: false };
}

/**
 * Claim reserved airdrop (requires beta tester cNFT)
 * User must have beta tester cNFT to claim their reserved airdrop
 */
export async function claimReservedAirdrop(
  connection: Connection,
  treasuryWallet: Keypair,
  recipientWallet: PublicKey
): Promise<string> {
  // 1. Verify user has beta tester cNFT
  const hasCNFT = await checkBetaTesterCNFT(connection, recipientWallet);
  if (!hasCNFT) {
    throw new Error('Beta tester cNFT required to claim airdrop. Please mint your beta tester attestation first.');
  }
  
  // 2. Check if airdrop is reserved
  const reservation = await checkReservedAirdrop(recipientWallet);
  if (!reservation.hasReservation) {
    throw new Error('No reserved airdrop found. Airdrop must be reserved when SEAL token is minted.');
  }
  
  // 3. Check if already claimed
  // In production: check database for status === 'claimed'
  if (typeof window !== 'undefined') {
    const reservations = JSON.parse(localStorage.getItem('seal_airdrop_reservations') || '[]');
    const existing = reservations.find(
      (r: any) => r.wallet === recipientWallet.toString() && r.status === 'claimed'
    );
    if (existing) {
      throw new Error('Airdrop already claimed');
    }
  }
  
  // 4. Transfer SEAL tokens
  const signature = await airdropSealToBetaTester(
    connection,
    treasuryWallet,
    recipientWallet
  );
  
  // 5. Mark as claimed
  // In production: await db.airdropReservations.update(reservation.reservationId, { status: 'claimed', claimedAt: new Date() });
  if (typeof window !== 'undefined') {
    const reservations = JSON.parse(localStorage.getItem('seal_airdrop_reservations') || '[]');
    const index = reservations.findIndex(
      (r: any) => r.id === reservation.reservationId
    );
    if (index !== -1) {
      reservations[index].status = 'claimed';
      reservations[index].claimedAt = new Date().toISOString();
      localStorage.setItem('seal_airdrop_reservations', JSON.stringify(reservations));
    }
  }
  
  return signature;
}

/**
 * Check if user has beta tester cNFT
 */
async function checkBetaTesterCNFT(
  connection: Connection,
  walletAddress: PublicKey
): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/verisol/beta-tester/check?wallet=${walletAddress.toString()}`
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.hasAttestation === true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking beta tester cNFT:', error);
    return false;
  }
}

/**
 * Check if user is eligible for airdrop (legacy function, kept for compatibility)
 * @deprecated Use checkReservedAirdrop and claimReservedAirdrop instead
 */
export async function checkAirdropEligibility(
  connection: Connection,
  walletAddress: PublicKey
): Promise<{ eligible: boolean; reason?: string }> {
  // Check if user has reserved airdrop
  const reservation = await checkReservedAirdrop(walletAddress);
  if (!reservation.hasReservation) {
    return {
      eligible: false,
      reason: 'No reserved airdrop found. Airdrop must be reserved when SEAL token is minted.',
    };
  }
  
  // Check if user has beta tester cNFT
  const hasCNFT = await checkBetaTesterCNFT(connection, walletAddress);
  if (!hasCNFT) {
    return {
      eligible: false,
      reason: 'Beta tester cNFT required to claim airdrop.',
    };
  }
  
  return { eligible: true };
}

