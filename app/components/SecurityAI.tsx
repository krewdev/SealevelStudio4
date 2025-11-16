'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Play, Pause, RefreshCw, Settings, Lock, X } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SecurityScanner, SecurityReport as SecurityReportType } from '../lib/security/scanner';
import { SecurityAIBot } from './SecurityAIBot';
import { SecurityReport } from './SecurityReport';
import { TruthValidator } from '../lib/ai/truth-validator';
import { AIAccessControl } from '../lib/ai/access-control';

interface SecurityAIProps {
  onBack?: () => void;
}

export function SecurityAI({ onBack }: SecurityAIProps) {
  const { publicKey } = useWallet();
  const [scanner] = useState(() => new SecurityScanner());
  const [validator] = useState(() => new TruthValidator());
  const [accessControl] = useState(() => new AIAccessControl());
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('Ready');
  const [report, setReport] = useState<SecurityReportType | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [scanHistory, setScanHistory] = useState<SecurityReportType[]>([]);
  const [accessError, setAccessError] = useState<string | null>(null);

  const startScan = useCallback(async () => {
    if (isScanning) return;

    // Check access
    if (publicKey) {
      const access = await accessControl.checkAccess(publicKey.toString(), 'securityScan');
      if (!access.allowed) {
        setAccessError(access.reason || 'Access denied');
        return;
      }
    }

    setIsScanning(true);
    setProgress(0);
    setCurrentStatus('Security scan in progress...');
    setReport(null);
    setAccessError(null);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    const statusMessages = [
      'Scanning for trackers...',
      'Analyzing network connections...',
      'Checking certificates...',
      'Detecting watchers...',
      'Validating security...',
      'Generating report...'
    ];

    let statusIndex = 0;
    const statusInterval = setInterval(() => {
      if (statusIndex < statusMessages.length) {
        setCurrentStatus(statusMessages[statusIndex]);
        statusIndex++;
      }
    }, 1000);

    try {
      // Run actual scan
      const scanReport = await scanner.startScan();

      // Validate report with truth validator
      const validation = await validator.validate({
        content: JSON.stringify(scanReport),
        model: 'security-scanner',
        timestamp: new Date()
      });

      if (!validation.isValid) {
        console.warn('Security report validation issues:', validation.issues);
      }

      setProgress(100);
      setCurrentStatus('Scan complete');
      setReport(scanReport);
      setScanHistory(prev => [scanReport, ...prev.slice(0, 9)]); // Keep last 10
      setShowReport(true);

      // Record usage
      if (publicKey) {
        accessControl.recordUsage(publicKey.toString(), 'securityScan');
      }

      clearInterval(progressInterval);
      clearInterval(statusInterval);

      // Auto-hide scanning after 2 seconds
      setTimeout(() => {
        setIsScanning(false);
        setProgress(0);
      }, 2000);
    } catch (error) {
      setCurrentStatus(`Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      clearInterval(progressInterval);
      clearInterval(statusInterval);
      setTimeout(() => {
        setIsScanning(false);
        setProgress(0);
      }, 3000);
    }
  }, [isScanning, scanner, validator]);

  // Subscribe to scan updates
  useEffect(() => {
    const unsubscribe = scanner.onScanUpdate((report) => {
      setReport(report);
    });

    return unsubscribe;
  }, [scanner]);

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
                <span>← Back</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <Shield className="text-blue-400" size={24} />
              <h1 className="text-2xl font-bold">Security AI Scanner</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startScan}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium"
            >
              {isScanning ? (
                <>
                  <Pause size={18} />
                  Scanning...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Start Scan
                </>
              )}
            </button>
            {report && (
              <button
                onClick={() => setShowReport(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                <RefreshCw size={18} />
                View Report
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Advanced AI-powered security scanning for trackers, tracers, watchers, and network threats
        </p>
      </div>

      {/* Access Error */}
      {accessError && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 mx-6 mt-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{accessError}</span>
            <button
              onClick={() => setAccessError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!report ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Shield className="text-blue-400 mb-4" size={64} />
            <h2 className="text-2xl font-bold mb-2">Security AI Scanner</h2>
            <p className="text-gray-400 mb-6 max-w-md">
              Click "Start Scan" to begin comprehensive security analysis. The AI bot will scan for:
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-2xl w-full">
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="font-semibold text-blue-400 mb-2">Trackers</div>
                <div className="text-sm text-gray-400">Analytics, advertising, and tracking scripts</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="font-semibold text-red-400 mb-2">Network Threats</div>
                <div className="text-sm text-gray-400">Suspicious connections and port activity</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="font-semibold text-yellow-400 mb-2">Watchers</div>
                <div className="text-sm text-gray-400">Performance and mutation observers</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="font-semibold text-green-400 mb-2">Certificates</div>
                <div className="text-sm text-gray-400">X.509 certificate validation</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Last Scan Results</h3>
                <div className={`text-2xl font-bold ${
                  report.score >= 80 ? 'text-green-400' :
                  report.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {report.score}/100
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Threats</div>
                  <div className="text-2xl font-bold text-white">{report.threats.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Trackers</div>
                  <div className="text-2xl font-bold text-red-400">{report.trackers.detected}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Certificates</div>
                  <div className="text-2xl font-bold text-green-400">{report.certificates.valid}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Network</div>
                  <div className="text-2xl font-bold text-blue-400">{report.networkInfo.connections.active}</div>
                </div>
              </div>
            </div>

            {scanHistory.length > 1 && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Scan History</h3>
                <div className="space-y-2">
                  {scanHistory.slice(1).map((scan, i) => (
                    <div
                      key={scan.scanId}
                      className="flex items-center justify-between p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
                      onClick={() => {
                        setReport(scan);
                        setShowReport(true);
                      }}
                    >
                      <div>
                        <div className="font-medium">{scan.timestamp.toLocaleString()}</div>
                        <div className="text-sm text-gray-400">
                          {scan.threats.length} threats detected
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${
                        scan.score >= 80 ? 'text-green-400' :
                        scan.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {scan.score}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Animated Security Bot */}
      <SecurityAIBot
        isScanning={isScanning}
        progress={progress}
        currentStatus={currentStatus}
        onComplete={setReport}
      />

      {/* Security Report Modal */}
      {showReport && report && (
        <SecurityReport
          report={report}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

