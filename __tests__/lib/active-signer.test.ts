import { describe, it, expect } from '@jest/globals';
import {
  resolveActiveSigner,
  shouldUseCustodialWallet,
  shortAddr,
} from '../../app/lib/wallet/active-signer';

const PHANTOM = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const STUDIO = 'DQWGg7KiL9cYzJSyL7pi8aN1nFGXjLLCtTVWCnk32Vq3';

describe('active signer', () => {
  it('shortens addresses', () => {
    expect(shortAddr(PHANTOM)).toBe('7xKX…gAsU');
  });

  it('uses phantom when only phantom is connected', () => {
    const s = resolveActiveSigner({ phantom: PHANTOM, studio: null });
    expect(s.source).toBe('phantom');
    expect(s.address).toBe(PHANTOM);
    expect(s.canSignVersioned).toBe(true);
    expect(s.hotWalletSafe).toBe(true);
    expect(s.label.startsWith('Phantom')).toBe(true);
  });

  it('uses studio when only studio exists', () => {
    const s = resolveActiveSigner({ phantom: null, studio: STUDIO });
    expect(s.source).toBe('studio');
    expect(s.address).toBe(STUDIO);
    expect(s.canSignVersioned).toBe(false);
    expect(s.hotWalletSafe).toBe(false);
    expect(shouldUseCustodialWallet(STUDIO, null)).toBe(true);
  });

  it('prefers phantom when both exist and no preference is set', () => {
    const s = resolveActiveSigner({ phantom: PHANTOM, studio: STUDIO });
    expect(s.source).toBe('phantom');
    expect(s.address).toBe(PHANTOM);
    expect(shouldUseCustodialWallet(STUDIO, PHANTOM)).toBe(false);
  });

  it('honors an explicit studio preference when both exist', () => {
    const s = resolveActiveSigner({
      phantom: PHANTOM,
      studio: STUDIO,
      preferred: 'studio',
    });
    expect(s.source).toBe('studio');
    expect(s.address).toBe(STUDIO);
    expect(shouldUseCustodialWallet(STUDIO, PHANTOM, 'studio')).toBe(true);
  });

  it('honors an explicit phantom preference', () => {
    const s = resolveActiveSigner({
      phantom: PHANTOM,
      studio: STUDIO,
      preferred: 'phantom',
    });
    expect(s.source).toBe('phantom');
    expect(shouldUseCustodialWallet(STUDIO, PHANTOM, 'phantom')).toBe(false);
  });

  it('falls back if preferred source is missing', () => {
    expect(
      resolveActiveSigner({ phantom: PHANTOM, studio: null, preferred: 'studio' }).source
    ).toBe('phantom');
    expect(
      resolveActiveSigner({ phantom: null, studio: STUDIO, preferred: 'phantom' }).source
    ).toBe('studio');
  });

  it('reports disconnected when neither wallet exists', () => {
    const s = resolveActiveSigner({});
    expect(s.connected).toBe(false);
    expect(s.source).toBeNull();
    expect(s.address).toBeNull();
    expect(shouldUseCustodialWallet(null, null)).toBe(false);
  });
});
