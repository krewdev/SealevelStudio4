'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  X,
  Save,
  AlertCircle,
  Bell,
  Wallet,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  DollarSign,
  Zap,
  TrendingUp,
  Shield,
  Lock,
  Globe,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Download,
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useNetwork } from '../contexts/NetworkContext';

interface SettingsProps {
  onClose?: () => void;
}

interface TransactionSettings {
  slippageTolerance: number; // Percentage
  priorityFee: number; // In lamports
  jitoTip: number; // In lamports
  autoConfirm: boolean;
}

interface AlertSettings {
  priceAlerts: Array<{
    id: string;
    tokenMint: string;
    tokenSymbol: string;
    condition: 'above' | 'below';
    price: number;
    enabled: boolean;
  }>;
  transactionAlerts: {
    enabled: boolean;
    types: string[]; // ['swap', 'transfer', 'stake', 'unstake', 'launch']
    minAmount: number; // In SOL
  };
}

interface WalletSecurity {
  showPrivateKey: boolean;
  showRecoveryPhrase: boolean;
  requirePassword: boolean;
}

interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  soundEnabled: boolean;
  language: string;
  network: 'devnet' | 'testnet';
}

export function Settings({ onClose }: SettingsProps) {
  const { user } = useUser();
  const { network } = useNetwork();
  const [activeTab, setActiveTab] = useState<'transaction' | 'alerts' | 'wallet' | 'app'>('transaction');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false);
  const [privateKey, setPrivateKey] = useState<string>('');
  const [recoveryPhrase, setRecoveryPhrase] = useState<string>('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Transaction settings
  const [txSettings, setTxSettings] = useState<TransactionSettings>({
    slippageTolerance: 0.5,
    priorityFee: 10000,
    jitoTip: 0,
    autoConfirm: false,
  });

  // Alert settings
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    priceAlerts: [],
    transactionAlerts: {
      enabled: false,
      types: [],
      minAmount: 0.1,
    },
  });

  // App settings
  const [appSettings, setAppSettings] = useState<AppSettings>({
    theme: 'dark',
    notifications: true,
    soundEnabled: true,
    language: 'en',
    network: 'devnet',
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedTxSettings = localStorage.getItem('tx_settings');
    if (savedTxSettings) {
      setTxSettings(JSON.parse(savedTxSettings));
    }

    const savedAlertSettings = localStorage.getItem('alert_settings');
    if (savedAlertSettings) {
      setAlertSettings(JSON.parse(savedAlertSettings));
    }

    const savedAppSettings = localStorage.getItem('app_settings');
    if (savedAppSettings) {
      setAppSettings(JSON.parse(savedAppSettings));
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('tx_settings', JSON.stringify(txSettings));
    localStorage.setItem('alert_settings', JSON.stringify(alertSettings));
    localStorage.setItem('app_settings', JSON.stringify(appSettings));
    setCopied('settings');
    setTimeout(() => setCopied(null), 2000);
  };

  const fetchWalletKeys = async () => {
    if (!user?.walletId) {
      alert('No wallet found. Please create a wallet first.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/wallet/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: user.walletId, password }),
      });

      const data = await response.json();
      
      if (!data.success) {
        alert(data.error || 'Failed to export wallet');
        return;
      }

      if (data.privateKey) {
        setPrivateKey(data.privateKey);
      }
      if (data.recoveryPhrase) {
        setRecoveryPhrase(data.recoveryPhrase);
      }
    } catch (error) {
      console.error('Failed to fetch wallet keys:', error);
      alert('Failed to export wallet. Please try again.');
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const addPriceAlert = () => {
    const newAlert = {
      id: Date.now().toString(),
      tokenMint: '',
      tokenSymbol: '',
      condition: 'above' as const,
      price: 0,
      enabled: true,
    };
    setAlertSettings({
      ...alertSettings,
      priceAlerts: [...alertSettings.priceAlerts, newAlert],
    });
  };

  const removePriceAlert = (id: string) => {
    setAlertSettings({
      ...alertSettings,
      priceAlerts: alertSettings.priceAlerts.filter(a => a.id !== id),
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-900/50">
          {[
            { id: 'transaction', label: 'Transaction', icon: Zap },
            { id: 'alerts', label: 'Alerts', icon: Bell },
            { id: 'wallet', label: 'Wallet Security', icon: Wallet },
            { id: 'app', label: 'App Settings', icon: Globe },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === id
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Transaction Settings */}
          {activeTab === 'transaction' && (
            <div className="space-y-6">
              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                  Transaction Settings
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Slippage Tolerance (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      value={txSettings.slippageTolerance}
                      onChange={(e) => setTxSettings({
                        ...txSettings,
                        slippageTolerance: parseFloat(e.target.value) || 0,
                      })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended: 0.5% for stablecoins, 1-3% for volatile tokens
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Priority Fee (Lamports)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={txSettings.priorityFee}
                      onChange={(e) => setTxSettings({
                        ...txSettings,
                        priorityFee: parseInt(e.target.value) || 0,
                      })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Higher fees = faster confirmation. Default: 10,000 lamports
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Jito Tip (Lamports)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={txSettings.jitoTip}
                      onChange={(e) => setTxSettings({
                        ...txSettings,
                        jitoTip: parseInt(e.target.value) || 0,
                      })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Optional tip for Jito validators (MEV protection)
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="autoConfirm"
                      checked={txSettings.autoConfirm}
                      onChange={(e) => setTxSettings({
                        ...txSettings,
                        autoConfirm: e.target.checked,
                      })}
                      className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor="autoConfirm" className="text-sm text-gray-300">
                      Auto-confirm transactions (not recommended for large amounts)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alerts Settings */}
          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-400" />
                  Price Alerts
                </h3>
                
                <div className="space-y-3">
                  {alertSettings.priceAlerts.map((alert) => (
                    <div key={alert.id} className="bg-gray-800 rounded-lg p-4 flex items-center gap-4">
                      <input
                        type="text"
                        placeholder="Token Symbol"
                        value={alert.tokenSymbol}
                        onChange={(e) => {
                          const updated = alertSettings.priceAlerts.map(a =>
                            a.id === alert.id ? { ...a, tokenSymbol: e.target.value } : a
                          );
                          setAlertSettings({ ...alertSettings, priceAlerts: updated });
                        }}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                      />
                      <select
                        value={alert.condition}
                        onChange={(e) => {
                          const updated = alertSettings.priceAlerts.map(a =>
                            a.id === alert.id ? { ...a, condition: e.target.value as any } : a
                          );
                          setAlertSettings({ ...alertSettings, priceAlerts: updated });
                        }}
                        className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                      >
                        <option value="above">Above</option>
                        <option value="below">Below</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Price"
                        value={alert.price || ''}
                        onChange={(e) => {
                          const updated = alertSettings.priceAlerts.map(a =>
                            a.id === alert.id ? { ...a, price: parseFloat(e.target.value) || 0 } : a
                          );
                          setAlertSettings({ ...alertSettings, priceAlerts: updated });
                        }}
                        className="w-32 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                      />
                      <button
                        onClick={() => removePriceAlert(alert.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addPriceAlert}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
                  >
                    + Add Price Alert
                  </button>
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-400" />
                  Transaction Alerts
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="txAlertsEnabled"
                      checked={alertSettings.transactionAlerts.enabled}
                      onChange={(e) => setAlertSettings({
                        ...alertSettings,
                        transactionAlerts: {
                          ...alertSettings.transactionAlerts,
                          enabled: e.target.checked,
                        },
                      })}
                      className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-purple-600"
                    />
                    <label htmlFor="txAlertsEnabled" className="text-sm text-gray-300">
                      Enable transaction alerts
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Alert on Transaction Types
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['swap', 'transfer', 'stake', 'unstake', 'launch'].map((type) => (
                        <label key={type} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={alertSettings.transactionAlerts.types.includes(type)}
                            onChange={(e) => {
                              const types = e.target.checked
                                ? [...alertSettings.transactionAlerts.types, type]
                                : alertSettings.transactionAlerts.types.filter(t => t !== type);
                              setAlertSettings({
                                ...alertSettings,
                                transactionAlerts: { ...alertSettings.transactionAlerts, types },
                              });
                            }}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600"
                          />
                          <span className="text-sm text-gray-300 capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Minimum Amount (SOL) to Alert
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={alertSettings.transactionAlerts.minAmount}
                      onChange={(e) => setAlertSettings({
                        ...alertSettings,
                        transactionAlerts: {
                          ...alertSettings.transactionAlerts,
                          minAmount: parseFloat(e.target.value) || 0,
                        },
                      })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wallet Security */}
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              <div className="bg-red-900/20 border-2 border-red-500/50 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Security Warning</h3>
                    <p className="text-sm text-gray-300">
                      Never share your private key or recovery phrase with anyone. Anyone with access to these can control your wallet and steal your funds.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5 text-yellow-400" />
                  Export Private Key
                </h3>
                
                {!showPrivateKey ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Enter Password to Reveal Private Key
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <button
                      onClick={fetchWalletKeys}
                      disabled={loading || !password}
                      className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium"
                    >
                      {loading ? 'Loading...' : 'Reveal Private Key'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Private Key</span>
                        <button
                          onClick={() => copyToClipboard(privateKey, 'privateKey')}
                          className="text-gray-400 hover:text-white"
                        >
                          {copied === 'privateKey' ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs font-mono text-white break-all">{privateKey}</p>
                    </div>
                    <button
                      onClick={() => setShowPrivateKey(false)}
                      className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                    >
                      Hide Private Key
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-green-400" />
                  Recovery Phrase
                </h3>
                
                {!showRecoveryPhrase ? (
                  <div className="space-y-4">
                    {/* Disclaimer */}
                    <div className="p-4 bg-red-900/20 border-2 border-red-500/50 rounded-xl mb-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="text-left">
                          <h4 className="text-red-400 font-semibold mb-2 text-sm">⚠️ Security Warning</h4>
                          <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                            <li>Never share your recovery phrase with anyone</li>
                            <li>Anyone with your recovery phrase can access your wallet</li>
                            <li>Store it in a secure location offline</li>
                            <li>If you lose it, you cannot recover your wallet</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Enter Password to Reveal Recovery Phrase
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <button
                      onClick={fetchWalletKeys}
                      disabled={loading || !password}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium"
                    >
                      {loading ? 'Loading...' : 'I Understand - Reveal Recovery Phrase'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Warning */}
                    <div className="p-4 bg-red-900/20 border-2 border-red-500/50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="text-left">
                          <h4 className="text-red-400 font-semibold mb-2 text-sm">⚠️ Keep This Secret</h4>
                          <p className="text-xs text-gray-300">
                            Write down these words in order and store them securely. Never share this phrase with anyone.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-400">Recovery Phrase (12 words)</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(recoveryPhrase, 'recoveryPhrase')}
                            className="text-gray-400 hover:text-white p-1"
                            title="Copy"
                          >
                            {copied === 'recoveryPhrase' ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              const blob = new Blob([recoveryPhrase], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `wallet-recovery-phrase-${Date.now()}.txt`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }}
                            className="text-gray-400 hover:text-white p-1"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {recoveryPhrase.split(' ').map((word, index) => (
                          <div
                            key={index}
                            className="bg-gray-900/50 border border-gray-700 rounded p-2 text-center"
                          >
                            <span className="text-xs text-gray-500 mr-1">{index + 1}.</span>
                            <span className="text-sm text-white font-semibold">{word}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowRecoveryPhrase(false)}
                      className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                    >
                      Hide Recovery Phrase
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* App Settings */}
          {activeTab === 'app' && (
            <div className="space-y-6">
              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Appearance</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Theme</label>
                    <select
                      value={appSettings.theme}
                      onChange={(e) => setAppSettings({ ...appSettings, theme: e.target.value as any })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Enable Notifications</span>
                    <input
                      type="checkbox"
                      checked={appSettings.notifications}
                      onChange={(e) => setAppSettings({ ...appSettings, notifications: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-purple-600"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Sound Effects</span>
                    <input
                      type="checkbox"
                      checked={appSettings.soundEnabled}
                      onChange={(e) => setAppSettings({ ...appSettings, soundEnabled: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-purple-600"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Network</h3>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Default Network</label>
                  <select
                    value={appSettings.network}
                    onChange={(e) => setAppSettings({ ...appSettings, network: e.target.value as any })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="devnet">Devnet</option>
                    <option value="testnet">Testnet</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={saveSettings}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {copied === 'settings' ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

