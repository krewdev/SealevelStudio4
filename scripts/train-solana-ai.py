#!/usr/bin/env python3
"""
Solana DeFi AI Training Script
Trains AI model with comprehensive Solana knowledge for trading and MEV strategies
"""

import json
import requests
import time
import logging
from typing import List, Dict, Any
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class TrainingExample:
    """Represents a training example for the AI model"""
    input_text: str
    context: str
    expected_output: str = ""

class SolanaAITrainer:
    """Trainer for Solana DeFi AI model"""

    def __init__(self, base_url: str = "http://127.0.0.1:1234"):
        self.base_url = base_url
        self.embedding_url = f"{base_url}/v1/embeddings"
        self.completion_url = f"{base_url}/v1/chat/completions"

    def load_training_data(self, filepath: str) -> Dict[str, Any]:
        """Load training data from JSON file"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error(f"Training data file not found: {filepath}")
            return {}
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in training data: {e}")
            return {}

    def create_training_examples(self, data: Dict[str, Any]) -> List[TrainingExample]:
        """Convert training data into training examples"""
        examples = []

        # Process training data
        for item in data.get('training_data', []):
            example = TrainingExample(
                input_text=f"What do you know about {item['topic']}?",
                context=item['content'],
                expected_output=item['content']
            )
            examples.append(example)

        # Process trading strategies
        for strategy in data.get('trading_strategies', []):
            context = f"""
Strategy: {strategy['name']}
Description: {strategy['description']}
Execution: {strategy['execution']}
Tools: {', '.join(strategy['tools'])}
Risks: {strategy['risk']}
"""
            example = TrainingExample(
                input_text=f"How does {strategy['name']} work on Solana?",
                context=context.strip(),
                expected_output=context.strip()
            )
            examples.append(example)

        # Process flash loan strategies
        for protocol in data.get('flash_loan_strategies', []):
            context = f"""
Protocol: {protocol['protocol']}
Description: {protocol['description']}
Use Cases: {', '.join(protocol['use_cases'])}
Fees: {protocol['fees']}
Requirements: {protocol['requirements']}
"""
            example = TrainingExample(
                input_text=f"Tell me about flash loans on {protocol['protocol']}",
                context=context.strip(),
                expected_output=context.strip()
            )
            examples.append(example)

        # Process MEV techniques
        for technique in data.get('mev_techniques', []):
            context = f"""
Technique: {technique['technique']}
Description: {technique['description']}
Implementation: {technique['implementation']}
Tools: {', '.join(technique['tools'])}
Ethics: {technique['ethics']}
"""
            example = TrainingExample(
                input_text=f"Explain {technique['technique']} in DeFi",
                context=context.strip(),
                expected_output=context.strip()
            )
            examples.append(example)

        return examples

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for training texts"""
        embeddings = []

        for text in texts:
            try:
                payload = {
                    "model": "text-embedding-nomic-embed-text-v1.5",
                    "input": text[:8000]  # Limit text length
                }

                response = requests.post(self.embedding_url, json=payload, timeout=30)
                response.raise_for_status()

                data = response.json()
                if 'data' in data and len(data['data']) > 0:
                    embedding = data['data'][0]['embedding']
                    embeddings.append(embedding)
                    logger.info(f"Generated embedding for text ({len(text)} chars)")
                else:
                    logger.warning(f"No embedding data received for text")
                    embeddings.append([])

            except requests.RequestException as e:
                logger.error(f"Failed to generate embedding: {e}")
                embeddings.append([])
            except Exception as e:
                logger.error(f"Unexpected error generating embedding: {e}")
                embeddings.append([])

        return embeddings

    def create_training_prompt(self, example: TrainingExample) -> str:
        """Create a training prompt from an example"""
        return f"""You are an expert Solana DeFi AI assistant specializing in trading strategies, flash loans, and MEV opportunities.

Context: {example.context}

User: {example.input_text}

Assistant: Based on my extensive knowledge of Solana DeFi, {example.expected_output}

When providing trading advice, always emphasize:
- Risk management and capital preservation
- Understanding of impermanent loss and slippage
- Compliance with applicable regulations
- Using audited protocols and contracts
- Testing strategies on devnet before mainnet deployment

For MEV strategies, note that some techniques may be controversial and could harm other users."""

    def train_model(self, training_data_path: str, batch_size: int = 5):
        """Main training function"""
        logger.info("Starting Solana DeFi AI training...")

        # Load training data
        data = self.load_training_data(training_data_path)
        if not data:
            logger.error("No training data loaded")
            return

        # Create training examples
        examples = self.create_training_examples(data)
        logger.info(f"Created {len(examples)} training examples")

        # Generate embeddings for context texts
        context_texts = [ex.context for ex in examples]
        logger.info("Generating embeddings for context texts...")
        embeddings = self.generate_embeddings(context_texts)

        # Create training prompts
        training_prompts = []
        for example in examples:
            prompt = self.create_training_prompt(example)
            training_prompts.append(prompt)

        logger.info(f"Generated {len(training_prompts)} training prompts")

        # Save training data for fine-tuning
        training_output = {
            "metadata": {
                "model": "text-embedding-nomic-embed-text-v1.5",
                "training_date": time.strftime("%Y-%m-%d %H:%M:%S"),
                "examples_count": len(examples),
                "topics_covered": [
                    "Solana Transaction Types",
                    "DEX Trading Strategies",
                    "Flash Loans",
                    "MEV Strategies",
                    "DeFi Protocols",
                    "Risk Management"
                ]
            },
            "training_examples": [
                {
                    "input": ex.input_text,
                    "context": ex.context,
                    "expected_output": ex.expected_output,
                    "embedding": emb if emb else None
                }
                for ex, emb in zip(examples, embeddings)
            ],
            "training_prompts": training_prompts
        }

        # Save to file
        output_file = "solana-defi-training-output.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(training_output, f, indent=2, ensure_ascii=False)

        logger.info(f"Training data saved to {output_file}")

        # Test the model with a sample query
        self.test_model()

    def test_model(self):
        """Test the trained model with a sample query"""
        test_query = "What are the best arbitrage opportunities on Solana right now?"

        try:
            payload = {
                "model": "text-embedding-nomic-embed-text-v1.5",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert Solana DeFi AI assistant specializing in trading strategies, flash loans, and MEV opportunities."
                    },
                    {
                        "role": "user",
                        "content": test_query
                    }
                ],
                "temperature": 0.7,
                "max_tokens": 500
            }

            response = requests.post(self.completion_url, json=payload, timeout=60)
            response.raise_for_status()

            result = response.json()
            if 'choices' in result and len(result['choices']) > 0:
                logger.info("Model test response:")
                logger.info(result['choices'][0]['message']['content'])
            else:
                logger.warning("No response from model")

        except requests.RequestException as e:
            logger.error(f"Failed to test model: {e}")
        except Exception as e:
            logger.error(f"Unexpected error testing model: {e}")

def main():
    """Main training function"""
    trainer = SolanaAITrainer()

    training_data_path = "../training-data/solana-defi-training.json"

    try:
        trainer.train_model(training_data_path)
        logger.info("Solana DeFi AI training completed successfully!")
    except KeyboardInterrupt:
        logger.info("Training interrupted by user")
    except Exception as e:
        logger.error(f"Training failed: {e}")

if __name__ == "__main__":
    main()
