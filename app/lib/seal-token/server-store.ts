/**
 * Server-side in-memory store for airdrop reservations
 * Replaces unsafe client-side localStorage
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
  }
};

