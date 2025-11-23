import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Zap, 
  TrendingUp, 
  Hammer, 
  Megaphone, 
  AlertTriangle,
  Play,
  Pause,
  StopCircle,
  Clock,
  DollarSign,
  Twitter,
  Send,
  Loader2
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';

// Campaign Moods/Classes
type Mood = 'fomo' | 'fear' | 'greed' | 'build' | 'promote';

const MOODS: { id: Mood; label: string; icon: any; color: string; desc: string }[] = [
  { id: 'fomo', label: 'FOMO', icon: Zap, color: 'text-yellow-400', desc: 'Create urgency and excitement' },
  { id: 'greed', label: 'Greed', icon: TrendingUp, color: 'text-green-400', desc: 'Highlight gains and potential' },
  { id: 'fear', label: 'Fear', icon: AlertTriangle, color: 'text-red-400', desc: 'Warning: Dont miss out!' },
  { id: 'build', label: 'Build', icon: Hammer, color: 'text-blue-400', desc: 'Technical updates and progress' },
  { id: 'promote', label: 'Promote', icon: Megaphone, color: 'text-purple-400', desc: 'General awareness and community' },
];

interface MarketingBotProps {
  tokenSymbol?: string;
  tokenName?: string;
}

export function MarketingBot({ tokenSymbol = 'TOKEN', tokenName = 'My Token' }: MarketingBotProps) {
  const { user, updateCredits } = useUser();
  const [selectedMood, setSelectedMood] = useState<Mood>('promote');
  const [isRunning, setIsRunning] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [messageHistory, setMessageHistory] = useState<string[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [frequency, setFrequency] = useState(5); // Minutes between posts
  
  // Platform status
  const [twitterReady, setTwitterReady] = useState(false);
  const [telegramReady, setTelegramReady] = useState(false);
  const [telegramChatIds, setTelegramChatIds] = useState<string[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Fee per post (in credits)
  const COST_PER_POST = 10;

  // Check platform status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setIsLoadingStatus(true);
      try {
        // Check Twitter
        const twitterRes = await fetch('/api/twitter/auth/status');
        if (twitterRes.ok) {
          const data = await twitterRes.json();
          setTwitterReady(data.authenticated);
        }

        // Check Telegram (and get chat IDs)
        const telegramRes = await fetch('/api/telegram/auth');
        if (telegramRes.ok) {
          const authData = await telegramRes.json();
          if (authData.authenticated && authData.bot?.id) {
            // Fetch agent config to get chat IDs
            const agentRes = await fetch(`/api/telegram/agent?botId=${authData.bot.id}`);
            if (agentRes.ok) {
              const agentData = await agentRes.json();
              if (agentData.chatIds && agentData.chatIds.length > 0) {
                setTelegramChatIds(agentData.chatIds);
                setTelegramReady(true);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to check platform status:', error);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    if (user) {
      checkStatus();
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning) {
      // Initial post
      generateAndPost();

      // Schedule subsequent posts
      interval = setInterval(() => {
        generateAndPost();
      }, frequency * 60 * 1000); // Convert minutes to ms
    }

    return () => clearInterval(interval);
  }, [isRunning, frequency]);

  const generateAndPost = async () => {
    if (!user || user.credits < COST_PER_POST) {
      setIsRunning(false);
      alert("Insufficient credits! Please top up to continue campaign.");
      return;
    }

    if (!twitterReady && !telegramReady) {
      setIsRunning(false);
      alert("No platforms configured! Please connect Twitter or Telegram first.");
      return;
    }

    // Deduct credits
    updateCredits(-COST_PER_POST);

    // Call AI to generate message
    try {
      const response = await fetch('/api/ai/marketing-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenSymbol,
          tokenName,
          mood: selectedMood
        })
      });

      const data = await response.json();
      if (data.success && data.message) {
        const msg = data.message;
        setGeneratedMessage(msg);
        
        // Post to Platforms
        const results = [];
        
        if (twitterReady) {
          try {
            await fetch('/api/twitter/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: msg })
            });
            results.push('Twitter');
          } catch (e) {
            console.error('Twitter post failed:', e);
          }
        }

        if (telegramReady && telegramChatIds.length > 0) {
          try {
            // Post to first configured chat ID for now (or all)
            for (const chatId of telegramChatIds) {
              if (!chatId) continue;
              await fetch('/api/telegram/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: msg, chatId })
              });
            }
            results.push('Telegram');
          } catch (e) {
            console.error('Telegram post failed:', e);
          }
        }

        if (results.length > 0) {
          const historyMsg = `[${results.join(', ')}] ${msg}`;
          setMessageHistory(prev => [historyMsg, ...prev].slice(0, 10));
          setPostCount(prev => prev + 1);
        } else {
          setMessageHistory(prev => [`[FAILED] ${msg}`, ...prev].slice(0, 10));
        }
      }
    } catch (error) {
      console.error("Failed to generate marketing message:", error);
      setIsRunning(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center bg-gray-800/50 rounded-2xl border border-gray-700">
        <p className="text-gray-400">Please connect wallet to use the Marketing Bot</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-700 bg-gray-900/30 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <MessageSquare className="w-6 h-6 text-purple-400" />
            <span>AI Marketing Bot</span>
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Automated social media campaign manager
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-white font-mono">{user.credits} Credits</span>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Platform Status */}
        <div className="flex space-x-4 bg-gray-900/50 p-4 rounded-xl border border-gray-700">
          <div className={`flex items-center space-x-2 ${twitterReady ? 'text-blue-400' : 'text-gray-500'}`}>
            <Twitter className="w-5 h-5" />
            <span className="text-sm font-medium">{twitterReady ? 'Twitter Ready' : 'Twitter Not Connected'}</span>
          </div>
          <div className="w-px bg-gray-700 h-5 self-center" />
          <div className={`flex items-center space-x-2 ${telegramReady ? 'text-blue-400' : 'text-gray-500'}`}>
            <Send className="w-5 h-5" />
            <span className="text-sm font-medium">{telegramReady ? 'Telegram Ready' : 'Telegram Not Configured'}</span>
          </div>
          {isLoadingStatus && <Loader2 className="w-4 h-4 animate-spin text-gray-500 self-center ml-auto" />}
        </div>

        {/* Mood Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-3">Select Campaign Mode</label>
          <div className="grid grid-cols-5 gap-2">
            {MOODS.map((mood) => (
              <button
                key={mood.id}
                onClick={() => setSelectedMood(mood.id)}
                className={`
                  flex flex-col items-center p-3 rounded-xl border transition-all
                  ${selectedMood === mood.id 
                    ? 'bg-purple-900/20 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                  }
                `}
              >
                <mood.icon className={`w-6 h-6 mb-2 ${mood.color}`} />
                <span className={`text-xs font-medium ${selectedMood === mood.id ? 'text-white' : 'text-gray-400'}`}>
                  {mood.label}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-gray-500 mt-2">
            {MOODS.find(m => m.id === selectedMood)?.desc}
          </p>
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Post Frequency</label>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <select 
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm flex-1 focus:ring-2 focus:ring-purple-500"
              >
                <option value={1}>Every 1 minute (Aggressive)</option>
                <option value={5}>Every 5 minutes (High)</option>
                <option value={15}>Every 15 minutes (Moderate)</option>
                <option value={60}>Every hour (Steady)</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Est. Cost</label>
            <div className="flex items-center space-x-2 text-gray-300 text-sm p-2 bg-gray-900/50 rounded-lg border border-gray-700">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span>{(60 / frequency) * COST_PER_POST} credits / hour</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {isRunning ? (
              <span className="text-green-400 flex items-center animate-pulse">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                Campaign Active • {postCount} posts sent
              </span>
            ) : (
              <span>Ready to launch campaign</span>
            )}
          </div>

          {isRunning ? (
            <button
              onClick={() => setIsRunning(false)}
              className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
            >
              <StopCircle className="w-5 h-5" />
              <span>Stop Campaign</span>
            </button>
          ) : (
            <button
              onClick={() => setIsRunning(true)}
              disabled={!twitterReady && !telegramReady}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-bold transition-colors"
            >
              <Play className="w-5 h-5" />
              <span>Start Auto-Post</span>
            </button>
          )}
        </div>

        {/* Warning if social not linked */}
        {(!twitterReady && !telegramReady && !isLoadingStatus) && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
            <p className="text-xs text-yellow-200">
              Please configure Twitter or Telegram bots from the sidebar before starting the campaign.
            </p>
          </div>
        )}

        {/* Live Feed */}
        <div className="bg-black/30 rounded-xl p-4 min-h-[150px] border border-gray-700/50">
          <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Live Activity Feed</h4>
          <div className="space-y-2">
            {messageHistory.length === 0 ? (
              <p className="text-sm text-gray-600 italic text-center py-4">Waiting for campaign start...</p>
            ) : (
              messageHistory.map((msg, i) => (
                <div key={i} className="text-sm text-gray-300 border-l-2 border-purple-500 pl-3 py-1 animate-in fade-in slide-in-from-left-2">
                  {msg}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
