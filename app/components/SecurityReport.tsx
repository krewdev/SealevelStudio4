'use client';

import React from 'react';
import { Shield, AlertTriangle, CheckCircle, X, Download, Network, Lock, Eye } from 'lucide-react';
import { SecurityReport as SecurityReportType } from '../lib/security/scanner';

interface SecurityReportProps {
  report: SecurityReportType;
  onClose?: () => void;
}

export function SecurityReport({ report, onClose }: SecurityReportProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-900/20 border-red-500';
      case 'high': return 'text-orange-400 bg-orange-900/20 border-orange-500';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500';
      case 'low': return 'text-blue-400 bg-blue-900/20 border-blue-500';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const exportReport = () => {
    const reportText = JSON.stringify(report, null, 2);
    const blob = new Blob([reportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${report.scanId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-3">
            <Shield className="text-blue-400" size={24} />
            <div>
              <h2 className="text-2xl font-bold text-white">Security Scan Report</h2>
              <p className="text-sm text-gray-400">
                {report.timestamp.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportReport}
              className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              title="Export Report"
            >
              <Download size={18} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Security Score */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Security Score</h3>
              <div className={`text-4xl font-bold ${getScoreColor(report.score)}`}>
                {report.score}/100
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  report.score >= 80 ? 'bg-green-500' :
                  report.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${report.score}%` }}
              />
            </div>
          </div>

          {/* Threats Summary */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="text-red-400" size={20} />
              Detected Threats ({report.threats.length})
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {report.threats.length === 0 ? (
                <div className="text-green-400 flex items-center gap-2">
                  <CheckCircle size={16} />
                  No threats detected
                </div>
              ) : (
                report.threats.map((threat) => (
                  <div
                    key={threat.id}
                    className={`p-4 rounded-lg border ${getSeverityColor(threat.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold mb-1">{threat.name}</div>
                        <div className="text-sm opacity-90">{threat.description}</div>
                        <div className="text-xs mt-2 opacity-75">
                          Source: {threat.source}
                        </div>
                        {threat.details && (
                          <div className="text-xs mt-2 opacity-60 font-mono">
                            {JSON.stringify(threat.details, null, 2)}
                          </div>
                        )}
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-black/30">
                        {threat.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Network Information */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Network className="text-blue-400" size={20} />
              Network Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Active Connections</div>
                <div className="text-2xl font-bold text-white">
                  {report.networkInfo.connections.active}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Established</div>
                <div className="text-2xl font-bold text-white">
                  {report.networkInfo.connections.established}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Listening</div>
                <div className="text-2xl font-bold text-white">
                  {report.networkInfo.connections.listening}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">DNS Queries</div>
                <div className="text-2xl font-bold text-white">
                  {report.networkInfo.dns.queries}
                </div>
              </div>
            </div>
            {report.networkInfo.ports.open.length > 0 && (
              <div className="mt-4">
                <div className="text-sm text-gray-400 mb-2">Open Ports</div>
                <div className="flex flex-wrap gap-2">
                  {report.networkInfo.ports.open.map(port => (
                    <span key={port} className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs">
                      {port}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Trackers */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Eye className="text-purple-400" size={20} />
              Tracking Detection
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Detected</div>
                <div className="text-2xl font-bold text-red-400">
                  {report.trackers.detected}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Blocked</div>
                <div className="text-2xl font-bold text-green-400">
                  {report.trackers.blocked}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Categories</div>
                <div className="text-2xl font-bold text-white">
                  {Object.keys(report.trackers.categories).length}
                </div>
              </div>
            </div>
            {Object.keys(report.trackers.categories).length > 0 && (
              <div>
                <div className="text-sm text-gray-400 mb-2">Tracker Categories</div>
                <div className="space-y-1">
                  {Object.entries(report.trackers.categories).map(([category, count]) => (
                    <div key={category} className="flex justify-between text-sm">
                      <span className="text-gray-300">{category}</span>
                      <span className="text-red-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Certificates */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="text-green-400" size={20} />
              Certificate Status
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Valid</div>
                <div className="text-2xl font-bold text-green-400">
                  {report.certificates.valid}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Invalid</div>
                <div className="text-2xl font-bold text-red-400">
                  {report.certificates.invalid}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Expired</div>
                <div className="text-2xl font-bold text-orange-400">
                  {report.certificates.expired}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Self-Signed</div>
                <div className="text-2xl font-bold text-yellow-400">
                  {report.certificates.selfSigned}
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Recommendations</h3>
              <ul className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

