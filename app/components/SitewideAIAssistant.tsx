'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  Brain,
  Zap,
  TrendingUp,
  Wallet,
  Settings,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface AIAssistantProps {
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function SitewideAIAssistant({ isMinimized = false, onToggleMinimize }: AIAssistantProps) {
  const { publicKey, connected } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "👋 Hi! I'm your Sealevel AI Assistant. I can help you with:\n\n• Building and optimizing Solana transactions\n• Finding arbitrage opportunities\n• Explaining DeFi concepts\n• Navigating the platform\n• Troubleshooting issues\n\nWhat would you like to know?",
      timestamp: new Date(),
      suggestions: [
        "How do I build a transaction?",
        "Find arbitrage opportunities",
        "Explain flash loans",
        "Help with presale"
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const getAIResponse = async (userMessage: string): Promise<string> => {
    const message = userMessage.toLowerCase();

    // Transaction Building
    if (message.includes('transaction') || message.includes('build') || message.includes('create tx')) {
      return `🔧 **Transaction Building Guide**

**Quick Start:**
1. Go to "Transaction Builder" in the sidebar
2. Choose "Simple" or "Advanced" mode
3. Add instructions (Transfer SOL, Mint Tokens, etc.)
4. Set accounts and parameters
5. Simulate first, then sign and send

**Available Instructions:**
• **System Program**: SOL transfers, account creation
• **SPL Token**: Transfers, minting, burning
• **Associated Token**: ATA creation
• **Metaplex**: NFT metadata
• **DeFi Protocols**: Jupiter swaps, flash loans

**Pro Tips:**
• Use "Advanced" mode for complex transactions
• Always simulate before sending
• Check gas fees and priority fees
• Use copy/paste for account addresses

Need help with a specific transaction type?`;
    }

    // Arbitrage
    if (message.includes('arbitrage') || message.includes('arb') || message.includes('profit')) {
      return `📈 **Arbitrage Opportunities**

**Available Tools:**
• **Arbitrage Scanner**: Real-time DEX scanning
• **Cross-Protocol**: Raydium ↔ Orca ↔ Jupiter
• **Triangular**: SOL → USDC → BONK → SOL
• **Flash Loans**: Kamino/Solend for capital

**How to Use:**
1. Go to "Arbitrage Scanner"
2. Click "Start Scanning"
3. Set parameters (min profit, max slippage)
4. Review opportunities
5. Build transaction for execution

**Strategies:**
• **Atomic**: Both trades in one transaction
• **Flash Loan**: Borrow → Trade → Repay → Profit
• **MEV**: Front-run/back-run large trades

**Risk Management:**
• Gas costs eat into profits
• Price slippage
• Network congestion
• Smart contract risks

Want me to help you find specific opportunities?`;
    }

    // DeFi Concepts
    if (message.includes('flash loan') || message.includes('flash')) {
      return `⚡ **Flash Loans Explained**

**What are Flash Loans?**
Unsecured loans that must be borrowed and repaid in the same transaction. Perfect for arbitrage because you only pay if profitable.

**On Solana:**
• **Kamino**: Multi-asset flash loans
• **Solend**: Lending platform integration
• **Port Finance**: Credit delegation

**How They Work:**
1. Borrow assets (no collateral needed)
2. Execute profitable trades
3. Repay loan + fee from profits
4. Keep the difference

**Example Arbitrage:**
```
Borrow 1000 USDC from Kamino
Swap USDC → SOL on Raydium ($X)
Swap SOL → USDC on Orca ($Y)
If Y > X + fees → Profit!
```

**Risks:**
• Must repay in same block
• Network congestion = failed tx
• Smart contract exploits

Need help setting up a flash loan strategy?`;
    }

    // Presale/Token Help
    if (message.includes('presale') || message.includes('token') || message.includes('buy')) {
      return `🪙 **SEAL Token & Presale**

**About SEAL:**
• Native utility token for Sealevel Studio
• Required for premium features
• Governance and staking rewards

**Presale Details:**
• **Price**: 0.00002 SOL per SEAL (50,000 SEAL = 1 SOL)
• **Supply**: 300M SEAL tokens available
• **Bonus Tiers**: 10-30% bonus based on contribution
• **Vesting**: 1 week, 3 weeks, 1 month schedules

**Token Benefits:**
• **Premium Access**: Advanced tools, AI agents
• **Staking Rewards**: 15% APY + platform fees
• **DAO Governance**: Vote on platform decisions
• **Discounted Services**: 25% off all features

**How to Participate:**
1. Go to "SEAL Presale"
2. Connect wallet
3. Choose SOL amount (min 0.1 SOL)
4. Confirm transaction
5. Receive SEAL tokens instantly

**Post-Presale:**
• Staking available for rewards
• Governance voting
• Platform fee sharing

Questions about the tokenomics or presale?`;
    }

    // Navigation Help
    if (message.includes('navigation') || message.includes('find') || message.includes('where') || message.includes('help')) {
      return `🧭 **Platform Navigation Guide**

**Main Sections:**
• **🏠 Landing**: Overview and blockchain selection
• **🔧 Transaction Builder**: Create and simulate transactions
• **📈 Arbitrage Scanner**: Find profitable trade opportunities
• **🤖 AI Cyber Playground**: Advanced AI assistance
• **💰 SEAL Presale**: Token purchase and information

**Tools & Features:**
• **Account Inspector**: Analyze any Solana account
• **R&D Console**: Advanced crypto tools
• **Dev Playground**: Test smart contracts
• **Premium Services**: Advanced features

**Quick Actions:**
• Connect wallet (top right)
• Switch networks (devnet/mainnet)
• Access settings (gear icon)
• View documentation

**Getting Started:**
1. **New Users**: Start with Account Inspector
2. **Traders**: Check Arbitrage Scanner
3. **Developers**: Use Transaction Builder
4. **Investors**: Visit SEAL Presale

What are you trying to accomplish? I can guide you step-by-step!`;
    }

    // Wallet Help
    if (message.includes('wallet') || message.includes('connect') || message.includes('phantom') || message.includes('solflare')) {
      return `👛 **Wallet Connection Guide**

**Supported Wallets:**
• **Phantom**: Most popular Solana wallet
• **Solflare**: Full-featured wallet
• **Solana CLI**: For advanced users

**How to Connect:**
1. Click "Connect Wallet" (top right)
2. Choose your wallet
3. Approve connection in wallet popup
4. Switch to desired network (devnet/mainnet)

**Network Selection:**
• **Mainnet**: Real SOL, live trading
• **Devnet**: Test SOL, safe experimentation
• **Testnet**: Development testing

**Wallet Features:**
• Auto-sign transactions
• Balance display
• Network switching
• Transaction history

**Troubleshooting:**
• **Connection Failed**: Refresh page, try different wallet
• **Wrong Network**: Use network switcher
• **No Balance**: Get devnet SOL from faucet
• **Transaction Failed**: Check gas fees, try again

Need help with a specific wallet issue?`;
    }

    // Default response
    return `🤖 **Sealevel AI Assistant**

I can help you with:
• **Transaction Building**: Create complex Solana transactions
• **Arbitrage Trading**: Find and execute profitable opportunities
• **DeFi Concepts**: Explain flash loans, MEV, staking
• **SEAL Token**: Presale, vesting, benefits
• **Platform Navigation**: Find tools and features
• **Wallet Issues**: Connection and troubleshooting

**Try asking:**
• "How do I build a SOL transfer?"
• "Find arbitrage opportunities"
• "Explain triangular arbitrage"
• "Help with presale"
• "Where is the transaction builder?"

What would you like to explore? 🚀`;
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Get AI response
      const response = await getAIResponse(textToSend);

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        suggestions: textToSend.toLowerCase().includes('help') ? [
          "Build a transaction",
          "Find arbitrage",
          "Explain DeFi",
          "Platform navigation"
        ] : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Response error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble responding right now. Please try again or check your connection.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    handleSendMessage(suggestion);
  };

  if (isMinimized) {
    return null; // Don't render if minimized by parent
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-50 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 group"
          title="AI Assistant"
        >
          <Brain className="w-6 h-6" />
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            ?
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">AI Assistant</h3>
                <p className="text-white/80 text-sm">Sealevel Studio Helper</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleMinimize}
                className="text-white/80 hover:text-white p-1"
                title="Minimize"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white p-1"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-200 border border-gray-700'
                }`}>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                  {message.suggestions && (
                    <div className="mt-3 space-y-2">
                      {message.suggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="block w-full text-left text-xs bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-2 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-gray-400 text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything about Sealevel Studio..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isTyping}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleSendMessage("How do I build a transaction?")}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full transition-colors"
              >
                Transaction Help
              </button>
              <button
                onClick={() => handleSendMessage("Find arbitrage opportunities")}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full transition-colors"
              >
                Arbitrage
              </button>
              <button
                onClick={() => handleSendMessage("Explain flash loans")}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full transition-colors"
              >
                DeFi Help
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
