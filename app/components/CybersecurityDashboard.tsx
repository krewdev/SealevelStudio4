'use client';

import React, { useState } from 'react';
import { 
  Shield, 
  Search, 
  Bug, 
  Code, 
  Activity,
  AlertTriangle,
  CheckCircle,
  X,
  ArrowLeft,
  FileText,
  Terminal,
  Network,
  Lock,
  Eye,
  Zap,
  BarChart3,
  Settings
} from 'lucide-react';
import { CybersecurityFinder } from './CybersecurityFinder';
import { SecurityAI } from './SecurityAI';
import { useWallet } from '@solana/wallet-adapter-react';

interface CybersecurityDashboardProps {
  onBack?: () => void;
}

export function CybersecurityDashboard({ onBack }: CybersecurityDashboardProps) {
  const { publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<'overview' | 'code-analyzer' | 'security-scanner' | 'reports'>('overview');
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);

  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: <BarChart3 size={18} /> },
    { id: 'code-analyzer', label: 'Code Analyzer', icon: <Code size={18} /> },
    { id: 'security-scanner', label: 'Security Scanner', icon: <Shield size={18} /> },
    { id: 'reports', label: 'Reports', icon: <FileText size={18} /> },
  ];

  const stats = {
    totalScans: scanHistory.length,
    totalAnalyses: analysisHistory.length,
    threatsDetected: 0,
    vulnerabilitiesFound: 0,
    lastScan: scanHistory[0]?.timestamp || null,
    lastAnalysis: analysisHistory[0]?.timestamp || null,
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 p-4 bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <Shield className="text-blue-400" size={24} />
              <h1 className="text-2xl font-bold">Cybersecurity Dashboard</h1>
            </div>
          </div>
          {publicKey && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-700/50 rounded-lg">
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-sm text-green-400">Wallet Connected</span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Comprehensive security analysis and vulnerability detection tools
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 bg-gray-800/50">
        <div className="flex gap-1 px-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400 bg-gray-800'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'overview' && (
          <div className="h-full overflow-y-auto custom-scrollbar p-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Total Scans</span>
                  <Shield size={20} className="text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalScans}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.lastScan ? `Last: ${new Date(stats.lastScan).toLocaleDateString()}` : 'No scans yet'}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Code Analyses</span>
                  <Code size={20} className="text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalAnalyses}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.lastAnalysis ? `Last: ${new Date(stats.lastAnalysis).toLocaleDateString()}` : 'No analyses yet'}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Threats Detected</span>
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <div className="text-2xl font-bold text-red-400">{stats.threatsDetected}</div>
                <div className="text-xs text-gray-500 mt-1">Across all scans</div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Vulnerabilities</span>
                  <Bug size={20} className="text-orange-400" />
                </div>
                <div className="text-2xl font-bold text-orange-400">{stats.vulnerabilitiesFound}</div>
                <div className="text-xs text-gray-500 mt-1">In code analyses</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Code size={24} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Code Analyzer</h3>
                    <p className="text-sm text-gray-400">AI-powered vulnerability detection</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300 mb-4">
                  Analyze code for security vulnerabilities using Blue Team, Red Team, and Secure Coder AI personas.
                  Detects SQL injection, XSS, CSRF, and other common vulnerabilities.
                </p>
                <button
                  onClick={() => setActiveTab('code-analyzer')}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  Open Code Analyzer
                </button>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <Shield size={24} className="text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Security Scanner</h3>
                    <p className="text-sm text-gray-400">Real-time threat detection</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300 mb-4">
                  Scan for trackers, tracers, watchers, network threats, and certificate issues.
                  Get detailed security reports with recommendations.
                </p>
                <button
                  onClick={() => setActiveTab('security-scanner')}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
                >
                  Start Security Scan
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">Security Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Search size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Vulnerability Detection</h4>
                    <p className="text-sm text-gray-400">
                      AI-powered analysis of code for common security issues
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <Network size={20} className="text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Network Monitoring</h4>
                    <p className="text-sm text-gray-400">
                      Real-time detection of suspicious network activity
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Eye size={20} className="text-yellow-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Tracker Detection</h4>
                    <p className="text-sm text-gray-400">
                      Identify and block tracking scripts and analytics
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Lock size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Certificate Validation</h4>
                    <p className="text-sm text-gray-400">
                      X.509 certificate verification and validation
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Terminal size={20} className="text-orange-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Shell Environment</h4>
                    <p className="text-sm text-gray-400">
                      Sandboxed shell for safe penetration testing
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-teal-500/20 rounded-lg">
                    <FileText size={20} className="text-teal-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Security Reports</h4>
                    <p className="text-sm text-gray-400">
                      Detailed reports with actionable recommendations
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {(scanHistory.length > 0 || analysisHistory.length > 0) && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mt-6">
                <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
                <div className="space-y-2">
                  {scanHistory.slice(0, 5).map((scan, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield size={16} className="text-green-400" />
                        <div>
                          <div className="text-sm font-medium text-white">Security Scan</div>
                          <div className="text-xs text-gray-400">
                            {new Date(scan.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        {scan.threats?.length || 0} threats
                      </div>
                    </div>
                  ))}
                  {analysisHistory.slice(0, 5).map((analysis, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Code size={16} className="text-purple-400" />
                        <div>
                          <div className="text-sm font-medium text-white">Code Analysis</div>
                          <div className="text-xs text-gray-400">
                            {new Date(analysis.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        {analysis.type}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'code-analyzer' && (
          <div className="h-full">
            <CybersecurityFinder onBack={() => setActiveTab('overview')} />
          </div>
        )}

        {activeTab === 'security-scanner' && (
          <div className="h-full">
            <SecurityAI onBack={() => setActiveTab('overview')} />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="h-full overflow-y-auto custom-scrollbar p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Security Reports</h2>
              
              {scanHistory.length === 0 && analysisHistory.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={64} className="text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No reports yet</p>
                  <p className="text-sm text-gray-500">
                    Run a security scan or code analysis to generate reports
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scanHistory.map((scan, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">Security Scan Report</h3>
                          <p className="text-sm text-gray-400">
                            {new Date(scan.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          scan.score >= 80 ? 'bg-green-900/50 text-green-400' :
                          scan.score >= 60 ? 'bg-yellow-900/50 text-yellow-400' :
                          'bg-red-900/50 text-red-400'
                        }`}>
                          Score: {scan.score}/100
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-400">Threats</div>
                          <div className="text-xl font-bold text-red-400">
                            {scan.threats?.length || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Trackers</div>
                          <div className="text-xl font-bold text-orange-400">
                            {scan.trackers?.detected || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Certificates</div>
                          <div className="text-xl font-bold text-green-400">
                            {scan.certificates?.valid || 0}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {/* View full report */}}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        View Full Report →
                      </button>
                    </div>
                  ))}

                  {analysisHistory.map((analysis, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">Code Analysis Report</h3>
                          <p className="text-sm text-gray-400">
                            {new Date(analysis.timestamp).toLocaleString()} • {analysis.type}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-300 whitespace-pre-wrap">
                        {analysis.content?.substring(0, 200)}...
                      </div>
                      <button
                        onClick={() => {/* View full analysis */}}
                        className="text-sm text-blue-400 hover:text-blue-300 mt-2"
                      >
                        View Full Analysis →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

