/**
 * Security AI Scanner
 * Detects trackers, tracers, watchers, bad actors, and network threats
 */

export interface SecurityThreat {
  id: string;
  type: 'tracker' | 'tracer' | 'watcher' | 'malware' | 'suspicious' | 'port_scan' | 'certificate';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  name: string;
  description: string;
  source: string;
  detectedAt: Date;
  details?: Record<string, any>;
}

export interface NetworkInfo {
  ports: {
    open: number[];
    closed: number[];
    filtered: number[];
  };
  connections: {
    active: number;
    established: number;
    listening: number;
  };
  dns: {
    queries: number;
    cache: number;
    suspicious: string[];
  };
}

export interface SecurityReport {
  scanId: string;
  timestamp: Date;
  status: 'scanning' | 'completed' | 'error';
  threats: SecurityThreat[];
  networkInfo: NetworkInfo;
  trackers: {
    detected: number;
    blocked: number;
    categories: Record<string, number>;
  };
  certificates: {
    valid: number;
    invalid: number;
    expired: number;
    selfSigned: number;
  };
  recommendations: string[];
  score: number; // 0-100, higher is better
}

export class SecurityScanner {
  private threats: SecurityThreat[] = [];
  private isScanning = false;
  private scanCallbacks: Array<(report: SecurityReport) => void> = [];

  /**
   * Start comprehensive security scan
   */
  async startScan(): Promise<SecurityReport> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    this.isScanning = true;
    this.threats = [];

    try {
      // Run all scans in parallel
      const [
        trackerThreats,
        networkInfo,
        certificateThreats,
        portThreats,
        watcherThreats
      ] = await Promise.all([
        this.scanTrackers(),
        this.scanNetwork(),
        this.scanCertificates(),
        this.scanPorts(),
        this.scanWatchers()
      ]);

      this.threats = [
        ...trackerThreats,
        ...certificateThreats,
        ...portThreats,
        ...watcherThreats
      ];

      const report = this.generateReport(networkInfo);
      
      // Notify callbacks
      this.scanCallbacks.forEach(cb => cb(report));
      
      return report;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Scan for tracking scripts and cookies
   */
  private async scanTrackers(): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    
    if (typeof window === 'undefined') return threats;

    // Check for known tracking scripts
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const knownTrackers = [
      'google-analytics.com',
      'googletagmanager.com',
      'facebook.net',
      'doubleclick.net',
      'adservice.google',
      'adsystem.com',
      'advertising.com',
      'tracking',
      'analytics',
      'pixel',
      'beacon'
    ];

    scripts.forEach(script => {
      const src = (script as HTMLScriptElement).src.toLowerCase();
      knownTrackers.forEach(tracker => {
        if (src.includes(tracker)) {
          threats.push({
            id: `tracker-${Date.now()}-${Math.random()}`,
            type: 'tracker',
            severity: 'medium',
            name: `Tracking Script: ${tracker}`,
            description: `Detected tracking script from ${tracker}`,
            source: src,
            detectedAt: new Date(),
            details: { scriptSrc: src, trackerType: tracker }
          });
        }
      });
    });

    // Check cookies for tracking
    if (document.cookie) {
      const cookies = document.cookie.split(';');
      const trackingCookies = cookies.filter(cookie => {
        const name = cookie.split('=')[0].toLowerCase();
        return name.includes('_ga') || 
               name.includes('_gid') || 
               name.includes('_fbp') ||
               name.includes('tracking') ||
               name.includes('analytics');
      });

      if (trackingCookies.length > 0) {
        threats.push({
          id: `tracker-cookie-${Date.now()}`,
          type: 'tracker',
          severity: 'low',
          name: 'Tracking Cookies',
          description: `Found ${trackingCookies.length} tracking cookies`,
          source: 'document.cookie',
          detectedAt: new Date(),
          details: { cookies: trackingCookies }
        });
      }
    }

    // Check for localStorage tracking
    try {
      const localStorageKeys = Object.keys(localStorage);
      const trackingKeys = localStorageKeys.filter(key => 
        key.toLowerCase().includes('track') ||
        key.toLowerCase().includes('analytics') ||
        key.toLowerCase().includes('ad')
      );

      if (trackingKeys.length > 0) {
        threats.push({
          id: `tracker-storage-${Date.now()}`,
          type: 'tracker',
          severity: 'low',
          name: 'LocalStorage Tracking',
          description: `Found tracking data in localStorage`,
          source: 'localStorage',
          detectedAt: new Date(),
          details: { keys: trackingKeys }
        });
      }
    } catch (e) {
      // localStorage may be blocked
    }

    return threats;
  }

  /**
   * Scan network connections and ports
   */
  private async scanNetwork(): Promise<NetworkInfo> {
    // Browser-based network scanning (limited)
    const networkInfo: NetworkInfo = {
      ports: {
        open: [],
        closed: [],
        filtered: []
      },
      connections: {
        active: 0,
        established: 0,
        listening: 0
      },
      dns: {
        queries: 0,
        cache: 0,
        suspicious: []
      }
    };

    // Try to detect WebSocket connections
    if (typeof window !== 'undefined') {
      // Check for active WebSocket connections
      const wsConnections = (window as any).__wsConnections || 0;
      networkInfo.connections.active = wsConnections;
    }

    return networkInfo;
  }

  /**
   * Scan for X.509 certificates
   */
  private async scanCertificates(): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];

    if (typeof window === 'undefined' || location.protocol !== 'https:') {
      return threats;
    }

    try {
      // Check if certificate is valid (browser does this automatically for HTTPS)
      // We can check for certificate errors or warnings
      const isSecure = window.isSecureContext;
      
      if (!isSecure) {
        threats.push({
          id: `cert-insecure-${Date.now()}`,
          type: 'certificate',
          severity: 'high',
          name: 'Insecure Context',
          description: 'Page is not in a secure context',
          source: location.href,
          detectedAt: new Date()
        });
      }

      // Check for mixed content
      const images = Array.from(document.querySelectorAll('img[src]'));
      const hasHttpImages = images.some(img => {
        const src = (img as HTMLImageElement).src;
        return src.startsWith('http://');
      });

      if (hasHttpImages) {
        threats.push({
          id: `cert-mixed-${Date.now()}`,
          type: 'certificate',
          severity: 'medium',
          name: 'Mixed Content',
          description: 'HTTP resources loaded on HTTPS page',
          source: location.href,
          detectedAt: new Date()
        });
      }
    } catch (e) {
      // Certificate check failed
    }

    return threats;
  }

  /**
   * Scan for suspicious port activity
   */
  private async scanPorts(): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];

    // Browser limitations: Can't directly scan ports
    // But we can check for suspicious WebSocket connections
    if (typeof window !== 'undefined') {
      // Check for WebSocket connections to non-standard ports
      const scripts = Array.from(document.querySelectorAll('script'));
      scripts.forEach(script => {
        const content = script.textContent || '';
        const wsMatches = content.match(/ws[s]?:\/\/[^:]+:(\d+)/g);
        if (wsMatches) {
          wsMatches.forEach(match => {
            const port = parseInt(match.split(':').pop() || '0');
            if (port > 0 && port !== 80 && port !== 443 && port !== 8080) {
              threats.push({
                id: `port-suspicious-${Date.now()}-${Math.random()}`,
                type: 'port_scan',
                severity: 'medium',
                name: `Suspicious Port: ${port}`,
                description: `WebSocket connection to non-standard port ${port}`,
                source: match,
                detectedAt: new Date(),
                details: { port, connection: match }
              });
            }
          });
        }
      });
    }

    return threats;
  }

  /**
   * Scan for watchers (performance observers, mutation observers, etc.)
   */
  private async scanWatchers(): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];

    if (typeof window === 'undefined') return threats;

    // Check for PerformanceObserver (can be used for tracking)
    try {
      if (typeof PerformanceObserver !== 'undefined') {
        // Check if any performance observers are registered
        // This is limited by browser security, but we can warn
        threats.push({
          id: `watcher-perf-${Date.now()}`,
          type: 'watcher',
          severity: 'low',
          name: 'Performance Observer Available',
          description: 'PerformanceObserver API is available (may be used for tracking)',
          source: 'PerformanceObserver',
          detectedAt: new Date()
        });
      }
    } catch (e) {
      // Ignore
    }

    // Check for MutationObserver usage
    try {
      if (typeof MutationObserver !== 'undefined') {
        threats.push({
          id: `watcher-mutation-${Date.now()}`,
          type: 'watcher',
          severity: 'low',
          name: 'Mutation Observer Available',
          description: 'MutationObserver API is available (may be used for tracking)',
          source: 'MutationObserver',
          detectedAt: new Date()
        });
      }
    } catch (e) {
      // Ignore
    }

    // Check for IntersectionObserver (can track scroll/view behavior)
    try {
      if (typeof IntersectionObserver !== 'undefined') {
        threats.push({
          id: `watcher-intersection-${Date.now()}`,
          type: 'watcher',
          severity: 'low',
          name: 'Intersection Observer Available',
          description: 'IntersectionObserver API is available (may be used for tracking)',
          source: 'IntersectionObserver',
          detectedAt: new Date()
        });
      }
    } catch (e) {
      // Ignore
    }

    return threats;
  }

  /**
   * Generate comprehensive security report
   */
  private generateReport(networkInfo: NetworkInfo): SecurityReport {
    const trackerThreats = this.threats.filter(t => t.type === 'tracker');
    const certificateThreats = this.threats.filter(t => t.type === 'certificate');
    
    const trackerCategories: Record<string, number> = {};
    trackerThreats.forEach(t => {
      const category = t.details?.trackerType || 'unknown';
      trackerCategories[category] = (trackerCategories[category] || 0) + 1;
    });

    // Calculate security score (0-100)
    let score = 100;
    this.threats.forEach(threat => {
      switch (threat.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    });
    score = Math.max(0, Math.min(100, score));

    const recommendations: string[] = [];
    if (trackerThreats.length > 0) {
      recommendations.push('Consider using a privacy-focused browser extension to block trackers');
    }
    if (certificateThreats.length > 0) {
      recommendations.push('Ensure all resources use HTTPS');
    }
    if (score < 70) {
      recommendations.push('Review and address detected security threats');
    }

    return {
      scanId: `scan-${Date.now()}`,
      timestamp: new Date(),
      status: 'completed',
      threats: this.threats,
      networkInfo,
      trackers: {
        detected: trackerThreats.length,
        blocked: 0, // Would be set by blocker
        categories: trackerCategories
      },
      certificates: {
        valid: certificateThreats.filter(t => t.severity === 'info').length,
        invalid: certificateThreats.filter(t => t.severity === 'high' || t.severity === 'critical').length,
        expired: 0, // Would need server-side check
        selfSigned: 0 // Would need server-side check
      },
      recommendations,
      score
    };
  }

  /**
   * Subscribe to scan updates
   */
  onScanUpdate(callback: (report: SecurityReport) => void): () => void {
    this.scanCallbacks.push(callback);
    return () => {
      this.scanCallbacks = this.scanCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current threats
   */
  getThreats(): SecurityThreat[] {
    return [...this.threats];
  }
}

