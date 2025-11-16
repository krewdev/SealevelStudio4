/**
 * Email Authentication System
 * Simple email-based authentication for documentation access
 */

export interface EmailAuthSession {
  email: string;
  token: string;
  expiresAt: Date;
  verified: boolean;
}

export class EmailAuth {
  private storageKey = 'email_auth_session';
  private sessions: Map<string, EmailAuthSession> = new Map();

  /**
   * Request email verification
   */
  async requestVerification(email: string): Promise<{ success: boolean; message: string }> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, message: 'Invalid email format' };
    }

    // Generate verification token
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const session: EmailAuthSession = {
      email,
      token,
      expiresAt,
      verified: false
    };

    this.sessions.set(email, session);
    this.saveSession(session);

    // In production, send verification email here
    // For now, we'll auto-verify for demo purposes
    session.verified = true;
    this.saveSession(session);

    return {
      success: true,
      message: `Verification email sent to ${email}. For demo, you are now verified.`
    };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(email: string, token: string): Promise<{ success: boolean; message: string }> {
    const session = this.sessions.get(email) || this.loadSession(email);
    
    if (!session) {
      return { success: false, message: 'No verification request found' };
    }

    if (session.token !== token) {
      return { success: false, message: 'Invalid verification token' };
    }

    if (session.expiresAt < new Date()) {
      return { success: false, message: 'Verification token expired' };
    }

    session.verified = true;
    this.saveSession(session);

    return { success: true, message: 'Email verified successfully' };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return false;

      const session: EmailAuthSession = JSON.parse(stored);
      
      // Check expiration
      if (new Date(session.expiresAt) < new Date()) {
        this.clearSession();
        return false;
      }

      return session.verified;
    } catch {
      return false;
    }
  }

  /**
   * Get current authenticated email
   */
  getCurrentEmail(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return null;

      const session: EmailAuthSession = JSON.parse(stored);
      
      if (new Date(session.expiresAt) < new Date()) {
        this.clearSession();
        return null;
      }

      return session.verified ? session.email : null;
    } catch {
      return null;
    }
  }

  /**
   * Logout
   */
  logout(): void {
    this.clearSession();
  }

  /**
   * Generate verification token
   */
  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) +
           Date.now().toString(36);
  }

  /**
   * Save session to storage
   */
  private saveSession(session: EmailAuthSession): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(session));
      this.sessions.set(session.email, session);
    } catch (e) {
      console.error('Failed to save email auth session:', e);
    }
  }

  /**
   * Load session from storage
   */
  private loadSession(email: string): EmailAuthSession | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return null;
      const session: EmailAuthSession = JSON.parse(stored);
      if (session.email === email) {
        this.sessions.set(email, session);
        return session;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Clear session
   */
  private clearSession(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.storageKey);
      this.sessions.clear();
    } catch (e) {
      console.error('Failed to clear email auth session:', e);
    }
  }
}

