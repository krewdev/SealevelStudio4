/**
 * Truth Validator AI Model
 * Ensures all AI responses are accurate, truthful, and fact-based
 * No hallucinations, no lies, no dreaming - only verified facts
 */

export interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-1
  issues: string[];
  corrections?: string[];
  verifiedFacts: string[];
  unverifiedClaims: string[];
}

export interface AIResponse {
  content: string;
  model: string;
  timestamp: Date;
  context?: any;
}

export class TruthValidator {
  private factDatabase: Map<string, { verified: boolean; source: string; timestamp: Date }> = new Map();
  private validationRules: Array<(response: AIResponse) => ValidationResult> = [];

  constructor() {
    this.initializeRules();
  }

  /**
   * Initialize validation rules
   */
  private initializeRules() {
    // Rule 1: Check for hallucination markers
    this.validationRules.push((response) => {
      const issues: string[] = [];
      const content = response.content.toLowerCase();

      // Common hallucination patterns
      const hallucinationMarkers = [
        'i think',
        'i believe',
        'probably',
        'maybe',
        'perhaps',
        'might be',
        'could be',
        'uncertain',
        'not sure'
      ];

      hallucinationMarkers.forEach(marker => {
        if (content.includes(marker)) {
          issues.push(`Uncertain language detected: "${marker}"`);
        }
      });

      return {
        isValid: issues.length === 0,
        confidence: issues.length === 0 ? 1.0 : 0.7,
        issues,
        verifiedFacts: [],
        unverifiedClaims: []
      };
    });

    // Rule 2: Check for factual claims without sources
    this.validationRules.push((response) => {
      const issues: string[] = [];
      const unverifiedClaims: string[] = [];
      const verifiedFacts: string[] = [];

      // Extract factual statements (simplified)
      const factualPatterns = [
        /(\d+)\s+(percent|%|dollars|years|times)/gi,
        /(always|never|all|every|none)\s+/gi,
        /(proven|confirmed|verified|established)\s+/gi
      ];

      factualPatterns.forEach(pattern => {
        const matches = response.content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // Check if this fact is in our database
            const factKey = match.toLowerCase();
            if (!this.factDatabase.has(factKey)) {
              unverifiedClaims.push(match);
              issues.push(`Unverified factual claim: "${match}"`);
            } else {
              const fact = this.factDatabase.get(factKey);
              if (fact?.verified) {
                verifiedFacts.push(match);
              }
            }
          });
        }
      });

      return {
        isValid: unverifiedClaims.length === 0,
        confidence: unverifiedClaims.length === 0 ? 1.0 : 0.6,
        issues,
        verifiedFacts,
        unverifiedClaims
      };
    });

    // Rule 3: Check for contradictions
    this.validationRules.push((response) => {
      const issues: string[] = [];
      
      // Simple contradiction detection
      const contradictions = [
        ['yes', 'no'],
        ['true', 'false'],
        ['always', 'never'],
        ['all', 'none']
      ];

      const content = response.content.toLowerCase();
      contradictions.forEach(([a, b]) => {
        if (content.includes(a) && content.includes(b)) {
          issues.push(`Potential contradiction: "${a}" and "${b}" both present`);
        }
      });

      return {
        isValid: issues.length === 0,
        confidence: issues.length === 0 ? 1.0 : 0.5,
        issues,
        verifiedFacts: [],
        unverifiedClaims: []
      };
    });
  }

  /**
   * Validate an AI response
   */
  async validate(response: AIResponse): Promise<ValidationResult> {
    const results: ValidationResult[] = [];

    // Run all validation rules
    for (const rule of this.validationRules) {
      results.push(rule(response));
    }

    // Aggregate results
    const allIssues: string[] = [];
    const allVerifiedFacts: string[] = [];
    const allUnverifiedClaims: string[] = [];
    let totalConfidence = 0;

    results.forEach(result => {
      allIssues.push(...result.issues);
      allVerifiedFacts.push(...result.verifiedFacts);
      allUnverifiedClaims.push(...result.unverifiedClaims);
      totalConfidence += result.confidence;
    });

    const avgConfidence = totalConfidence / results.length;
    const isValid = allIssues.length === 0 && avgConfidence >= 0.8;

    return {
      isValid,
      confidence: avgConfidence,
      issues: [...new Set(allIssues)],
      verifiedFacts: [...new Set(allVerifiedFacts)],
      unverifiedClaims: [...new Set(allUnverifiedClaims)]
    };
  }

  /**
   * Add verified fact to database
   */
  addFact(fact: string, source: string, verified: boolean = true): void {
    this.factDatabase.set(fact.toLowerCase(), {
      verified,
      source,
      timestamp: new Date()
    });
  }

  /**
   * Check if a fact is verified
   */
  isVerified(fact: string): boolean {
    const stored = this.factDatabase.get(fact.toLowerCase());
    return stored?.verified || false;
  }

  /**
   * Get validation summary
   */
  getValidationSummary(results: ValidationResult[]): {
    total: number;
    valid: number;
    invalid: number;
    avgConfidence: number;
  } {
    const total = results.length;
    const valid = results.filter(r => r.isValid).length;
    const invalid = total - valid;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / total;

    return {
      total,
      valid,
      invalid,
      avgConfidence
    };
  }
}

