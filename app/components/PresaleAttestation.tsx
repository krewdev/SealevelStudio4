// Presale Attestation Component
// Allows users to mint a SEAL presale participation attestation as a cNFT

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  Coins,
  CheckCircle,
  AlertCircle,
  Loader,
  ExternalLink,
  Copy,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { createAttestationClient } from '../lib/attestation/client';

interface PresaleAttestationProps {
  connection: Connection;
}

export function PresaleAttestation({ connection }: PresaleAttestationProps) {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [isChecking, setIsChecking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [solContributed, setSolContributed] = useState<number>(0);
  const [attestationSignature, setAttestationSignature] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cNFTAddress, setCNFTAddress] = useState<string | null>(null);

  // Check presale participation status
  const checkPresaleParticipation = useCallback(async () => {
    if (!publicKey) return;

    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/attestation/presale/check?wallet=${publicKey.toString()}&network=devnet`
      );
      const data = await response.json();

      if (data.success) {
        setEligible(data.eligible);
        setSolContributed(data.solContributed || 0);
        if (!data.eligible) {
          setError(data.message || 'You have not participated in the SEAL presale or your contribution is below the minimum (0.1 SOL)');
        }
      } else {
        setError(data.error || 'Failed to check presale participation');
        setEligible(false);
      }
    } catch (err) {
      console.error('Error checking presale participation:', err);
      setError(err instanceof Error ? err.message : 'Failed to check presale participation');
      setEligible(false);
    } finally {
      setIsChecking(false);
    }
  }, [publicKey]);

  // Check on mount and when wallet changes
  useEffect(() => {
    if (publicKey) {
      checkPresaleParticipation();
    } else {
      setEligible(null);
      setSolContributed(0);
    }
  }, [publicKey, checkPresaleParticipation]);

  const handleMintPresaleAttestation = useCallback(async () => {
    if (!publicKey || !wallet) {
      setError('Please connect your wallet');
      return;
    }

    if (!eligible) {
      setError('You are not eligible for a presale attestation. Minimum contribution: 0.1 SOL');
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(false);
    setAttestationSignature(null);
    setCNFTAddress(null);

    try {
      const client = createAttestationClient(connection, wallet);
      
      // Convert SOL to lamports
      const solContributedLamports = Math.floor(solContributed * LAMPORTS_PER_SOL);
      
      // Determine tier based on contribution amount
      let tier = 'Standard';
      let rarity = 'Common';
      if (solContributed >= 500) {
        tier = 'Platinum';
        rarity = 'Legendary';
      } else if (solContributed >= 100) {
        tier = 'Gold';
        rarity = 'Epic';
      } else if (solContributed >= 50) {
        tier = 'Silver';
        rarity = 'Rare';
      } else if (solContributed >= 10) {
        tier = 'Bronze';
        rarity = 'Uncommon';
      }

      const signature = await client.mintPresaleAttestation(
        solContributedLamports,
        {
          name: `SEAL Presale Participant - ${tier}`,
          symbol: `SEAL-${tier.slice(0, 1)}`,
          uri: `https://sealevel.studio/metadata/presale-${tier.toLowerCase()}.json`,
          attributes: [
            { trait_type: 'Type', value: 'Presale Participant' },
            { trait_type: 'Tier', value: tier },
            { trait_type: 'Rarity', value: rarity },
            { trait_type: 'SOL Contributed', value: solContributed.toFixed(4) },
            { trait_type: 'Date', value: new Date().toISOString().split('T')[0] },
          ],
        }
      );

      setAttestationSignature(signature);
      setSuccess(true);
      setError(null);
      
      console.log(`Minted ${tier} tier presale attestation (${rarity})`);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // TODO: Extract cNFT address from transaction logs
    } catch (err) {
      console.error('Error creating presale attestation:', err);
      setError(err instanceof Error ? err.message : 'Failed to create presale attestation');
      setSuccess(false);
    } finally {
      setIsCreating(false);
    }
  }, [publicKey, wallet, connection, eligible, solContributed]);

  if (!publicKey) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 text-center">
        <Coins size={48} className="text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Connect Wallet</h3>
        <p className="text-slate-400">
          Please connect your wallet to check your SEAL presale participation and mint an attestation.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-500/10 rounded-lg">
          <Trophy className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">SEAL Presale Attestation</h2>
          <p className="text-slate-400 text-sm">Mint your presale participation badge</p>
        </div>
      </div>

      {/* Status Check */}
      {isChecking && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <Loader className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-slate-300">Checking presale participation...</span>
          </div>
        </div>
      )}

      {/* Eligibility Status */}
      {!isChecking && eligible !== null && (
        <div className={`bg-slate-800 border rounded-lg p-4 mb-4 ${
          eligible ? 'border-green-500/50' : 'border-red-500/50'
        }`}>
          <div className="flex items-center gap-3">
            {eligible ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div className="flex-1">
                  <p className="text-green-400 font-semibold">Eligible for Presale Attestation</p>
                  <p className="text-slate-400 text-sm mt-1">
                    You contributed {solContributed.toFixed(4)} SOL to the SEAL presale
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-400" />
                <div className="flex-1">
                  <p className="text-red-400 font-semibold">Not Eligible</p>
                  <p className="text-slate-400 text-sm mt-1">
                    {error || 'Minimum contribution required: 0.1 SOL'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Contribution Info */}
      {eligible && solContributed > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Your Contribution</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">SOL Contributed:</span>
              <span className="text-white font-mono">{solContributed.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="text-green-400">✓ Verified</span>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && attestationSignature && (
        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-400 font-semibold">Presale Attestation Minted!</p>
          </div>
          <p className="text-slate-300 text-sm mb-3">
            Your SEAL presale participation has been verified and minted as a compressed NFT.
          </p>
          <div className="flex items-center gap-2">
            <a
              href={`https://solscan.io/tx/${attestationSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
            >
              View Transaction <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(attestationSignature);
              }}
              className="text-slate-400 hover:text-slate-300 text-sm flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Copy TX
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && !isChecking && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={checkPresaleParticipation}
          disabled={isChecking || isCreating}
          className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isChecking ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Coins className="w-4 h-4" />
              Check Status
            </>
          )}
        </button>

        {eligible && (
          <button
            onClick={handleMintPresaleAttestation}
            disabled={isCreating || !eligible}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Minting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Mint Attestation
              </>
            )}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 pt-6 border-t border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">About Presale Attestations</h3>
        <ul className="text-slate-400 text-sm space-y-1">
          <li>• Verifies your participation in the SEAL token presale</li>
          <li>• Minted as a compressed NFT (cNFT) for efficient storage</li>
          <li>• Tier based on your contribution amount</li>
          <li>• Minimum contribution: 0.1 SOL</li>
        </ul>
      </div>
    </div>
  );
}

