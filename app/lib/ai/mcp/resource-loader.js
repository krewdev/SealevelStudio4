/**
 * MCP Resource Loader
 * Loads and registers resources for the MCP server
 */

const path = require('path');
const fs = require('fs');

// Resource handlers
let datasetModule = null;
let transactionsModule = null;

// Try to load TypeScript modules (if ts-node is available) or compiled JS
function loadModule(modulePath) {
  try {
    // Try compiled JavaScript first
    const jsPath = modulePath.replace(/\.ts$/, '.js');
    if (fs.existsSync(jsPath)) {
      delete require.cache[require.resolve(jsPath)];
      return require(jsPath);
    }
    
    // Try TypeScript with ts-node (if available)
    if (require.extensions['.ts']) {
      delete require.cache[require.resolve(modulePath)];
      return require(modulePath);
    }
  } catch (error) {
    console.warn(`Could not load module ${modulePath}:`, error.message);
  }
  return null;
}

// Load resources
function loadResources() {
  const resourcesDir = path.join(__dirname, 'resources');
  
  // Try to load dataset resource
  const datasetPath = path.join(resourcesDir, 'dataset.ts');
  datasetModule = loadModule(datasetPath);
  
  // Try to load transactions resource
  const transactionsPath = path.join(resourcesDir, 'transactions.ts');
  transactionsModule = loadModule(transactionsPath);
  
  // Fallback: use inline implementations if modules can't be loaded
  if (!datasetModule) {
    datasetModule = require('./resources/dataset-fallback.js');
  }
  
  if (!transactionsModule) {
    transactionsModule = require('./resources/transactions-fallback.js');
  }
}

// Register resources in the MCP server format
function registerResources() {
  loadResources();
  
  const resources = {
    // Dataset resources
    'dataset://solana-vanguard/metadata': {
      name: 'Solana Vanguard Challenge Metadata',
      description: 'Metadata about the Solana Vanguard Challenge dataset',
      mimeType: 'application/json',
      handler: async () => {
        if (datasetModule && datasetModule.getDatasetMetadata) {
          return datasetModule.getDatasetMetadata();
        }
        return { error: 'Dataset module not loaded' };
      }
    },
    
    'dataset://solana-vanguard/questions': {
      name: 'Solana Vanguard Challenge Questions',
      description: 'Search or browse questions from the dataset',
      mimeType: 'application/json',
      handler: async (uri, params = {}) => {
        if (!datasetModule || !datasetModule.loadDataset) {
          return { error: 'Dataset module not loaded' };
        }
        
        const { search, topic, index, random, limit = 10 } = params;
        
        if (search) {
          return datasetModule.searchQuestions(search, limit);
        }
        if (topic) {
          return datasetModule.getQuestionsByTopic(topic, limit);
        }
        if (index !== undefined) {
          return datasetModule.getQuestionByIndex(index);
        }
        if (random) {
          return datasetModule.getRandomQuestions(random);
        }
        
        // Return all questions (with limit)
        const all = datasetModule.loadDataset();
        return all.slice(0, limit);
      }
    },
    
    // Transaction examples resources
    'tx://examples/all': {
      name: 'All Transaction Examples',
      description: 'Get all complex transaction examples',
      mimeType: 'application/json',
      handler: async () => {
        if (transactionsModule && transactionsModule.getAllExamples) {
          return transactionsModule.getAllExamples();
        }
        return { error: 'Transactions module not loaded' };
      }
    },
    
    'tx://examples/by-category': {
      name: 'Transaction Examples by Category',
      description: 'Get transaction examples filtered by category',
      mimeType: 'application/json',
      handler: async (uri, params = {}) => {
        if (!transactionsModule || !transactionsModule.getExamplesByCategory) {
          return { error: 'Transactions module not loaded' };
        }
        
        const { category } = params;
        if (!category) {
          return { error: 'Category parameter required' };
        }
        
        return transactionsModule.getExamplesByCategory(category);
      }
    },
    
    'tx://examples/by-complexity': {
      name: 'Transaction Examples by Complexity',
      description: 'Get transaction examples filtered by complexity level',
      mimeType: 'application/json',
      handler: async (uri, params = {}) => {
        if (!transactionsModule || !transactionsModule.getExamplesByComplexity) {
          return { error: 'Transactions module not loaded' };
        }
        
        const { complexity } = params;
        if (!complexity) {
          return { error: 'Complexity parameter required' };
        }
        
        return transactionsModule.getExamplesByComplexity(complexity);
      }
    },
    
    'tx://examples/search': {
      name: 'Search Transaction Examples',
      description: 'Search transaction examples by keyword',
      mimeType: 'application/json',
      handler: async (uri, params = {}) => {
        if (!transactionsModule || !transactionsModule.searchExamples) {
          return { error: 'Transactions module not loaded' };
        }
        
        const { keyword } = params;
        if (!keyword) {
          return { error: 'Keyword parameter required' };
        }
        
        return transactionsModule.searchExamples(keyword);
      }
    },
    
    'tx://examples/{id}': {
      name: 'Transaction Example by ID',
      description: 'Get a specific transaction example by ID',
      mimeType: 'application/json',
      handler: async (uri, params = {}) => {
        if (!transactionsModule || !transactionsModule.getExampleById) {
          return { error: 'Transactions module not loaded' };
        }
        
        const { id } = params;
        if (!id) {
          return { error: 'ID parameter required' };
        }
        
        return transactionsModule.getExampleById(id);
      }
    }
  };
  
  return resources;
}

module.exports = {
  registerResources,
  loadResources
};
