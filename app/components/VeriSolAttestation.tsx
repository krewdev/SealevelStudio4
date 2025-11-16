// VeriSol Attestation Component
// Allows users to create a beta tester attestation that will be minted as a cNFT
// Uses zk proofs to verify credentials privately

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Connection } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  Shield,
  CheckCircle,
  AlertCircle,
  Loader,
  ExternalLink,
  Copy,
  Sparkles,
  Settings,
} from 'lucide-react';
import {
  mintVeriSolAttestation,
  checkVeriSolSetup,
  serializeProofForSolana,
} from '../lib/verisol';
import {
  generateBetaTesterAttestationProof,
  verifyUsageRequirements,
  generateUsageProof,
} from '../lib/verisol/beta-tester-proof';
import { useUsageTracking } from '../hooks/useUsageTracking';

interface VeriSolAttestationProps {
  connection: Connection;
}

export function VeriSolAttestation({ connection }: VeriSolAttestationProps) {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const { getStats, getTrialStatus } = useUsageTracking();
  const [isCreating, setIsCreating] = useState(false);
  const [attestationSignature, setAttestationSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cNFTAddress, setCNFTAddress] = useState<string | null>(null);
  const [setupStatus, setSetupStatus] = useState<{
    ready: boolean;
    errors: string[];
  } | null>(null);
  const [isCheckingSetup, setIsCheckingSetup] = useState(false);
  const [usageStats, setUsageStats] = useState<{
    totalUsage: number;
    meetsRequirement: boolean;
    minRequired: number;
  } | null>(null);

  // Check VeriSol setup and usage stats on mount
  useEffect(() => {
    checkSetup();
    checkUsageStats();
  }, [connection, publicKey]);

  const checkUsageStats = useCallback(() => {
    if (!publicKey) return;
    
    const stats = getStats();
    if (!stats) {
      setUsageStats({
        totalUsage: 0,
        meetsRequirement: false,
        minRequired: 10,
      });
      return;
    }
    
    const minRequired = 10; // Minimum 10 feature uses to qualify as beta tester
    // Calculate total usage from features object
    const totalUsage = Object.values(stats.features).reduce((sum, count) => sum + count, 0);
    
    setUsageStats({
      totalUsage,
      meetsRequirement: totalUsage >= minRequired,
      minRequired,
    });
  }, [publicKey, getStats]);

  const checkSetup = useCallback(async () => {
    setIsCheckingSetup(true);
    try {
      const status = await checkVeriSolSetup(connection);
      setSetupStatus(status);
    } catch (err) {
      console.error('Error checking setup:', err);
      setSetupStatus({
        ready: false,
        errors: [err instanceof Error ? err.message : 'Unknown error'],
      });
    } finally {
      setIsCheckingSetup(false);
    }
  }, [connection]);

  const handleCreateAttestation = useCallback(async () => {
    if (!publicKey || !wallet) {
      setError('Please connect your wallet');
      return;
    }

    // 1. Verify usage requirements first
    const stats = getStats();
    if (!stats) {
      setError('Unable to retrieve usage statistics. Please try again.');
      return;
    }
    
    const minRequired = 10;
    // Calculate total usage from features object
    const featuresTotal = Object.values(stats.features).reduce((sum, count) => sum + count, 0);
    
    const usageCheck = verifyUsageRequirements(featuresTotal, minRequired);
    if (!usageCheck.valid) {
      setError(usageCheck.reason || 'Insufficient usage to qualify as beta tester');
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(false);
    setAttestationSignature(null);
    setCNFTAddress(null);

    try {
      // 2. Generate usage proof from actual usage data
      // Calculate total usage from features object
      const featuresTotal = Object.values(stats.features).reduce((sum, count) => sum + count, 0);
      const usageProof = generateUsageProof({
        totalUsage: featuresTotal,
        featuresUsed: stats.features,
        walletAddress: publicKey.toString(),
        timestamp: Date.now(),
      });

      // 3. Generate ZK proof for beta tester credential with usage verification
      setError(null); // Clear previous errors
      
      const proofInput = {
        walletAddress: publicKey.toString(),
        actualUsage: featuresTotal,
        minUsageThreshold: minRequired,
        usageProof,
      };

      const { proof, publicSignals } = await generateBetaTesterAttestationProof(proofInput);

      // 4. Serialize proof for Solana
      const { proofBytes, publicInputBytes } = serializeProofForSolana(proof, publicSignals);

      // 5. Mint cNFT using VeriSol protocol

      const signature = await mintVeriSolAttestation({
        connection,
        wallet,
        proofBytes,
        publicInputBytes,
        metadata: {
          name: 'Sealevel Studio Beta Tester',
          symbol: 'BETA',
          uri: 'https://sealevel.studio/metadata/beta-tester.json',
        },
      });

      setAttestationSignature(signature);
      setSuccess(true);
      setError(null);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // TODO: Extract cNFT address from transaction logs
      // For now, we'll leave it null as extracting it requires parsing Bubblegum events
    } catch (err) {
      console.error('Error creating attestation:', err);
      setError(err instanceof Error ? err.message : 'Failed to create attestation');
      setSuccess(false);
    } finally {
      setIsCreating(false);
    }
  }, [publicKey, wallet, connection]);

  if (!publicKey) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 text-center">
        <Shield size={48} className="text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Connect Wallet</h3>
        <p className="text-slate-400">
          Please connect your wallet to create a VeriSol beta tester attestation.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
          <Shield size={24} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">VeriSol Beta Tester Attestation</h2>
          <p className="text-slate-400 text-sm">
            Create a verifiable credential proving you were a beta tester
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Sparkles size={16} />
            Attestation Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Credential Type:</span>
              <span className="text-white font-mono">Beta Tester</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Wallet Address:</span>
              <span className="text-white font-mono text-xs">
                {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Verification:</span>
              <span className="text-green-400 flex items-center gap-1">
                <CheckCircle size={14} />
                ZK Proof Enabled
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Format:</span>
              <span className="text-white">Compressed NFT (cNFT)</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-red-400 font-semibold mb-1">Error</h4>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-green-400 font-semibold mb-2">Attestation Created Successfully!</h4>
                {attestationSignature && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-300">Transaction:</span>
                      <a
                        href={`https://solscan.io/tx/${attestationSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
                      >
                        {attestationSignature.slice(0, 8)}...{attestationSignature.slice(-8)}
                        <ExternalLink size={12} />
                      </a>
                      <button
                        onClick={() => navigator.clipboard.writeText(attestationSignature)}
                        className="p-1 hover:bg-green-900/30 rounded"
                      >
                        <Copy size={12} className="text-green-400" />
                      </button>
                    </div>
                    {cNFTAddress && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-green-300">cNFT Address:</span>
                        <span className="text-sm font-mono text-green-400">
                          {cNFTAddress.slice(0, 8)}...{cNFTAddress.slice(-8)}
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(cNFTAddress)}
                          className="p-1 hover:bg-green-900/30 rounded"
                        >
                          <Copy size={12} className="text-green-400" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Setup Status */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-300">VeriSol Setup Status</h4>
          <button
            onClick={checkSetup}
            disabled={isCheckingSetup}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="Refresh setup status"
          >
            <Settings size={16} className={isCheckingSetup ? 'animate-spin' : ''} />
          </button>
        </div>
        {isCheckingSetup ? (
          <div className="text-sm text-slate-400">Checking setup...</div>
        ) : setupStatus ? (
          setupStatus.ready ? (
            <div className="text-sm text-green-400 flex items-center gap-2">
              <CheckCircle size={16} />
              <span>VeriSol infrastructure ready</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-red-400 flex items-center gap-2">
                <AlertCircle size={16} />
                <span>Setup incomplete</span>
              </div>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside ml-4">
                {setupStatus.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 mt-2">
                Note: If merkle tree is not set up, the system will use proof-only verification mode.
              </p>
            </div>
          )
        ) : (
          <div className="text-sm text-slate-400">Click refresh to check setup</div>
        )}
      </div>

      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">How It Works</h4>
        <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
          <li>Generate a zero-knowledge proof of your beta tester status</li>
          <li>Create a verifiable credential using VeriSol protocol</li>
          <li>Mint a compressed NFT (cNFT) containing the attestation</li>
          <li>Your credential is stored on-chain and can be verified privately</li>
        </ul>
      </div>

      <button
        onClick={handleCreateAttestation}
        disabled={isCreating || success || (usageStats ? !usageStats.meetsRequirement : false)}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
      >
        {isCreating ? (
          <>
            <Loader className="animate-spin" size={20} />
            <span>Creating Attestation...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle size={20} />
            <span>Attestation Created</span>
          </>
        ) : (
          <>
            <Shield size={20} />
            <span>Create Beta Tester Attestation</span>
          </>
        )}
      </button>

    </div>
  );
}

