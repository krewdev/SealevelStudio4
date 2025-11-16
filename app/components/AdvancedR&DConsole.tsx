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
];

interface AdvancedR&DConsoleProps {
  initialMinimized?: boolean;
  onToggle?: (minimized: boolean) => void;
}

export function AdvancedR&DConsole({ initialMinimized = false, onToggle }: AdvancedR&DConsoleProps = {}) {
  const [commands, setCommands] = useState<Command[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  
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
            const signatures = tx.signatures.map(sig => sig.toString('base64'));
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

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => handleToggleMinimize(false)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
        >
          <Terminal size={16} />
          <span>R&D Console</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-[800px] h-[600px] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <Terminal className="text-purple-400" size={20} />
          <h2 className="text-lg font-bold text-white">Advanced R&D Console</h2>
          <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded">R&D Only</span>
        </div>
        <div className="flex items-center gap-2">
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
        className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-black text-green-400"
        style={{ fontFamily: 'monospace' }}
      >
        <div className="mb-2 text-gray-500">
          <div>Advanced Decryption & R&D Console</div>
          <div>Type 'help' for available commands</div>
          <div className="mt-2 text-yellow-400">⚠️ WARNING: For R&D purposes only. Not for production use.</div>
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

