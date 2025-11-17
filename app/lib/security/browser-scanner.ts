/**
 * Real-time Browser Vulnerability Scanner
 * Detects vulnerabilities on the fly as they occur in the browser
 */

export interface Vulnerability {
  id: string;
  type: 'xss' | 'csrf' | 'injection' | 'insecure_connection' | 'cookie_security' | 'dom_manipulation' | 'sensitive_data' | 'cors' | 'clickjacking';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  source: string;
  detectedAt: Date;
  details?: Record<string, any>;
  recommendation?: string;
}

export interface ScanStats {
  totalThreats: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<string, number>;
  lastScan: Date | null;
}

export class BrowserVulnerabilityScanner {
  private vulnerabilities: Vulnerability[] = [];
  private isMonitoring = false;
  private callbacks: Array<(vuln: Vulnerability) => void> = [];
  private networkObserver: PerformanceObserver | null = null;
  private domObserver: MutationObserver | null = null;
  private fetchInterceptor: ((...args: any[]) => any) | null = null;
  private xhrInterceptor: ((...args: any[]) => any) | null = null;

  /**
   * Start real-time vulnerability monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('Scanner already monitoring');
      return;
    }

    if (typeof window === 'undefined') {
      console.warn('Browser scanner requires browser environment');
      return;
    }

    this.isMonitoring = true;
    this.vulnerabilities = [];

    // Monitor network requests
    this.monitorNetworkRequests();

    // Monitor DOM mutations
    this.monitorDOMMutations();

    // Monitor cookies and storage
    this.monitorStorage();

    // Monitor for sensitive data exposure
    this.monitorSensitiveData();

    // Check initial page state
    this.scanInitialState();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;

    if (this.networkObserver) {
      this.networkObserver.disconnect();
      this.networkObserver = null;
    }

    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }

    // Restore original fetch/XHR if intercepted
    if (this.fetchInterceptor && (window as any).__originalFetch) {
      window.fetch = (window as any).__originalFetch;
    }

    if (this.xhrInterceptor && (window as any).__originalXHR) {
      window.XMLHttpRequest = (window as any).__originalXHR;
    }
  }

  /**
   * Monitor network requests for vulnerabilities
   */
  private monitorNetworkRequests(): void {
    // Intercept fetch requests
    if (typeof window.fetch !== 'undefined') {
      (window as any).__originalFetch = window.fetch;
      const self = this;
      
      window.fetch = function(...args: any[]) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        const options = args[1] || {};

        // Check for insecure connections
        if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
          self.reportVulnerability({
            type: 'insecure_connection',
            severity: 'high',
            title: 'Insecure HTTP Connection',
            description: `Request to insecure HTTP endpoint: ${url}`,
            source: 'fetch',
            recommendation: 'Use HTTPS for all external connections',
            details: { url, method: options.method || 'GET' }
          });
        }

        // Check for potential XSS in response
        if (options.method === 'GET' && url.includes('<script') || url.includes('javascript:')) {
          self.reportVulnerability({
            type: 'xss',
            severity: 'critical',
            title: 'Potential XSS in Request',
            description: `Suspicious script-like content in request URL`,
            source: 'fetch',
            recommendation: 'Sanitize all user input before making requests',
            details: { url }
          });
        }

        // Check CORS configuration
        if (options.mode === 'no-cors' && url.includes('http')) {
          self.reportVulnerability({
            type: 'cors',
            severity: 'medium',
            title: 'No-CORS Mode Used',
            description: `Request using no-cors mode may bypass security checks`,
            source: 'fetch',
            recommendation: 'Use proper CORS configuration instead of no-cors',
            details: { url }
          });
        }

        // Check for sensitive data in URLs
        const sensitiveParams = ['password', 'token', 'secret', 'key', 'api_key', 'auth'];
        const urlLower = url.toLowerCase();
        sensitiveParams.forEach(param => {
          if (urlLower.includes(param + '=')) {
            self.reportVulnerability({
              type: 'sensitive_data',
              severity: 'high',
              title: 'Sensitive Data in URL',
              description: `Potential sensitive parameter "${param}" found in URL`,
              source: 'fetch',
              recommendation: 'Never include sensitive data in URLs. Use headers or request body instead.',
              details: { url: url.split('?')[0], parameter: param }
            });
          }
        });

        return (window as any).__originalFetch.apply(this, args);
      };
    }

    // Intercept XMLHttpRequest
    if (typeof window.XMLHttpRequest !== 'undefined') {
      (window as any).__originalXHR = window.XMLHttpRequest;
      const self = this;
      const OriginalXHR = window.XMLHttpRequest;

      (window as any).XMLHttpRequest = class extends OriginalXHR {
        open(method: string, url: string | URL, async?: boolean, user?: string | null, password?: string | null) {
          const urlStr = typeof url === 'string' ? url : url.toString();

          // Check for insecure connections
          if (urlStr.startsWith('http://') && !urlStr.includes('localhost') && !urlStr.includes('127.0.0.1')) {
            self.reportVulnerability({
              type: 'insecure_connection',
              severity: 'high',
              title: 'Insecure HTTP Connection',
              description: `XHR request to insecure HTTP endpoint: ${urlStr}`,
              source: 'xhr',
              recommendation: 'Use HTTPS for all external connections',
              details: { url: urlStr, method }
            });
          }

          if (async !== undefined && user !== undefined && password !== undefined) {
            return super.open(method, url, async, user, password);
          } else if (async !== undefined && user !== undefined) {
            return super.open(method, url, async, user);
          } else if (async !== undefined) {
            return super.open(method, url, async);
          } else {
            return super.open(method, url);
          }
        }
      } as any;
    }

    // Monitor Performance API for network requests
    if ('PerformanceObserver' in window) {
      try {
        this.networkObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              const url = resourceEntry.name;

              // Check for mixed content (HTTPS page loading HTTP resources)
              if (window.location.protocol === 'https:' && url.startsWith('http://')) {
                this.reportVulnerability({
                  type: 'insecure_connection',
                  severity: 'high',
                  title: 'Mixed Content Detected',
                  description: `HTTPS page loading insecure HTTP resource: ${url}`,
                  source: 'performance',
                  recommendation: 'Load all resources over HTTPS to prevent mixed content warnings',
                  details: { url, type: resourceEntry.initiatorType }
                });
              }
            }
          }
        });

        this.networkObserver.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('PerformanceObserver not supported:', e);
      }
    }
  }

  /**
   * Monitor DOM mutations for injection attacks
   */
  private monitorDOMMutations(): void {
    if (typeof window === 'undefined' || !window.MutationObserver) {
      return;
    }

    const self = this;

    this.domObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;

            // Check for script injection
            if (element.tagName === 'SCRIPT') {
              const script = element as HTMLScriptElement;
              const src = script.src;
              const content = script.textContent || script.innerHTML;

              // Check for inline scripts with suspicious content
              if (!src && content) {
                const suspiciousPatterns = [
                  /eval\s*\(/i,
                  /document\.cookie/i,
                  /document\.write/i,
                  /innerHTML\s*=/i,
                  /outerHTML\s*=/i,
                  /<script/i
                ];

                suspiciousPatterns.forEach(pattern => {
                  if (pattern.test(content)) {
                    self.reportVulnerability({
                      type: 'xss',
                      severity: 'critical',
                      title: 'Potential XSS: Suspicious Script Content',
                      description: `Inline script contains potentially dangerous code`,
                      source: 'dom',
                      recommendation: 'Avoid inline scripts. Use Content Security Policy (CSP) to restrict script execution.',
                      details: { pattern: pattern.toString(), scriptLength: content.length }
                    });
                  }
                });
              }

              // Check for external scripts from untrusted sources
              if (src && !src.startsWith('/') && !src.startsWith(window.location.origin)) {
                const untrustedDomains = ['unpkg.com', 'cdnjs.cloudflare.com', 'jsdelivr.net'];
                const isTrusted = untrustedDomains.some(domain => src.includes(domain));
                
                if (!isTrusted && !src.startsWith('https://')) {
                  self.reportVulnerability({
                    type: 'xss',
                    severity: 'high',
                    title: 'External Script from Untrusted Source',
                    description: `Loading script from potentially untrusted source: ${src}`,
                    source: 'dom',
                    recommendation: 'Only load scripts from trusted CDNs or your own domain',
                    details: { src }
                  });
                }
              }
            }

            // Check for iframe injection
            if (element.tagName === 'IFRAME') {
              const iframe = element as HTMLIFrameElement;
              if (iframe.src && !iframe.src.startsWith(window.location.origin)) {
                // Check for clickjacking protection
                if (!iframe.hasAttribute('sandbox')) {
                  self.reportVulnerability({
                    type: 'clickjacking',
                    severity: 'medium',
                    title: 'Iframe Without Sandbox',
                    description: `Iframe from external source without sandbox attribute: ${iframe.src}`,
                    source: 'dom',
                    recommendation: 'Add sandbox attribute to iframes or use X-Frame-Options header',
                    details: { src: iframe.src }
                  });
                }
              }
            }

            // Check for dangerous innerHTML usage
            if (element.innerHTML && element.innerHTML.length > 1000) {
              // Check if innerHTML contains script tags
              if (/<script/i.test(element.innerHTML)) {
                self.reportVulnerability({
                  type: 'xss',
                  severity: 'high',
                  title: 'Potential XSS: innerHTML with Script Tags',
                  description: `Element innerHTML contains script tags, potential XSS vector`,
                  source: 'dom',
                  recommendation: 'Use textContent instead of innerHTML, or sanitize HTML before insertion',
                  details: { tagName: element.tagName, innerHTMLLength: element.innerHTML.length }
                });
              }
            }
          }
        });
      });
    });

    this.domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }

  /**
   * Monitor cookies and localStorage for security issues
   */
  private monitorStorage(): void {
    if (typeof window === 'undefined') return;

    // Check cookies for security flags
    if (document.cookie) {
      const cookies = document.cookie.split(';').map(c => c.trim());
      
      cookies.forEach(cookie => {
        const [name, value] = cookie.split('=');
        const cookieLower = name.toLowerCase();

        // Check for sensitive cookies without HttpOnly
        const sensitiveNames = ['session', 'token', 'auth', 'password', 'secret'];
        const isSensitive = sensitiveNames.some(s => cookieLower.includes(s));

        if (isSensitive && !cookie.includes('HttpOnly')) {
          this.reportVulnerability({
            type: 'cookie_security',
            severity: 'high',
            title: 'Sensitive Cookie Without HttpOnly Flag',
            description: `Cookie "${name}" appears sensitive but lacks HttpOnly flag`,
            source: 'cookie',
            recommendation: 'Set HttpOnly flag on sensitive cookies to prevent XSS attacks',
            details: { cookieName: name }
          });
        }

        // Check for cookies without Secure flag on HTTPS sites
        if (window.location.protocol === 'https:' && !cookie.includes('Secure')) {
          this.reportVulnerability({
            type: 'cookie_security',
            severity: 'medium',
            title: 'Cookie Without Secure Flag on HTTPS',
            description: `Cookie "${name}" on HTTPS site without Secure flag`,
            source: 'cookie',
            recommendation: 'Set Secure flag on cookies when using HTTPS',
            details: { cookieName: name }
          });
        }
      });
    }

    // Monitor localStorage for sensitive data
    try {
      const localStorageKeys = Object.keys(localStorage);
      const sensitivePatterns = ['token', 'password', 'secret', 'key', 'auth', 'credential'];
      
      localStorageKeys.forEach(key => {
        const keyLower = key.toLowerCase();
        const isSensitive = sensitivePatterns.some(pattern => keyLower.includes(pattern));
        
        if (isSensitive) {
          const value = localStorage.getItem(key);
          if (value && value.length > 0) {
            this.reportVulnerability({
              type: 'sensitive_data',
              severity: 'high',
              title: 'Sensitive Data in localStorage',
              description: `Sensitive data stored in localStorage: ${key}`,
              source: 'localStorage',
              recommendation: 'Never store sensitive data in localStorage. Use httpOnly cookies or secure session storage.',
              details: { key, valueLength: value.length }
            });
          }
        }
      });
    } catch (e) {
      // localStorage may be blocked
    }

    // Monitor sessionStorage
    try {
      const sessionStorageKeys = Object.keys(sessionStorage);
      const sensitivePatterns = ['token', 'password', 'secret', 'key', 'auth'];
      
      sessionStorageKeys.forEach(key => {
        const keyLower = key.toLowerCase();
        const isSensitive = sensitivePatterns.some(pattern => keyLower.includes(pattern));
        
        if (isSensitive) {
          this.reportVulnerability({
            type: 'sensitive_data',
            severity: 'medium',
            title: 'Sensitive Data in sessionStorage',
            description: `Sensitive data stored in sessionStorage: ${key}`,
            source: 'sessionStorage',
            recommendation: 'Consider using httpOnly cookies for sensitive session data',
            details: { key }
          });
        }
      });
    } catch (e) {
      // sessionStorage may be blocked
    }
  }

  /**
   * Monitor for sensitive data exposure
   */
  private monitorSensitiveData(): void {
    if (typeof window === 'undefined') return;

    // Check page source for exposed secrets
    const pageText = document.documentElement.innerHTML;
    
    // Common secret patterns
    const secretPatterns = [
      /api[_-]?key\s*[:=]\s*['"]([^'"]{20,})['"]/gi,
      /secret[_-]?key\s*[:=]\s*['"]([^'"]{20,})['"]/gi,
      /private[_-]?key\s*[:=]\s*['"]([^'"]{40,})['"]/gi,
      /password\s*[:=]\s*['"]([^'"]{8,})['"]/gi,
      /token\s*[:=]\s*['"]([^'"]{20,})['"]/gi,
    ];

    secretPatterns.forEach(pattern => {
      const matches = pageText.match(pattern);
      if (matches && matches.length > 0) {
        this.reportVulnerability({
          type: 'sensitive_data',
          severity: 'critical',
          title: 'Potential Secret Exposed in Page Source',
          description: `Found potential secret/credential in page HTML source`,
          source: 'page_source',
          recommendation: 'Never expose secrets in client-side code. Use environment variables or secure server-side storage.',
          details: { matchesFound: matches.length, pattern: pattern.toString() }
        });
      }
    });
  }

  /**
   * Scan initial page state
   */
  private scanInitialState(): void {
    if (typeof window === 'undefined') return;

    // Check for Content Security Policy
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!cspMeta) {
      this.reportVulnerability({
        type: 'xss',
        severity: 'medium',
        title: 'Missing Content Security Policy',
        description: 'No Content Security Policy (CSP) detected',
        source: 'meta',
        recommendation: 'Implement CSP headers to prevent XSS attacks',
        details: {}
      });
    }

    // Check for X-Frame-Options
    // Note: This would typically be in headers, but we can check if iframes are present
    const iframes = document.querySelectorAll('iframe');
    if (iframes.length > 0) {
      iframes.forEach(iframe => {
        const iframeEl = iframe as HTMLIFrameElement;
        if (iframeEl.src && !iframeEl.src.startsWith(window.location.origin) && !iframeEl.hasAttribute('sandbox')) {
          this.reportVulnerability({
            type: 'clickjacking',
            severity: 'medium',
            title: 'External Iframe Without Protection',
            description: `External iframe without sandbox attribute: ${iframeEl.src}`,
            source: 'iframe',
            recommendation: 'Add sandbox attribute or X-Frame-Options header',
            details: { src: iframeEl.src }
          });
        }
      });
    }

    // Check for inline event handlers (potential XSS)
    const elementsWithInlineHandlers = document.querySelectorAll('[onclick], [onerror], [onload], [onmouseover]');
    if (elementsWithInlineHandlers.length > 0) {
      this.reportVulnerability({
        type: 'xss',
        severity: 'medium',
        title: 'Inline Event Handlers Detected',
        description: `Found ${elementsWithInlineHandlers.length} elements with inline event handlers`,
        source: 'dom',
        recommendation: 'Avoid inline event handlers. Use addEventListener instead.',
        details: { count: elementsWithInlineHandlers.length }
      });
    }
  }

  /**
   * Report a vulnerability
   */
  private reportVulnerability(vuln: Omit<Vulnerability, 'id' | 'detectedAt'>): void {
    const vulnerability: Vulnerability = {
      ...vuln,
      id: `vuln-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      detectedAt: new Date()
    };

    // Avoid duplicates (same type and source within 5 seconds)
    const recent = this.vulnerabilities.find(v => 
      v.type === vulnerability.type &&
      v.source === vulnerability.source &&
      Date.now() - v.detectedAt.getTime() < 5000
    );

    if (recent) {
      return; // Skip duplicate
    }

    this.vulnerabilities.push(vulnerability);

    // Notify callbacks
    this.callbacks.forEach(cb => {
      try {
        cb(vulnerability);
      } catch (e) {
        console.error('Error in vulnerability callback:', e);
      }
    });
  }

  /**
   * Subscribe to vulnerability detections
   */
  onVulnerabilityDetected(callback: (vuln: Vulnerability) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get all detected vulnerabilities
   */
  getVulnerabilities(): Vulnerability[] {
    return [...this.vulnerabilities];
  }

  /**
   * Get scan statistics
   */
  getStats(): ScanStats {
    const byType: Record<string, number> = {};
    let critical = 0, high = 0, medium = 0, low = 0;

    this.vulnerabilities.forEach(v => {
      byType[v.type] = (byType[v.type] || 0) + 1;
      switch (v.severity) {
        case 'critical': critical++; break;
        case 'high': high++; break;
        case 'medium': medium++; break;
        case 'low': low++; break;
      }
    });

    return {
      totalThreats: this.vulnerabilities.length,
      critical,
      high,
      medium,
      low,
      byType,
      lastScan: this.vulnerabilities.length > 0 
        ? this.vulnerabilities[this.vulnerabilities.length - 1].detectedAt 
        : null
    };
  }

  /**
   * Clear all vulnerabilities
   */
  clear(): void {
    this.vulnerabilities = [];
  }
}

