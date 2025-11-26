import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { Twitter, Send, ChevronDown, Check, X } from 'lucide-react';

export function SocialConnectButton() {
  const { user, linkTwitter, linkTelegram } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isLinkingTwitter, setIsLinkingTwitter] = useState(false);
  const [isLinkingTelegram, setIsLinkingTelegram] = useState(false);

  if (!user) return null;

  const twitterConnected = user.isTwitterLinked;
  const telegramConnected = user.isTelegramLinked;
  const allConnected = twitterConnected && telegramConnected;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          allConnected
            ? 'bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30'
            : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
        }`}
      >
        <div className="flex items-center space-x-1">
          {twitterConnected && telegramConnected ? (
            <Check className="w-4 h-4" />
          ) : (
            <Twitter className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Connect Social</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
            <div className="p-2">
              {/* Twitter */}
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${twitterConnected ? 'bg-blue-600/20' : 'bg-gray-700'}`}>
                    <Twitter className={`w-5 h-5 ${twitterConnected ? 'text-blue-400' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Twitter</div>
                    <div className="text-xs text-gray-400">
                      {twitterConnected ? user.twitterHandle || 'Connected' : 'Not connected'}
                    </div>
                  </div>
                </div>
                {twitterConnected ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <button
                    onClick={async () => {
                      setIsLinkingTwitter(true);
                      try {
                        await linkTwitter();
                        setIsOpen(false);
                      } catch (error) {
                        console.error('Failed to connect Twitter:', error);
                      } finally {
                        setIsLinkingTwitter(false);
                      }
                    }}
                    disabled={isLinkingTwitter}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs rounded-md transition-colors border border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLinkingTwitter ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>

              {/* Telegram */}
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${telegramConnected ? 'bg-blue-500/20' : 'bg-gray-700'}`}>
                    <Send className={`w-5 h-5 ${telegramConnected ? 'text-blue-400' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Telegram</div>
                    <div className="text-xs text-gray-400">
                      {telegramConnected ? user.telegramHandle || 'Connected' : 'Not connected'}
                    </div>
                  </div>
                </div>
                {telegramConnected ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <button
                    onClick={async () => {
                      setIsLinkingTelegram(true);
                      try {
                        await linkTelegram();
                        setIsOpen(false);
                      } catch (error) {
                        console.error('Failed to connect Telegram:', error);
                      } finally {
                        setIsLinkingTelegram(false);
                      }
                    }}
                    disabled={isLinkingTelegram}
                    className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs rounded-md transition-colors border border-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLinkingTelegram ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


