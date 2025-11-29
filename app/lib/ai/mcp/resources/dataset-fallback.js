/**
 * Fallback Dataset Resource (JavaScript)
 * Simple implementation if TypeScript module can't be loaded
 */

const fs = require('fs');
const path = require('path');

const DATASET_PATH = path.join(process.cwd(), 'data', 'datasets', 'solana_vanguard_challenge_v1.json');
let cachedDataset = null;

function loadDataset() {
  if (cachedDataset) {
    return cachedDataset;
  }

  try {
    const fileContent = fs.readFileSync(DATASET_PATH, 'utf-8');
    const questions = JSON.parse(fileContent);
    cachedDataset = questions;
    return questions;
  } catch (error) {
    console.error('Failed to load dataset:', error);
    return [];
  }
}

function getDatasetMetadata() {
  const questions = loadDataset();
  return {
    name: 'Solana Vanguard Challenge',
    description: '1,000 carefully curated questions covering Solana fundamentals, Rust/Anchor on-chain development, TypeScript client integration, security, and advanced topics',
    totalQuestions: questions.length,
    topics: [
      'Solana Fundamentals',
      'Rust & Anchor Framework',
      'TypeScript Client Integration',
      'Security Best Practices',
      'DeFi & NFTs',
      'Performance Optimization',
      'Testing & CI/CD'
    ],
    source: 'Bifrost-AI/Solana-Vanguard-Challenge'
  };
}

function searchQuestions(keyword, limit = 10) {
  const questions = loadDataset();
  const lowerKeyword = keyword.toLowerCase();
  
  return questions
    .filter(q => q.Instruction.toLowerCase().includes(lowerKeyword))
    .slice(0, limit);
}

function getRandomQuestions(count = 5) {
  const questions = loadDataset();
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getQuestionByIndex(index) {
  const questions = loadDataset();
  if (index < 0 || index >= questions.length) {
    return null;
  }
  return questions[index];
}

function getQuestionsByTopic(topic, limit = 10) {
  const questions = loadDataset();
  const lowerTopic = topic.toLowerCase();
  
  return questions
    .filter(q => {
      const instruction = q.Instruction.toLowerCase();
      return instruction.includes(lowerTopic);
    })
    .slice(0, limit);
}

module.exports = {
  loadDataset,
  getDatasetMetadata,
  searchQuestions,
  getRandomQuestions,
  getQuestionByIndex,
  getQuestionsByTopic
};
