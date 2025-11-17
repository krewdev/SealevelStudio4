'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Search, 
  Bug, 
  Code, 
  Trash2, 
  Download,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle,
  X,
  ArrowLeft,
  FileText,
  Terminal
} from 'lucide-react';
import { SYSTEM_PROMPT_BLUE_ANALYST, SYSTEM_PROMPT_RED_TEAM, SYSTEM_PROMPT_SECURE_CODER } from '../lib/cybersecurity/prompts';
import { ShellEnvironment } from '../lib/cybersecurity/shell-env';
import { KNOWN_EXPLOITS, searchExploits } from '../lib/cybersecurity/exploits-db';

interface AnalysisResult {
  type: 'blue' | 'red' | 'fixer';
  content: string;
  timestamp: Date;
}

interface CybersecurityFinderProps {
  onBack?: () => void;
}

export function CybersecurityFinder({ onBack }: CybersecurityFinderProps) {
  const [code, setCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState<Array<{ type: string; content: string; timestamp: Date }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'console'>('editor');
  const [consoleInput, setConsoleInput] = useState('');
  const [consoleHistory, setConsoleHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [scanMode, setScanMode] = useState(false);
  const [shellEnv] = useState(() => new ShellEnvironment());
  const [showShellVars, setShowShellVars] = useState(false);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const codeInputRef = useRef<HTMLTextAreaElement>(null);
  const consoleInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll console
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleOutput]);

  const addToConsole = useCallback((content: string, type: 'system' | 'user' | 'error' | 'blue' | 'red' | 'fixer' | 'heading-blue' | 'heading-red' | 'heading-fixer' = 'system') => {
    setConsoleOutput(prev => [...prev, { type, content, timestamp: new Date() }]);
  }, []);

  const formatAIResponse = (text: string, baseColor: string): string => {
    let safeText = escapeHTML(text);

    // Headings ### -> Bold and white
    safeText = safeText.replace(/^###\s(.+)/gm, '<span class="font-bold text-white mt-2 block">$1</span>');
    
    // Code blocks ```...```
    safeText = safeText.replace(/```(\w*?)\n([\s\S]*?)```/g, (match, lang, code) => {
      const codeColor = baseColor === 'text-yellow-300' ? 'text-yellow-300' : 'text-gray-200';
      return `<pre class="bg-gray-800 p-2 rounded-md my-2 ${codeColor} overflow-x-auto text-xs">${escapeHTML(code.trim())}</pre>`;
    });

    // Inline code `...`
    safeText = safeText.replace(/`([^`]+)`/g, `<code class="bg-gray-700 px-1 rounded ${baseColor}">$1</code>`);
    
    // Bullets * ...
    safeText = safeText.replace(/^\*\s(.+)/gm, '<span class="block ml-4 relative"><span class="absolute -left-4 top-0.5">•</span>$1</span>');
    
    return safeText;
  };

  const escapeHTML = (str: string): string => {
    return str.replace(/[&<>"']/g, (m) => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return map[m];
    });
  };

  const callGeminiAPI = async (codeSnippet: string, systemPrompt: string): Promise<string> => {
    const response = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codeSnippet,
        systemPrompt,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    const result = await response.json();
    return result.analysis;
  };

  const handleAnalyze = async (mode: 'all' | 'find' | 'exploit' | 'fix') => {
    if (!code.trim()) {
      addToConsole('Code snippet area is empty. Please paste some code to analyze.', 'error');
      return;
    }

    setIsLoading(true);
    setActiveTab('console');

    try {
      if (mode === 'all' || mode === 'find') {
        addToConsole('--- RUNNING BLUE TEAM (FINDER) ---', 'heading-blue');
        const blueReport = await callGeminiAPI(code, SYSTEM_PROMPT_BLUE_ANALYST);
        addToConsole(blueReport, 'blue');
      }

      if (mode === 'all' || mode === 'exploit') {
        addToConsole('--- RUNNING RED TEAM (EXPLOITER) ---', 'heading-red');
        const redReport = await callGeminiAPI(code, SYSTEM_PROMPT_RED_TEAM);
        addToConsole(redReport, 'red');
      }

      if (mode === 'all' || mode === 'fix') {
        addToConsole('--- RUNNING SECURE CODER (FIXER) ---', 'heading-fixer');
        const fixerReport = await callGeminiAPI(code, SYSTEM_PROMPT_SECURE_CODER);
        addToConsole(fixerReport, 'fixer');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide helpful error message for missing API key
      if (errorMessage.includes('Gemini API key not configured')) {
        addToConsole('⚠️ Gemini API key is not configured.', 'error');
        addToConsole('', 'error');
        addToConsole('To use the Cybersecurity Finder:', 'error');
        addToConsole('1. Get an API key from https://ai.google.dev/', 'error');
        addToConsole('2. Add it to your .env.local file as: GEMINI_API_KEY=your-key-here', 'error');
        addToConsole('3. Restart your development server', 'error');
        addToConsole('', 'error');
        addToConsole('For production, add it in Vercel project settings → Environment Variables.', 'error');
      } else {
        addToConsole(`Failed to complete analysis: ${errorMessage}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = () => {
    const exampleCode = `// Example vulnerable Solana program code
use anchor_lang::prelude::*;

#[program]
pub mod vulnerable_program {
    use super::*;

    pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
        // VULNERABLE: No signer check
        let from = &ctx.accounts.from;
        let to = &ctx.accounts.to;
        
        // VULNERABLE: No account ownership validation
        from.sub(amount)?;
        to.add(amount)?;
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Transfer<'info> {
    // VULNERABLE: Missing signer constraint
    pub from: Account<'info, TokenAccount>,
    pub to: Account<'info, TokenAccount>,
}`;
    setCode(exampleCode);
    addToConsole('Example vulnerable code loaded. Click "Analyze All" to see the report.', 'system');
  };

  // Console command handler
  const handleConsoleCommand = async (command: string) => {
    const trimmed = command.trim().toLowerCase();
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    addToConsole(command, 'user');
    setConsoleHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    if (cmd === 'help') {
      addToConsole(`Available commands:
  help              - Show this help message
  analyze-all        - Run all 3 AIs: Find, Exploit, and Fix
  analyze-find       - Run Blue Team (Analyst) to find vulnerabilities
  analyze-exploit    - Run Red Team (Attacker) to find attack vectors
  analyze-fix        - Run Secure Coder (Fixer) to get corrected code
  scan-paste         - Enable paste scanning mode (analyzes clipboard on paste)
  scan-off           - Disable paste scanning mode
  example            - Load an example of vulnerable code
  clear              - Clear the console screen
  report             - Generate a security report of all findings
  
Shell Environment Commands (for pen testing):
  shell <command>    - Execute shell command (echo, env, set, unset, vars, curl, payload, exploit)
  vars               - Show all environment variables
  set <VAR> <value>  - Set environment variable
  unset <VAR>        - Unset environment variable
  exploit-list       - List all known exploits
  exploit-search <keyword> - Search exploits database
  exploit-info <id>  - Show detailed exploit information`, 'system');
    } else if (cmd === 'clear') {
      setConsoleOutput([]);
    } else if (cmd === 'example') {
      loadExample();
    } else if (cmd === 'scan-paste' || cmd === 'scan-on') {
      setScanMode(true);
      addToConsole('Paste scanning mode enabled. Paste code to automatically analyze.', 'system');
    } else if (cmd === 'scan-off') {
      setScanMode(false);
      addToConsole('Paste scanning mode disabled.', 'system');
    } else if (cmd === 'analyze-all' || cmd === 'analyze') {
      await handleAnalyze('all');
    } else if (cmd === 'analyze-find') {
      await handleAnalyze('find');
    } else if (cmd === 'analyze-exploit') {
      await handleAnalyze('exploit');
    } else if (cmd === 'analyze-fix') {
      await handleAnalyze('fix');
    } else if (cmd === 'report') {
      generateReport();
    } else if (cmd === 'shell') {
      // Execute shell command
      const shellCmd = args.join(' ');
      if (shellCmd) {
        try {
          const result = await shellEnv.executeCommand(shellCmd);
          addToConsole(result.output, result.exitCode === 0 ? 'system' : 'error');
        } catch (error) {
          addToConsole(`Shell error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
      } else {
        addToConsole('Usage: shell <command>\nExample: shell echo $TARGET_URL', 'error');
      }
    } else if (cmd === 'vars' || cmd === 'variables') {
      const vars = shellEnv.getAllVariables(false);
      const varList = vars.map(v => 
        `${v.name}=${v.value}${v.description ? ` # ${v.description}` : ''}`
      ).join('\n');
      addToConsole(varList || 'No variables set', 'system');
    } else if (cmd === 'set') {
      if (args.length >= 2) {
        const varName = args[0];
        const value = args.slice(1).join(' ');
        shellEnv.setVariable(varName, value);
        addToConsole(`Variable ${varName} set to: ${value}`, 'system');
      } else {
        addToConsole('Usage: set <VAR_NAME> <value>', 'error');
      }
    } else if (cmd === 'unset') {
      if (args.length === 1) {
        const varName = args[0];
        // Use shell command to properly unset
        const result = await shellEnv.executeCommand(`unset ${varName}`);
        addToConsole(result.output, result.exitCode === 0 ? 'system' : 'error');
      } else {
        addToConsole('Usage: unset <VAR_NAME>', 'error');
      }
    } else if (cmd === 'exploit-list') {
      const categories = Array.from(new Set(KNOWN_EXPLOITS.map(e => e.category)));
      let list = 'Known Exploits by Category:\n\n';
      categories.forEach(cat => {
        const exploits = KNOWN_EXPLOITS.filter(e => e.category === cat);
        list += `${cat}:\n`;
        exploits.forEach(e => {
          list += `  [${e.id}] ${e.name} (${e.severity})\n`;
        });
        list += '\n';
      });
      addToConsole(list, 'system');
    } else if (cmd === 'exploit-search') {
      const keyword = args.join(' ');
      if (keyword) {
        const results = searchExploits(keyword);
        if (results.length > 0) {
          let output = `Found ${results.length} exploit(s):\n\n`;
          results.forEach(e => {
            output += `[${e.id}] ${e.name} (${e.severity})\n`;
            output += `  Category: ${e.category}\n`;
            output += `  ${e.description}\n\n`;
          });
          addToConsole(output, 'system');
        } else {
          addToConsole(`No exploits found matching "${keyword}"`, 'system');
        }
      } else {
        addToConsole('Usage: exploit-search <keyword>', 'error');
      }
    } else if (cmd === 'exploit-info') {
      const exploitId = args[0];
      if (exploitId) {
        const exploit = KNOWN_EXPLOITS.find(e => e.id === exploitId);
        if (exploit) {
          let info = `[${exploit.id}] ${exploit.name}\n`;
          info += `Severity: ${exploit.severity}\n`;
          info += `Category: ${exploit.category}\n\n`;
          info += `Description:\n${exploit.description}\n\n`;
          info += `Affected:\n${exploit.affected.join(', ')}\n\n`;
          info += `Detection Patterns:\n`;
          exploit.detection.forEach(p => info += `  - ${p}\n`);
          info += `\nMitigation:\n`;
          exploit.mitigation.forEach(m => info += `  - ${m}\n`);
          if (exploit.example) {
            info += `\nExample:\n${exploit.example}\n`;
          }
          addToConsole(info, 'system');
        } else {
          addToConsole(`Exploit ${exploitId} not found. Use 'exploit-list' to see all exploits.`, 'error');
        }
      } else {
        addToConsole('Usage: exploit-info <exploit_id>\nExample: exploit-info sol-001', 'error');
      }
    } else if (trimmed === '') {
      // Empty command, do nothing
    } else {
      // Try as shell command
      try {
        const result = await shellEnv.executeCommand(command);
        addToConsole(result.output, result.exitCode === 0 ? 'system' : 'error');
      } catch {
        addToConsole(`Command not found: ${command}. Type 'help' for available commands.`, 'error');
      }
    }

    setConsoleInput('');
  };

  // Generate security report
  const generateReport = () => {
    const findings = consoleOutput.filter(item => 
      item.type === 'blue' || item.type === 'red' || item.type === 'fixer'
    );

    if (findings.length === 0) {
      addToConsole('No findings to report. Run an analysis first.', 'error');
      return;
    }

    const timestamp = new Date().toISOString();
    const dateStr = new Date().toLocaleString();

    // Generate text report
    let report = '=== SECURITY ANALYSIS REPORT ===\n\n';
    report += `Generated: ${dateStr}\n`;
    report += `Total Findings: ${findings.length}\n\n`;

    findings.forEach((finding, i) => {
      const type = finding.type === 'blue' ? 'BLUE TEAM (FINDER)' : 
                   finding.type === 'red' ? 'RED TEAM (EXPLOITER)' : 
                   'SECURE CODER (FIXER)';
      report += `--- ${type} ---\n`;
      report += finding.content + '\n\n';
    });

    // Generate structured JSON report
    const jsonReport = {
      metadata: {
        generated: timestamp,
        generatedFormatted: dateStr,
        totalFindings: findings.length,
        scanner: 'AI Cybersecurity Finder',
        version: '1.0'
      },
      findings: findings.map(finding => ({
        type: finding.type === 'blue' ? 'blue_team' : 
              finding.type === 'red' ? 'red_team' : 'secure_coder',
        typeLabel: finding.type === 'blue' ? 'BLUE TEAM (FINDER)' : 
                   finding.type === 'red' ? 'RED TEAM (EXPLOITER)' : 
                   'SECURE CODER (FIXER)',
        content: finding.content,
        timestamp: finding.timestamp.toISOString()
      })),
      codeAnalyzed: code || 'No code provided',
      summary: {
        blueTeamFindings: findings.filter(f => f.type === 'blue').length,
        redTeamFindings: findings.filter(f => f.type === 'red').length,
        fixerFindings: findings.filter(f => f.type === 'fixer').length
      }
    };

    addToConsole(report, 'system');
    
    // Copy to clipboard
    navigator.clipboard.writeText(report).then(() => {
      addToConsole('Report copied to clipboard!', 'system');
    });

    // Download text report
    const textBlob = new Blob([report], { type: 'text/plain' });
    const textUrl = URL.createObjectURL(textBlob);
    const textLink = document.createElement('a');
    textLink.href = textUrl;
    textLink.download = `security-report-${timestamp.replace(/[:.]/g, '-')}.txt`;
    textLink.click();
    URL.revokeObjectURL(textUrl);

    // Download JSON report
    const jsonBlob = new Blob([JSON.stringify(jsonReport, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `security-report-${timestamp.replace(/[:.]/g, '-')}.json`;
    jsonLink.click();
    URL.revokeObjectURL(jsonUrl);

    addToConsole('Report downloaded as TXT and JSON files!', 'system');
  };

  // Handle paste event for scanning
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!scanMode || activeTab !== 'editor') return;
      
      const pastedText = e.clipboardData?.getData('text');
      if (pastedText && pastedText.trim().length > 50) {
        e.preventDefault();
        setCode(pastedText);
        addToConsole('Code detected from clipboard. Analyzing...', 'system');
        setActiveTab('console');
        
        // Trigger analysis
        setIsLoading(true);
        try {
          addToConsole('--- RUNNING BLUE TEAM (FINDER) ---', 'heading-blue');
          const blueReport = await callGeminiAPI(pastedText, SYSTEM_PROMPT_BLUE_ANALYST);
          addToConsole(blueReport, 'blue');
          
          addToConsole('--- RUNNING RED TEAM (EXPLOITER) ---', 'heading-red');
          const redReport = await callGeminiAPI(pastedText, SYSTEM_PROMPT_RED_TEAM);
          addToConsole(redReport, 'red');
          
          addToConsole('--- RUNNING SECURE CODER (FIXER) ---', 'heading-fixer');
          const fixerReport = await callGeminiAPI(pastedText, SYSTEM_PROMPT_SECURE_CODER);
          addToConsole(fixerReport, 'fixer');
        } catch (error) {
          addToConsole(`Failed to complete analysis: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (scanMode) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [scanMode, activeTab, addToConsole, callGeminiAPI]);

  // Console input keyboard handling
  const handleConsoleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleConsoleCommand(consoleInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (consoleHistory.length > 0) {
        const newIndex = historyIndex === -1 ? consoleHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setConsoleInput(consoleHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= consoleHistory.length) {
          setHistoryIndex(-1);
          setConsoleInput('');
        } else {
          setHistoryIndex(newIndex);
          setConsoleInput(consoleHistory[newIndex]);
        }
      }
    }
  };

  const clearConsole = () => {
    setConsoleOutput([]);
  };

  const exportCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'code-snippet.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCode = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.rs,.ts,.js,.sol';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setCode(event.target?.result as string);
          addToConsole(`Code loaded from ${file.name}`, 'system');
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 p-4 bg-gray-800">
        <div className="flex items-center gap-4 mb-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Back</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <Shield className="text-green-400" size={24} />
            <h1 className="text-2xl font-bold">AI Cybersecurity Finder</h1>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          Analyze code for vulnerabilities using AI-powered Blue Team, Red Team, and Secure Coder analysis
        </p>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setShowShellVars(!showShellVars)}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
          >
            {showShellVars ? 'Hide' : 'Show'} Shell Variables
          </button>
          {showShellVars && (
            <div className="flex-1 text-xs text-gray-400 flex flex-wrap gap-2">
              {shellEnv.getAllVariables(true).slice(0, 5).map(v => (
                <span key={v.name} className="px-2 py-0.5 bg-gray-700 rounded">
                  {v.name}={v.sensitive ? '***' : v.value || '(empty)'}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 bg-gray-800">
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'editor'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Code size={16} className="inline mr-2" />
          Code Editor
        </button>
        <button
          onClick={() => setActiveTab('console')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'console'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Terminal size={16} className="inline mr-2" />
          Analysis Console
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">
        {/* Code Editor */}
        <div className={`flex flex-col bg-gray-800 rounded-lg shadow-lg ${activeTab === 'editor' ? '' : 'hidden md:flex'}`}>
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-t-lg">
            <label className="text-sm font-semibold text-gray-200">Code Snippet to Analyze</label>
            <div className="flex items-center gap-2">
              <button
                onClick={importCode}
                className="p-1.5 hover:bg-gray-600 rounded text-gray-400 hover:text-white"
                title="Import code"
              >
                <Upload size={14} />
              </button>
              <button
                onClick={exportCode}
                className="p-1.5 hover:bg-gray-600 rounded text-gray-400 hover:text-white"
                title="Export code"
              >
                <Download size={14} />
              </button>
            </div>
          </div>
          <textarea
            ref={codeInputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 p-4 bg-gray-800 text-gray-100 rounded-b-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
            placeholder="Paste your code snippet here (e.g., Rust, TypeScript, JavaScript, Solidity)"
          />
          <div className="p-3 bg-gray-700 rounded-b-lg border-t border-gray-600">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleAnalyze('all')}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium flex items-center gap-2"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Analyze All
              </button>
              <button
                onClick={() => handleAnalyze('find')}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium flex items-center gap-2"
              >
                <Search size={14} />
                Find Only
              </button>
              <button
                onClick={() => handleAnalyze('exploit')}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium flex items-center gap-2"
              >
                <Bug size={14} />
                Exploit Only
              </button>
              <button
                onClick={() => handleAnalyze('fix')}
                disabled={isLoading}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium flex items-center gap-2"
              >
                <Code size={14} />
                Fix Only
              </button>
              <button
                onClick={loadExample}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium flex items-center gap-2"
              >
                <FileText size={14} />
                Load Example
              </button>
              <button
                onClick={generateReport}
                disabled={isLoading || consoleOutput.filter(item => item.type === 'blue' || item.type === 'red' || item.type === 'fixer').length === 0}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium flex items-center gap-2"
                title="Download security report (TXT and JSON)"
              >
                <Download size={14} />
                Download Report
              </button>
            </div>
          </div>
        </div>

        {/* Console */}
        <div className={`flex flex-col bg-black rounded-lg shadow-lg ${activeTab === 'console' ? '' : 'hidden md:flex'}`}>
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-t-lg border-b border-gray-700">
            <label className="text-sm font-semibold text-gray-200">Analysis Console</label>
            <div className="flex items-center gap-2">
              <button
                onClick={generateReport}
                disabled={consoleOutput.filter(item => item.type === 'blue' || item.type === 'red' || item.type === 'fixer').length === 0}
                className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download security report (TXT and JSON)"
              >
                <Download size={14} />
              </button>
              <button
                onClick={clearConsole}
                className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                title="Clear console"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 text-sm font-mono">
            {consoleOutput.length === 0 ? (
              <div className="text-gray-500">
                <div>Welcome to the AI Cybersecurity Finder!</div>
                <div className="mt-2">• Paste code in the editor</div>
                <div>• Click "Analyze All" to run Blue Team, Red Team, and Secure Coder analysis</div>
                <div>• Click "Load Example" to see a sample vulnerable code</div>
              </div>
            ) : (
              consoleOutput.map((item, i) => {
                const getContent = () => {
                  if (item.type === 'blue' || item.type === 'red' || item.type === 'fixer') {
                    const color = item.type === 'blue' ? 'text-blue-300' : item.type === 'red' ? 'text-red-300' : 'text-yellow-300';
                    return (
                      <div className={`${color} whitespace-pre-wrap`} dangerouslySetInnerHTML={{ __html: formatAIResponse(item.content, color) }} />
                    );
                  } else if (item.type.startsWith('heading-')) {
                    const color = item.type.includes('blue') ? 'text-green-400' : item.type.includes('red') ? 'text-red-400' : 'text-yellow-400';
                    return <div className={`${color} font-bold text-lg mt-4 border-t pt-2`}>{item.content}</div>;
                  } else if (item.type === 'error') {
                    return <div className="text-red-500">{item.content}</div>;
                  } else if (item.type === 'user') {
                    return <div className="text-gray-100"><span className="text-green-400">$</span> {item.content}</div>;
                  } else {
                    return <div className="text-gray-400 whitespace-pre-wrap">{item.content}</div>;
                  }
                };

                return (
                  <div key={i}>
                    {getContent()}
                    <div className="text-xs text-gray-600 mt-1">{item.timestamp.toLocaleTimeString()}</div>
                  </div>
                );
              })
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

