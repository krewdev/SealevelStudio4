'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Terminal, 
  Send, 
  Trash2, 
  Copy, 
  Download, 
  Upload,
  Lock,
  Unlock,
  Key,
  FileText,
  Code,
  Hash,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  X
} from 'lucide-react';
import {
  base64Decode,
  base64Encode,
  hexDecode,
  hexEncode,
  hexDecodeToBytes,
  base58Decode,
  base58Encode,
  decodeKeypairFromBase64,
  decodeKeypairFromHex,
  decodeKeypairFromBase58,
  decodeKeypairFromArray,
  decodeTransaction,
  decodeAccountData,
  decodeAccountDataAsString,
  sha256,
  sha512,
  detectEncoding,
  formatBytes,
  aesDecrypt,
} from '../lib/crypto/decryption';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BrowserVulnerabilityScanner, Vulnerability } from '../lib/security/browser-scanner';
import { Shield, AlertTriangle, CheckCircle, Activity, Radio } from 'lucide-react';
import { RiskAcknowledgement } from './compliance/RiskAcknowledgement';
import { useRiskConsent } from '../hooks/useRiskConsent';

interface Command {
  input: string;
  output: string;
  timestamp: Date;
  type: 'success' | 'error' | 'info';
}

interface CommandHelp {
  name: string;
  description: string;
  usage: string;
  examples: string[];
}

const COMMAND_HELP: CommandHelp[] = [
  {
    name: 'base64',
    description: 'Encode/decode base64',
    usage: 'base64 <encode|decode> <data>',
    examples: ['base64 encode "Hello World"', 'base64 decode "SGVsbG8gV29ybGQ="'],
  },
  {
    name: 'hex',
    description: 'Encode/decode hexadecimal',
    usage: 'hex <encode|decode> <data>',
    examples: ['hex encode "Hello"', 'hex decode "48656c6c6f"'],
  },
  {
    name: 'base58',
    description: 'Encode/decode base58 (Solana)',
    usage: 'base58 <encode|decode> <data>',
    examples: ['base58 encode <hex>', 'base58 decode <base58>'],
  },
  {
    name: 'keypair',
    description: 'Decode Solana keypair from various formats',
    usage: 'keypair <base64|hex|base58|array> <data>',
    examples: ['keypair base64 <base64>', 'keypair hex <hex>'],
  },
  {
    name: 'tx',
    description: 'Decode Solana transaction',
    usage: 'tx <base64>',
    examples: ['tx <base64_transaction>'],
  },
  {
    name: 'account',
    description: 'Decode account data',
    usage: 'account <base64> [encoding]',
    examples: ['account <base64>', 'account <base64> hex'],
  },
  {
    name: 'hash',
    description: 'Compute hash (SHA-256 or SHA-512)',
    usage: 'hash <sha256|sha512> <data>',
    examples: ['hash sha256 "Hello"', 'hash sha512 "World"'],
  },
  {
    name: 'aes',
    description: 'Decrypt AES-encrypted data',
    usage: 'aes <encrypted_base64> <key> [iv]',
    examples: ['aes <encrypted> <key>', 'aes <encrypted> <key> <iv>'],
  },
  {
    name: 'detect',
    description: 'Detect encoding format',
    usage: 'detect <data>',
    examples: ['detect "SGVsbG8="', 'detect "48656c6c6f"'],
  },
  {
    name: 'clear',
    description: 'Clear console',
    usage: 'clear',
    examples: ['clear'],
  },
    {
      name: 'help',
      description: 'Show help',
      usage: 'help [command]',
      examples: ['help', 'help base64'],
    },
    {
      name: 'scan',
      description: 'Control vulnerability scanner',
      usage: 'scan <start|stop|stats|list|clear>',
      examples: ['scan start', 'scan stats', 'scan list'],
    },
    {
      name: 'mode',
      description: 'Switch between console and scanner modes',
      usage: 'mode <console|scanner>',
      examples: ['mode scanner', 'mode console'],
    },
];

interface AdvancedRAndDConsoleProps {
  initialMinimized?: boolean;
  onToggle?: (minimized: boolean) => void;
}

export function AdvancedRAndDConsole({ initialMinimized = false, onToggle }: AdvancedRAndDConsoleProps) {
  const { hasConsent, initialized, accept } = useRiskConsent('rd-console');
  const [commands, setCommands] = useState<Command[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [scannerMode, setScannerMode] = useState<'console' | 'scanner'>('console');
  const [isScanning, setIsScanning] = useState(false);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const scannerRef = useRef<BrowserVulnerabilityScanner | null>(null);
  
  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const consoleRef = useRef<HTMLDivElement>(null);
  
  // Sync with external state
  useEffect(() => {
    setIsMinimized(initialMinimized);
  }, [initialMinimized]);
  
  const handleToggleMinimize = (minimized: boolean) => {
    setIsMinimized(minimized);
    onToggle?.(minimized);
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [commands]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addCommand = useCallback((input: string, output: string, type: 'success' | 'error' | 'info' = 'success') => {
    setCommands(prev => [...prev, {
      input,
      output,
      timestamp: new Date(),
      type,
    }]);
  }, []);

  // Expose addCommand for scanner callbacks (needs to be stable)
  const addCommandRef = useRef(addCommand);
  useEffect(() => {
    addCommandRef.current = addCommand;
  }, [addCommand]);

  // Initialize scanner
  useEffect(() => {
    if (typeof window !== 'undefined') {
      scannerRef.current = new BrowserVulnerabilityScanner();
      
      // Subscribe to vulnerability detections
      const unsubscribe = scannerRef.current.onVulnerabilityDetected((vuln) => {
        setVulnerabilities(prev => {
          // Avoid duplicates
          if (prev.some(v => v.id === vuln.id)) return prev;
          return [vuln, ...prev];
        });
        
        // Auto-add to console in scanner mode
        if (scannerMode === 'scanner') {
          const severityColor = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🔵',
            info: '⚪'
          }[vuln.severity] || '⚪';
          
          addCommandRef.current(
            'scanner',
            `${severityColor} [${vuln.severity.toUpperCase()}] ${vuln.title}\n${vuln.description}\nSource: ${vuln.source}\n${vuln.recommendation ? `\n💡 ${vuln.recommendation}` : ''}`,
            vuln.severity === 'critical' || vuln.severity === 'high' ? 'error' : 'info'
          );
        }
      });

      return () => {
        unsubscribe();
        scannerRef.current?.stopMonitoring();
      };
    }
  }, [scannerMode]);

  // Start/stop scanning
  const toggleScanner = useCallback(() => {
    if (!scannerRef.current) return;

    if (isScanning) {
      scannerRef.current.stopMonitoring();
      setIsScanning(false);
      addCommand('scanner', '🛑 Vulnerability scanner stopped', 'info');
    } else {
      scannerRef.current.clear();
      setVulnerabilities([]);
      scannerRef.current.startMonitoring();
      setIsScanning(true);
      addCommand('scanner', '🟢 Real-time vulnerability scanner started\nMonitoring: Network requests, DOM mutations, Storage, Sensitive data', 'success');
    }
  }, [isScanning, addCommand]);

  const executeCommand = useCallback(async (cmd: string) => {
    const parts = cmd.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return;

    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      switch (command) {
        case 'base64': {
          if (args.length < 2) {
            addCommand(cmd, 'Usage: base64 <encode|decode> <data>', 'error');
            return;
          }
          const op = args[0].toLowerCase();
          const data = args.slice(1).join(' ');
          if (op === 'encode') {
            const encoded = base64Encode(data);
            addCommand(cmd, encoded);
          } else if (op === 'decode') {
            const decoded = base64Decode(data);
            addCommand(cmd, decoded);
          } else {
            addCommand(cmd, 'Invalid operation. Use encode or decode', 'error');
          }
          break;
        }

        case 'hex': {
          if (args.length < 2) {
            addCommand(cmd, 'Usage: hex <encode|decode> <data>', 'error');
            return;
          }
          const op = args[0].toLowerCase();
          const data = args.slice(1).join(' ');
          if (op === 'encode') {
            const encoded = hexEncode(data);
            addCommand(cmd, encoded);
          } else if (op === 'decode') {
            const decoded = hexDecode(data);
            addCommand(cmd, decoded);
          } else {
            addCommand(cmd, 'Invalid operation. Use encode or decode', 'error');
          }
          break;
        }

        case 'base58': {
          if (args.length < 2) {
            addCommand(cmd, 'Usage: base58 <encode|decode> <data>', 'error');
            return;
          }
          const op = args[0].toLowerCase();
          const data = args.slice(1).join(' ');
          if (op === 'encode') {
            // Expect hex input for encoding
            const bytes = hexDecodeToBytes(data);
            const encoded = base58Encode(bytes);
            addCommand(cmd, encoded);
          } else if (op === 'decode') {
            const bytes = base58Decode(data);
            const hex = hexEncode(bytes);
            addCommand(cmd, `Hex: ${hex}\nBytes: ${formatBytes(bytes)}`);
          } else {
            addCommand(cmd, 'Invalid operation. Use encode or decode', 'error');
          }
          break;
        }

        case 'keypair': {
          if (args.length < 2) {
            addCommand(cmd, 'Usage: keypair <base64|hex|base58|array> <data>', 'error');
            return;
          }
          const format = args[0].toLowerCase();
          const data = args.slice(1).join(' ');
          try {
            let keypair: Keypair;
            if (format === 'base64') {
              keypair = decodeKeypairFromBase64(data);
            } else if (format === 'hex') {
              keypair = decodeKeypairFromHex(data);
            } else if (format === 'base58') {
              keypair = decodeKeypairFromBase58(data);
            } else if (format === 'array') {
              keypair = decodeKeypairFromArray(data);
            } else {
              addCommand(cmd, 'Invalid format. Use base64, hex, base58, or array', 'error');
              return;
            }
            const publicKey = keypair.publicKey.toString();
            const secretKey = Array.from(keypair.secretKey);
            addCommand(cmd, `Public Key: ${publicKey}\nSecret Key: [${secretKey.join(', ')}]`);
          } catch (error) {
            addCommand(cmd, `Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
          }
          break;
        }

        case 'tx': {
          if (args.length < 1) {
            addCommand(cmd, 'Usage: tx <base64_transaction>', 'error');
            return;
          }
          const data = args.join(' ');
          try {
            const tx = decodeTransaction(data);
            const signatures = tx.signatures.map(sig => {
              // sig is SignaturePubkeyPair, access the signature property
              const sigBytes = 'signature' in sig ? sig.signature : (sig as any);
              return Buffer.from(sigBytes).toString('base64');
            });
            const instructions = tx.instructions.map((ix, i) => 
              `Instruction ${i}: Program ${ix.programId.toString()}, Accounts: ${ix.keys.length}`
            );
            addCommand(cmd, `Signatures: ${signatures.join(', ')}\nInstructions:\n${instructions.join('\n')}`);
          } catch (error) {
            addCommand(cmd, `Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
          }
          break;
        }

        case 'account': {
          if (args.length < 1) {
            addCommand(cmd, 'Usage: account <base64> [encoding]', 'error');
            return;
          }
          const data = args[0];
          const encoding = args[1] || 'utf8';
          try {
            if (encoding === 'hex') {
              const bytes = decodeAccountData(data);
              const hex = hexEncode(bytes);
              addCommand(cmd, `Hex: ${hex}\nBytes: ${formatBytes(bytes)}`);
            } else {
              const decoded = decodeAccountDataAsString(data, 'utf8');
              addCommand(cmd, decoded);
            }
          } catch (error) {
            addCommand(cmd, `Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
          }
          break;
        }

        case 'hash': {
          if (args.length < 2) {
            addCommand(cmd, 'Usage: hash <sha256|sha512> <data>', 'error');
            return;
          }
          const algo = args[0].toLowerCase();
          const data = args.slice(1).join(' ');
          try {
            if (algo === 'sha256') {
              const hash = await sha256(data);
              addCommand(cmd, hash);
            } else if (algo === 'sha512') {
              const hash = await sha512(data);
              addCommand(cmd, hash);
            } else {
              addCommand(cmd, 'Invalid algorithm. Use sha256 or sha512', 'error');
            }
          } catch (error) {
            addCommand(cmd, `Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
          }
          break;
        }

        case 'aes': {
          if (args.length < 2) {
            addCommand(cmd, 'Usage: aes <encrypted_base64> <key> [iv]', 'error');
            return;
          }
          const encrypted = args[0];
          const key = args[1];
          const iv = args[2];
          try {
            const decrypted = await aesDecrypt(encrypted, key, iv);
            addCommand(cmd, decrypted);
          } catch (error) {
            addCommand(cmd, `Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
          }
          break;
        }

        case 'detect': {
          if (args.length < 1) {
            addCommand(cmd, 'Usage: detect <data>', 'error');
            return;
          }
          const data = args.join(' ');
          const encoding = detectEncoding(data);
          addCommand(cmd, `Detected encoding: ${encoding}`, 'info');
          break;
        }

        case 'scan':
        case 'scanner': {
          if (args[0] === 'start') {
            toggleScanner();
          } else if (args[0] === 'stop') {
            if (isScanning) toggleScanner();
          } else if (args[0] === 'stats') {
            if (scannerRef.current) {
              const stats = scannerRef.current.getStats();
              addCommand(cmd, `Scanner Statistics:\n\nTotal Threats: ${stats.totalThreats}\nCritical: ${stats.critical}\nHigh: ${stats.high}\nMedium: ${stats.medium}\nLow: ${stats.low}\n\nBy Type:\n${Object.entries(stats.byType).map(([type, count]) => `  ${type}: ${count}`).join('\n')}\n\nStatus: ${isScanning ? '🟢 Active' : '🔴 Inactive'}`);
            } else {
              addCommand(cmd, 'Scanner not initialized', 'error');
            }
          } else if (args[0] === 'list') {
            const vulns = scannerRef.current?.getVulnerabilities() || [];
            if (vulns.length === 0) {
              addCommand(cmd, 'No vulnerabilities detected');
            } else {
              const output = vulns.map(v => 
                `[${v.severity.toUpperCase()}] ${v.title}\n  Source: ${v.source}\n  Time: ${v.detectedAt.toLocaleTimeString()}`
              ).join('\n\n');
              addCommand(cmd, `Found ${vulns.length} vulnerability/vulnerabilities:\n\n${output}`);
            }
          } else if (args[0] === 'clear') {
            scannerRef.current?.clear();
            setVulnerabilities([]);
            addCommand(cmd, 'Scanner history cleared');
          } else {
            addCommand(cmd, 'Usage: scan <start|stop|stats|list|clear>\n\n  start  - Start real-time vulnerability scanning\n  stop   - Stop scanning\n  stats  - Show scan statistics\n  list   - List all detected vulnerabilities\n  clear  - Clear vulnerability history', 'info');
          }
          return;
        }

        case 'mode': {
          if (args[0] === 'scanner' || args[0] === 'console') {
            setScannerMode(args[0] as 'scanner' | 'console');
            addCommand(cmd, `Switched to ${args[0]} mode`);
          } else {
            addCommand(cmd, `Current mode: ${scannerMode}\nUsage: mode <console|scanner>`, 'info');
          }
          return;
        }

        case 'clear': {
          setCommands([]);
          return;
        }

        case 'help': {
          if (args.length > 0) {
            const cmdName = args[0].toLowerCase();
            const help = COMMAND_HELP.find(h => h.name === cmdName);
            if (help) {
              addCommand(cmd, `${help.name}: ${help.description}\nUsage: ${help.usage}\nExamples:\n${help.examples.map(e => `  ${e}`).join('\n')}`, 'info');
            } else {
              addCommand(cmd, `Command '${cmdName}' not found. Use 'help' to see all commands.`, 'error');
            }
          } else {
            const helpText = COMMAND_HELP.map(h => `  ${h.name.padEnd(12)} - ${h.description}`).join('\n');
            addCommand(cmd, `Available commands:\n${helpText}\n\nUse 'help <command>' for detailed usage.`, 'info');
          }
          break;
        }

        default:
          addCommand(cmd, `Unknown command: ${command}. Type 'help' for available commands.`, 'error');
      }
    } catch (error) {
      addCommand(cmd, `Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }, [addCommand]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setHistory(prev => [...prev, input]);
    setHistoryIndex(-1);
    executeCommand(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      }
    }
  };

  const copyOutput = (output: string) => {
    navigator.clipboard.writeText(output);
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't drag if clicking on a button or input
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('button') || target.closest('input')) {
      return;
    }
    
    if (consoleRef.current) {
      const rect = consoleRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && consoleRef.current) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Constrain to viewport
        const maxX = window.innerWidth - consoleRef.current.offsetWidth;
        const maxY = window.innerHeight - consoleRef.current.offsetHeight;
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (isMinimized) {
    return (
      <div 
        ref={consoleRef}
        className="fixed bottom-4 right-4 z-50"
        style={{ left: position.x || undefined, top: position.y || undefined, bottom: position.y ? undefined : '1rem', right: position.x ? undefined : '1rem' }}
      >
        <button
          onClick={() => handleToggleMinimize(false)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 cursor-move"
          onMouseDown={handleMouseDown}
        >
          <Terminal size={16} />
          <span>R&D Console</span>
        </button>
      </div>
    );
  }

  if (!initialized) {
    return null;
  }

  if (!hasConsent) {
    return (
      <div className="fixed bottom-6 right-6 max-w-md w-[calc(100vw-2rem)] z-40">
        <RiskAcknowledgement
          featureName="Advanced R&D Console"
          summary="This console can decode keys, decrypt payloads, and run vulnerability scanners. Confirm you have authorization to inspect any data you load and that you accept all risk."
          bulletPoints={[
            'Keypair + transaction decoding utilities',
            'AES/base64/hex helpers for sensitive payloads',
            'Live browser vulnerability monitor',
          ]}
          costDetails={[
            'Runs locally—no remote data exfiltration',
            'Logging is disabled by default; copy anything you need before closing',
          ]}
          disclaimers={[
            'Do not paste secrets you are not authorized to handle.',
            'You are solely responsible for legal compliance in your jurisdiction.',
          ]}
          accent="orange"
          layout="inline"
          cardClassName="shadow-2xl"
          onAccept={accept}
        />
      </div>
    );
  }

  return (
    <div 
      ref={consoleRef}
      className="fixed w-[800px] h-[600px] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl flex flex-col z-50"
      style={{ 
        left: position.x || undefined, 
        top: position.y || undefined, 
        bottom: position.y ? undefined : '1rem', 
        right: position.x ? undefined : '1rem',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800 cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          {scannerMode === 'scanner' ? (
            <Shield className="text-red-400" size={20} />
          ) : (
            <Terminal className="text-purple-400" size={20} />
          )}
          <h2 className="text-lg font-bold text-white">
            {scannerMode === 'scanner' ? 'Browser Vulnerability Scanner' : 'Advanced R&D Console'}
          </h2>
          {scannerMode === 'scanner' ? (
            <div className="flex items-center gap-2">
              {isScanning ? (
                <div className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded">
                  <Radio size={12} className="animate-pulse" />
                  <span>Scanning</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-900/30 px-2 py-0.5 rounded">
                  <Radio size={12} />
                  <span>Inactive</span>
                </div>
              )}
              {vulnerabilities.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded">
                  <AlertTriangle size={12} />
                  <span>{vulnerabilities.length} threats</span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded">R&D Only</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <button
            onClick={() => setScannerMode(scannerMode === 'console' ? 'scanner' : 'console')}
            className={`p-2 rounded text-sm transition-colors ${
              scannerMode === 'scanner' 
                ? 'bg-red-900/50 text-red-400 hover:bg-red-900/70' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
            title={scannerMode === 'console' ? 'Switch to Scanner Mode' : 'Switch to Console Mode'}
          >
            {scannerMode === 'scanner' ? <Terminal size={16} /> : <Shield size={16} />}
          </button>
          
          {/* Scanner Toggle (only in scanner mode) */}
          {scannerMode === 'scanner' && (
            <button
              onClick={toggleScanner}
              className={`p-2 rounded transition-colors ${
                isScanning
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
              title={isScanning ? 'Stop Scanner' : 'Start Scanner'}
            >
              {isScanning ? <Activity size={16} className="animate-pulse" /> : <Radio size={16} />}
            </button>
          )}
          
          <button
            onClick={() => setCommands([])}
            className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            title="Clear"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => handleToggleMinimize(true)}
            className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            title="Minimize"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Output Area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-4 font-mono text-sm bg-black text-green-400"
        style={{ fontFamily: 'monospace' }}
      >
        <div className="mb-2 text-gray-500">
          {scannerMode === 'scanner' ? (
            <>
              <div className="text-red-400 font-bold">🛡️ Real-Time Browser Vulnerability Scanner</div>
              <div>Detecting XSS, CSRF, injection attacks, insecure connections, and more...</div>
              {isScanning ? (
                <div className="mt-2 text-green-400">🟢 Scanner active - Monitoring in real-time</div>
              ) : (
                <div className="mt-2 text-gray-400">Type 'scan start' to begin monitoring</div>
              )}
              {vulnerabilities.length > 0 && (
                <div className="mt-2 text-red-400">
                  ⚠️ {vulnerabilities.length} vulnerability/vulnerabilities detected
                </div>
              )}
            </>
          ) : (
            <>
              <div>Advanced Decryption & R&D Console</div>
              <div>Type 'help' for available commands</div>
              <div className="mt-2 text-yellow-400">⚠️ WARNING: For R&D purposes only. Not for production use.</div>
            </>
          )}
        </div>
        {commands.map((cmd, i) => (
          <div key={i} className="mb-4">
            <div className="text-purple-400 mb-1">
              {'>'} {cmd.input}
            </div>
            <div className={`ml-4 whitespace-pre-wrap ${
              cmd.type === 'error' ? 'text-red-400' : 
              cmd.type === 'info' ? 'text-blue-400' : 
              'text-green-400'
            }`}>
              {cmd.output}
            </div>
            <div className="text-xs text-gray-600 mt-1 ml-4">
              {cmd.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={outputRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t border-gray-700 p-4 bg-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-purple-400">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-black text-green-400 px-3 py-2 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Type a command... (help for commands)"
            autoComplete="off"
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Use ↑/↓ for command history | Tab for autocomplete (coming soon)
        </div>
      </form>
    </div>
  );
}

