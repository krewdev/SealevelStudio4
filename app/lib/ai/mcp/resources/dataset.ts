/**
 * MCP Resource: Solana Vanguard Challenge Dataset
 * Provides access to the educational Q&A dataset for Solana development
 */

import * as fs from 'fs';
import * as path from 'path';

export interface DatasetQuestion {
  Instruction: string;
  Output: string;
}

export interface DatasetMetadata {
  name: string;
  description: string;
  totalQuestions: number;
  topics: string[];
  source: string;
}

const DATASET_PATH = path.join(process.cwd(), 'data', 'datasets', 'solana_vanguard_challenge_v1.json');
let cachedDataset: DatasetQuestion[] | null = null;
let cachedMetadata: DatasetMetadata | null = null;

/**
 * Load dataset from file (with caching)
 */
export function loadDataset(): DatasetQuestion[] {
  if (cachedDataset) {
    return cachedDataset;
  }

  try {
    const fileContent = fs.readFileSync(DATASET_PATH, 'utf-8');
    const questions = JSON.parse(fileContent) as DatasetQuestion[];
    cachedDataset = questions;
    return questions;
  } catch (error) {
    console.error('Failed to load dataset:', error);
    return [];
  }
}

/**
 * Get dataset metadata
 */
export function getDatasetMetadata(): DatasetMetadata {
  if (cachedMetadata) {
    return cachedMetadata;
  }

  const questions = loadDataset();
  cachedMetadata = {
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

  return cachedMetadata;
}

/**
 * Search questions by keyword in instruction
 */
export function searchQuestions(keyword: string, limit: number = 10): DatasetQuestion[] {
  const questions = loadDataset();
  const lowerKeyword = keyword.toLowerCase();
  
  return questions
    .filter(q => q.Instruction.toLowerCase().includes(lowerKeyword))
    .slice(0, limit);
}

/**
 * Get random questions
 */
export function getRandomQuestions(count: number = 5): DatasetQuestion[] {
  const questions = loadDataset();
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get question by index
 */
export function getQuestionByIndex(index: number): DatasetQuestion | null {
  const questions = loadDataset();
  if (index < 0 || index >= questions.length) {
    return null;
  }
  return questions[index];
}

/**
 * Get questions by topic (simple keyword matching)
 */
export function getQuestionsByTopic(topic: string, limit: number = 10): DatasetQuestion[] {
  const questions = loadDataset();
  const lowerTopic = topic.toLowerCase();
  
  return questions
    .filter(q => {
      const instruction = q.Instruction.toLowerCase();
      return instruction.includes(lowerTopic);
    })
    .slice(0, limit);
}
