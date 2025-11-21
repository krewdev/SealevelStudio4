#!/bin/bash

# Script to initialize Anchor attestation program
# Run this from the project root: ./scripts/init-attestation-program.sh

set -e

echo "🚀 Initializing Attestation Program..."

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor is not installed. Please install it first:"
    echo "   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force"
    echo "   avm install latest"
    echo "   avm use latest"
    exit 1
fi

# Check if yarn is installed (Anchor requires it)
if ! command -v yarn &> /dev/null; then
    echo "⚠️  Yarn is not installed. Installing yarn..."
    npm install -g yarn
    if ! command -v yarn &> /dev/null; then
        echo "❌ Failed to install yarn. Please install it manually:"
        echo "   npm install -g yarn"
        exit 1
    fi
    echo "✅ Yarn installed successfully"
fi

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Create programs directory if it doesn't exist
mkdir -p programs

# Initialize Anchor project
if [ -d "programs/attestation-program" ]; then
    echo "⚠️  Attestation program directory already exists. Skipping initialization."
else
    echo "📦 Creating Anchor project..."
    cd programs
    anchor init attestation-program
    cd ..
    echo "✅ Anchor project created at programs/attestation-program"
fi

# Copy program template
echo "📝 Setting up program structure..."

# Anchor creates a nested structure: programs/attestation-program/programs/attestation-program/src/lib.rs
PROGRAM_DIR="programs/attestation-program/programs/attestation-program"
mkdir -p "$PROGRAM_DIR/src"

# Get existing program ID if it exists
EXISTING_PROGRAM_ID="YOUR_PROGRAM_ID_HERE"
if [ -f "$PROGRAM_DIR/src/lib.rs" ]; then
    EXISTING_ID=$(grep -oP 'declare_id!\("\K[^"]+' "$PROGRAM_DIR/src/lib.rs" | head -1)
    if [ ! -z "$EXISTING_ID" ] && [ "$EXISTING_ID" != "YOUR_PROGRAM_ID_HERE" ]; then
        EXISTING_PROGRAM_ID="$EXISTING_ID"
        echo "📋 Found existing program ID: $EXISTING_PROGRAM_ID"
    fi
fi

cat > "$PROGRAM_DIR/src/lib.rs" << PROGRAM_EOF
use anchor_lang::prelude::*;

declare_id!("$EXISTING_PROGRAM_ID");

#[program]
pub mod attestation_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, merkle_tree: Pubkey) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.merkle_tree = merkle_tree;
        registry.total_attestations = 0;
        registry.bump = ctx.bumps.registry;
        Ok(())
    }

    pub fn mint_attestation(
        ctx: Context<MintAttestation>,
        proof_bytes: Vec<u8>,
        public_inputs: Vec<u8>,
        metadata: AttestationMetadata,
    ) -> Result<()> {
        // TODO: Implement ZK proof verification
        // verify_zk_proof(&proof_bytes, &public_inputs)?;

        let registry = &mut ctx.accounts.registry;
        require!(
            registry.total_attestations < 10000,
            AttestationError::MaxAttestationsReached
        );

        // TODO: Implement cNFT minting via Bubblegum
        // mint_cnft(&ctx, &metadata)?;

        registry.total_attestations += 1;

        emit!(AttestationMinted {
            wallet: ctx.accounts.payer.key(),
            attestation_id: registry.total_attestations,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn verify_proof_only(
        ctx: Context<VerifyProof>,
        proof_bytes: Vec<u8>,
        public_inputs: Vec<u8>,
    ) -> Result<()> {
        // TODO: Implement ZK proof verification
        // verify_zk_proof(&proof_bytes, &public_inputs)?;
        
        emit!(ProofVerified {
            wallet: ctx.accounts.payer.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn revoke_attestation(
        ctx: Context<RevokeAttestation>,
        attestation_id: u64,
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        require!(
            ctx.accounts.authority.key() == registry.authority,
            AttestationError::Unauthorized
        );

        registry.revoked_attestations.push(attestation_id);

        emit!(AttestationRevoked {
            attestation_id,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[account]
pub struct AttestationRegistry {
    pub authority: Pubkey,
    pub merkle_tree: Pubkey,
    pub total_attestations: u64,
    pub revoked_attestations: Vec<u64>,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AttestationMetadata {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub attributes: Vec<Attribute>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Attribute {
    pub trait_type: String,
    pub value: String,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8 + 4 + (4 + 8 * 100) + 1,
        seeds = [b"attestation_registry"],
        bump
    )]
    pub registry: Account<'info, AttestationRegistry>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintAttestation<'info> {
    #[account(
        mut,
        seeds = [b"attestation_registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, AttestationRegistry>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyProof<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeAttestation<'info> {
    #[account(
        mut,
        seeds = [b"attestation_registry"],
        bump = registry.bump,
        constraint = authority.key() == registry.authority @ AttestationError::Unauthorized
    )]
    pub registry: Account<'info, AttestationRegistry>,
    
    pub authority: Signer<'info>,
}

#[event]
pub struct AttestationMinted {
    pub wallet: Pubkey,
    pub attestation_id: u64,
    pub timestamp: i64,
}

#[event]
pub struct ProofVerified {
    pub wallet: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AttestationRevoked {
    pub attestation_id: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum AttestationError {
    #[msg("Invalid ZK proof")]
    InvalidProof,
    #[msg("Maximum attestations reached")]
    MaxAttestationsReached,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Attestation already revoked")]
    AlreadyRevoked,
}
PROGRAM_EOF

echo "✅ Program template created"

# Update Cargo.toml (the one in the program directory, not the root)
echo "📦 Updating dependencies..."
cat >> "$PROGRAM_DIR/Cargo.toml" << 'CARGO_EOF'

[dependencies]
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"
CARGO_EOF

echo "✅ Dependencies updated"

# Generate program ID
echo "🔑 Generating program ID..."
cd programs/attestation-program
anchor keys list

echo ""
echo "✅ Attestation program initialized!"
echo ""
echo "Next steps:"
echo "1. Update the program ID in $PROGRAM_DIR/src/lib.rs"
echo "2. Update programs/attestation-program/Anchor.toml with your program ID"
echo "3. Implement ZK proof verification (see docs/ATTESTATION_PROGRAM_SETUP.md)"
echo "4. Implement Bubblegum cNFT minting"
echo "5. Build: anchor build"
echo "6. Deploy: anchor deploy --provider.cluster devnet"
echo ""
echo "📚 See docs/ATTESTATION_PROGRAM_SETUP.md for detailed instructions"

