/**
 * Shell Environment for Pen Testing
 * Manages environment variables and safe command execution
 */

export interface ShellVariable {
  name: string;
  value: string;
  description?: string;
  sensitive?: boolean;
}

export interface ShellCommand {
  command: string;
  output: string;
  exitCode: number;
  timestamp: Date;
}

export class ShellEnvironment {
  private variables: Map<string, ShellVariable> = new Map();
  private history: ShellCommand[] = [];
  private maxHistory = 100;

  constructor() {
    // Initialize with common pen testing variables
    this.setVariable('TARGET_URL', '', 'Target application URL');
    this.setVariable('TARGET_IP', '', 'Target server IP address');
    this.setVariable('TARGET_PORT', '80', 'Target port');
    this.setVariable('API_KEY', '', 'API key for testing');
    this.setVariable('AUTH_TOKEN', '', 'Authentication token');
    this.setVariable('USER_AGENT', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', 'HTTP User-Agent');
    this.setVariable('PAYLOAD', '', 'Test payload');
    this.setVariable('EXPLOIT_PATH', '', 'Path to exploit script');
    this.setVariable('OUTPUT_DIR', './output', 'Output directory for results');
    this.setVariable('TIMEOUT', '30', 'Request timeout in seconds');
    this.setVariable('THREADS', '10', 'Number of concurrent threads');
    this.setVariable('VERBOSE', 'false', 'Verbose output mode');
  }

  /**
   * Set an environment variable
   */
  setVariable(name: string, value: string, description?: string, sensitive: boolean = false): void {
    this.variables.set(name, {
      name,
      value,
      description,
      sensitive
    });
  }

  /**
   * Delete an environment variable
   */
  deleteVariable(name: string): boolean {
    return this.variables.delete(name);
  }

  /**
   * Get an environment variable value (with substitution)
   */
  getVariable(name: string): string | undefined {
    const var_ = this.variables.get(name);
    if (!var_) return undefined;
    
    // Perform variable substitution
    let value = var_.value;
    this.variables.forEach((v, key) => {
      const regex = new RegExp(`\\$${key}|\\$\\{${key}\\}`, 'g');
      value = value.replace(regex, v.value);
    });
    
    return value;
  }

  /**
   * Get all variables (for display, masking sensitive ones)
   */
  getAllVariables(maskSensitive: boolean = true): ShellVariable[] {
    return Array.from(this.variables.values()).map(v => ({
      ...v,
      value: v.sensitive && maskSensitive ? '***' : v.value
    }));
  }

  /**
   * Export variables as shell format
   */
  exportVariables(): string {
    let output = '';
    this.variables.forEach(v => {
      // Escape special characters in value
      const escaped = v.value.replace(/(["'$`\\])/g, '\\$1');
      output += `export ${v.name}="${escaped}"\n`;
    });
    return output;
  }

  /**
   * Substitute variables in a string
   */
  substitute(text: string): string {
    let result = text;
    this.variables.forEach((v, name) => {
      const regex = new RegExp(`\\$${name}|\\$\\{${name}\\}`, 'g');
      result = result.replace(regex, v.value);
    });
    return result;
  }

  /**
   * Execute a safe command (sandboxed, no actual execution)
   * Returns simulated output for pen testing scenarios
   */
  async executeCommand(command: string): Promise<ShellCommand> {
    const substituted = this.substitute(command);
    const parts = substituted.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    let output = '';
    let exitCode = 0;

    // Safe command execution (simulated for pen testing)
    switch (cmd) {
      case 'echo':
        output = args.join(' ');
        break;
      
      case 'env':
        if (args.length === 0) {
          output = this.exportVariables();
        } else {
          const varName = args[0];
          const value = this.getVariable(varName);
          output = value ? `${varName}=${value}` : '';
          exitCode = value ? 0 : 1;
        }
        break;
      
      case 'set':
        if (args.length >= 2) {
          const varName = args[0];
          const value = args.slice(1).join(' ');
          this.setVariable(varName, value);
          output = `Variable ${varName} set to: ${value}`;
        } else {
          output = 'Usage: set <VAR_NAME> <value>';
          exitCode = 1;
        }
        break;
      
      case 'unset':
        if (args.length === 1) {
          const varName = args[0];
          if (this.variables.has(varName)) {
            this.variables.delete(varName);
            output = `Variable ${varName} unset`;
          } else {
            output = `Variable ${varName} not found`;
            exitCode = 1;
          }
        } else {
          output = 'Usage: unset <VAR_NAME>';
          exitCode = 1;
        }
        break;
      
      case 'vars':
      case 'variables':
        const vars = this.getAllVariables(false);
        output = vars.map(v => 
          `${v.name}=${v.value}${v.description ? ` # ${v.description}` : ''}`
        ).join('\n');
        break;
      
      case 'history':
        const history = this.history.slice(-20);
        output = history.map((h, i) => 
          `${i + 1}  ${h.command}`
        ).join('\n');
        break;
      
      case 'clear':
        this.history = [];
        output = 'History cleared';
        break;
      
      case 'help':
        output = `Available commands:
  echo <text>           - Echo text
  env [VAR]            - Show environment variables
  set <VAR> <value>    - Set environment variable
  unset <VAR>          - Unset environment variable
  vars                 - List all variables
  history              - Show command history
  clear                - Clear history
  help                 - Show this help
  curl <url>           - Simulate HTTP request (for testing)
  payload <type>       - Generate test payload
  exploit <id>         - Load exploit template`;
        break;
      
      case 'curl':
        // Simulate curl command for pen testing
        const url = args[0] || this.getVariable('TARGET_URL') || '';
        if (!url) {
          output = 'Error: No URL specified. Set TARGET_URL or provide as argument.';
          exitCode = 1;
        } else {
          output = `[SIMULATED] curl ${url}\n` +
                   `User-Agent: ${this.getVariable('USER_AGENT')}\n` +
                   `Status: 200 OK\n` +
                   `Content-Type: application/json\n` +
                   `\n[Response body would appear here]`;
        }
        break;
      
      case 'payload':
        const payloadType = args[0] || 'sql';
        output = this.generatePayload(payloadType);
        break;
      
      case 'exploit':
        const exploitId = args[0];
        if (exploitId) {
          output = this.loadExploitTemplate(exploitId);
        } else {
          output = 'Usage: exploit <exploit_id>\nExample: exploit sol-001';
          exitCode = 1;
        }
        break;
      
      default:
        output = `Command not found: ${cmd}. Type 'help' for available commands.`;
        exitCode = 1;
    }

    const commandResult: ShellCommand = {
      command: substituted,
      output,
      exitCode,
      timestamp: new Date()
    };

    this.history.push(commandResult);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    return commandResult;
  }

  /**
   * Generate test payloads
   */
  private generatePayload(type: string): string {
    const payloads: Record<string, string> = {
      sql: "' OR '1'='1",
      xss: '<script>alert("XSS")</script>',
      command: '; ls -la',
      path: '../../../etc/passwd',
      xml: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
      solana: 'Missing signer check exploit template',
    };
    
    return payloads[type] || `Payload type "${type}" not found. Available: ${Object.keys(payloads).join(', ')}`;
  }

  /**
   * Load exploit template
   */
  private loadExploitTemplate(exploitId: string): string {
    // This would load from the exploits database
    return `Exploit template for ${exploitId}:\n[Template would be loaded from exploits database]`;
  }

  /**
   * Get command history
   */
  getHistory(): ShellCommand[] {
    return [...this.history];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }
}

