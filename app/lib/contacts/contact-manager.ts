/**
 * Contact Manager
 * Client-side contact management with LocalStorage and API sync
 */

import { Contact, ContactSearchResult, ContactManagerOptions } from './types';

const STORAGE_KEY = 'sealevel_contacts';
const DEFAULT_OPTIONS: ContactManagerOptions = {
  syncWithAPI: true,
  apiEndpoint: '/api/contacts',
};

export class ContactManager {
  private contacts: Map<string, Contact> = new Map();
  private options: ContactManagerOptions;

  constructor(options: Partial<ContactManagerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.loadFromStorage();
  }

  /**
   * Load contacts from LocalStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const contactsArray: Contact[] = JSON.parse(stored);
        contactsArray.forEach(contact => {
          // Convert date strings back to Date objects
          contact.createdAt = new Date(contact.createdAt);
          contact.updatedAt = new Date(contact.updatedAt);
          this.contacts.set(contact.id, contact);
        });
      }
    } catch (error) {
      console.error('Failed to load contacts from storage:', error);
    }
  }

  /**
   * Save contacts to LocalStorage
   */
  private saveToStorage(): void {
    try {
      const contactsArray = Array.from(this.contacts.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contactsArray));
    } catch (error) {
      console.error('Failed to save contacts to storage:', error);
    }
  }

  /**
   * Sync contacts with API
   */
  private async syncWithAPI(): Promise<void> {
    if (!this.options.syncWithAPI || !this.options.apiEndpoint) {
      return;
    }

    try {
      const contactsArray = Array.from(this.contacts.values());
      const response = await fetch(this.options.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: contactsArray }),
      });

      if (!response.ok) {
        console.warn('Failed to sync contacts with API');
      }
    } catch (error) {
      console.error('Error syncing contacts with API:', error);
      // Don't throw - local storage is still working
    }
  }

  /**
   * Add or update a contact
   */
  async addContact(contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    const now = new Date();
    const newContact: Contact = {
      id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
      ...contact,
    };

    this.contacts.set(newContact.id, newContact);
    this.saveToStorage();
    await this.syncWithAPI();

    return newContact;
  }

  /**
   * Update an existing contact
   */
  async updateContact(id: string, updates: Partial<Omit<Contact, 'id' | 'createdAt'>>): Promise<Contact | null> {
    const contact = this.contacts.get(id);
    if (!contact) {
      return null;
    }

    const updatedContact: Contact = {
      ...contact,
      ...updates,
      updatedAt: new Date(),
    };

    this.contacts.set(id, updatedContact);
    this.saveToStorage();
    await this.syncWithAPI();

    return updatedContact;
  }

  /**
   * Delete a contact
   */
  async deleteContact(id: string): Promise<boolean> {
    const deleted = this.contacts.delete(id);
    if (deleted) {
      this.saveToStorage();
      await this.syncWithAPI();
    }
    return deleted;
  }

  /**
   * Get a contact by ID
   */
  getContact(id: string): Contact | null {
    return this.contacts.get(id) || null;
  }

  /**
   * Get all contacts
   */
  getAllContacts(): Contact[] {
    return Array.from(this.contacts.values());
  }

  /**
   * Search contacts by name, email, or wallet address
   */
  searchContacts(query: string): ContactSearchResult[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      return [];
    }

    const results: ContactSearchResult[] = [];

    for (const contact of this.contacts.values()) {
      let matchScore = 0;
      let matchType: 'name' | 'email' | 'wallet' | null = null;

      // Check name match
      if (contact.name.toLowerCase().includes(lowerQuery)) {
        matchScore = contact.name.toLowerCase() === lowerQuery ? 100 : 50;
        matchType = 'name';
      }

      // Check email match
      if (contact.email && contact.email.toLowerCase().includes(lowerQuery)) {
        const emailScore = contact.email.toLowerCase() === lowerQuery ? 100 : 50;
        if (emailScore > matchScore) {
          matchScore = emailScore;
          matchType = 'email';
        }
      }

      // Check wallet address match (exact or partial)
      if (contact.walletAddress) {
        const walletLower = contact.walletAddress.toLowerCase();
        if (walletLower === lowerQuery) {
          matchScore = 100;
          matchType = 'wallet';
        } else if (walletLower.includes(lowerQuery) || lowerQuery.includes(walletLower.slice(0, 8))) {
          matchScore = Math.max(matchScore, 30);
          if (!matchType) matchType = 'wallet';
        }
      }

      if (matchType) {
        results.push({
          contact,
          matchType,
          matchScore,
        });
      }
    }

    // Sort by match score (highest first)
    results.sort((a, b) => b.matchScore - a.matchScore);

    return results;
  }

  /**
   * Find contact by exact name match
   */
  findContactByName(name: string): Contact | null {
    const lowerName = name.toLowerCase().trim();
    for (const contact of this.contacts.values()) {
      if (contact.name.toLowerCase() === lowerName) {
        return contact;
      }
    }
    return null;
  }

  /**
   * Find contact by wallet address
   */
  findContactByWallet(walletAddress: string): Contact | null {
    const lowerWallet = walletAddress.toLowerCase();
    for (const contact of this.contacts.values()) {
      if (contact.walletAddress?.toLowerCase() === lowerWallet) {
        return contact;
      }
    }
    return null;
  }

  /**
   * Find contact by email
   */
  findContactByEmail(email: string): Contact | null {
    const lowerEmail = email.toLowerCase();
    for (const contact of this.contacts.values()) {
      if (contact.email?.toLowerCase() === lowerEmail) {
        return contact;
      }
    }
    return null;
  }

  /**
   * Load contacts from API
   */
  async loadFromAPI(): Promise<void> {
    if (!this.options.syncWithAPI || !this.options.apiEndpoint) {
      return;
    }

    try {
      const response = await fetch(this.options.apiEndpoint);
      if (response.ok) {
        const data = await response.json();
        if (data.contacts && Array.isArray(data.contacts)) {
          // Merge with local contacts (API takes precedence)
          data.contacts.forEach((contact: Contact) => {
            contact.createdAt = new Date(contact.createdAt);
            contact.updatedAt = new Date(contact.updatedAt);
            this.contacts.set(contact.id, contact);
          });
          this.saveToStorage();
        }
      }
    } catch (error) {
      console.error('Error loading contacts from API:', error);
    }
  }
}

// Singleton instance
let contactManagerInstance: ContactManager | null = null;

export function getContactManager(): ContactManager {
  if (!contactManagerInstance) {
    contactManagerInstance = new ContactManager();
  }
  return contactManagerInstance;
}

