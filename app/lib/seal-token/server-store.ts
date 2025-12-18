/**
 * Server-side in-memory store for airdrop reservations
 * Replaces unsafe client-side localStorage
 * 
 * NOTE: In-memory store is not suitable for production with multiple server instances.
 * For production, use Redis with atomic operations or a database with transactions.
 */

interface AirdropReservation {
  id: string;
  wallet: string;
  amount: number;
  status: 'reserved' | 'claimed';
  requiresCNFT: boolean;
  createdAt: string;
  claimedAt: string | null;
}

// Global store for server-side state
// Note: This resets on server restart. In production, use a real database (Redis/Postgres)
const reservationStore = new Map<string, AirdropReservation>();

// Lock map to prevent concurrent modifications (simple mutex for in-memory store)
// In production, use Redis SETNX or database row-level locking
const claimLocks = new Map<string, Promise<void>>();

export const airdropStore = {
  save: (reservation: AirdropReservation) => {
    reservationStore.set(reservation.wallet, reservation);
  },

  get: (wallet: string) => {
    return reservationStore.get(wallet);
  },

  updateStatus: (wallet: string, status: 'reserved' | 'claimed') => {
    const record = reservationStore.get(wallet);
    if (record) {
      record.status = status;
      if (status === 'claimed') {
        record.claimedAt = new Date().toISOString();
      }
      reservationStore.set(wallet, record);
    }
  },

  hasReservation: (wallet: string) => {
    const record = reservationStore.get(wallet);
    return record && record.status === 'reserved';
  },

  isClaimed: (wallet: string) => {
    const record = reservationStore.get(wallet);
    return record && record.status === 'claimed';
  },

  /**
   * Atomically check if claimed and mark as claimed if not.
   * Returns true if successfully claimed (was not already claimed), false if already claimed.
   * This prevents TOCTOU race conditions by performing check-and-set atomically.
   * 
   * In production, this should use Redis SETNX or database transactions with row-level locking.
   */
  tryClaim: async (wallet: string, reservation: Omit<AirdropReservation, 'status' | 'claimedAt'>): Promise<boolean> => {
    // Wait for any existing lock for this wallet
    const existingLock = claimLocks.get(wallet);
    if (existingLock) {
      await existingLock;
    }

    // Create a new lock promise
    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    claimLocks.set(wallet, lockPromise);

    try {
      // Atomic check-and-set
      const record = reservationStore.get(wallet);
      if (record && record.status === 'claimed') {
        return false; // Already claimed
      }

      // Mark as claimed atomically
      reservationStore.set(wallet, {
        ...reservation,
        status: 'claimed',
        claimedAt: new Date().toISOString(),
      });

      return true; // Successfully claimed
    } finally {
      // Release lock
      releaseLock!();
      claimLocks.delete(wallet);
    }
  },
};



