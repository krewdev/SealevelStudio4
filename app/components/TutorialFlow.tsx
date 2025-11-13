import React, { useState } from 'react';

function AccountInspectorTutorial({ onNext }: { onNext: () => void }) {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center p-8">
        <h1 className="text-3xl font-bold mb-6">Welcome to Account Inspector</h1>
        <p className="text-lg mb-8 text-gray-300">
          The Account Inspector lets you explore any Solana account, token, or program on the blockchain.
          Simply paste an address and see its data, balance, and structure.
        </p>
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h3 className="text-xl font-semibold mb-4">Try it with:</h3>
          <p className="text-gray-400 mb-2">System Program: <code className="bg-gray-700 px-2 py-1 rounded">11111111111111111111111111111112</code></p>
          <p className="text-gray-400">USDC Mint: <code className="bg-gray-700 px-2 py-1 rounded">EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v</code></p>
        </div>
        <button
          onClick={onNext}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-lg font-medium text-white transition-colors"
        >
          Next: Instruction Assembler →
        </button>
      </div>
    </div>
  );
}

function InstructionAssemblerTutorial({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center p-8">
        <h1 className="text-3xl font-bold mb-6">Master the Instruction Assembler</h1>
        <p className="text-lg mb-8 text-gray-300">
          Build complex Solana transactions visually! Add instructions from popular programs,
          configure accounts and data, then simulate or execute your transactions.
        </p>
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h3 className="text-xl font-semibold mb-4">Key Features:</h3>
          <ul className="text-left text-gray-300 space-y-2">
            <li>• Visual transaction building</li>
            <li>• Pre-built instruction templates</li>
            <li>• Account requirement validation</li>
            <li>• Transaction simulation</li>
            <li>• Code export for integration</li>
          </ul>
        </div>
        <button
          onClick={onComplete}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-lg font-medium text-white transition-colors"
        >
          Get Started! 🚀
        </button>
      </div>
    </div>
  );
}

export function TutorialFlow({ onComplete }: { onComplete: () => void }) {
  const [currentTutorial, setCurrentTutorial] = useState(0);
  const tutorials = [
    <AccountInspectorTutorial key="inspector" onNext={() => setCurrentTutorial(1)} />,
    <InstructionAssemblerTutorial key="assembler" onComplete={onComplete} />
  ];

  return tutorials[currentTutorial];
}