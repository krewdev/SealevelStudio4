/**
 * Contact Management Types
 * Types for managing user contacts (wallet addresses and emails)
 */

export interface Contact {
  id: string;
  name: string;
  walletAddress?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  tags?: string[];
}

export interface ContactSearchResult {
  contact: Contact;
  matchType: 'name' | 'email' | 'wallet';
  matchScore: number;
}

export interface ContactManagerOptions {
  syncWithAPI?: boolean;
  apiEndpoint?: string;
}

