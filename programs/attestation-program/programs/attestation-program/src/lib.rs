use anchor_lang::prelude::*;

declare_id!("AeK2u45NkNvAcgZuYyCWqmRuCsnXPvcutR3pziXF1cDw");

/// Sealevel Studios Attestation Program
/// Simple verification-based attestation minting (no ZK proofs required)
#[program]
pub mod sealevel_attestation {
    use super::*;

    /// Initialize the attestation registry
    /// Sets up the registry account with authority and merkle tree
    pub fn initialize(ctx: Context<Initialize>, merkle_tree: Pubkey) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.merkle_tree = merkle_tree;
        registry.total_attestations = 0;
        registry.tier_1_threshold = 10;   // Bronze tier
        registry.tier_2_threshold = 50;  // Silver tier
        registry.tier_3_threshold = 250; // Gold tier
        registry.bump = ctx.bumps.registry;
        
        msg!("Sealevel Studios: Attestation registry initialized");
        msg!("Authority: {:?}", registry.authority);
        msg!("Merkle Tree: {:?}", registry.merkle_tree);
        msg!("Tier 1 (Bronze) Threshold: {}", registry.tier_1_threshold);
        msg!("Tier 2 (Silver) Threshold: {}", registry.tier_2_threshold);
        msg!("Tier 3 (Gold) Threshold: {}", registry.tier_3_threshold);
        
        Ok(())
    }

    /// Mint an attestation with simple verification
    /// Verifies usage meets threshold and determines tier
    pub fn mint_attestation(
        ctx: Context<MintAttestation>,
        usage_count: u64,
        metadata: AttestationMetadata,
    ) -> Result<u8> {
        let registry = &ctx.accounts.registry;
        
        // Determine tier based on usage count
        let tier = if usage_count >= registry.tier_3_threshold {
            3 // Gold tier
        } else if usage_count >= registry.tier_2_threshold {
            2 // Silver tier
        } else if usage_count >= registry.tier_1_threshold {
            1 // Bronze tier
        } else {
            return Err(AttestationError::InsufficientUsage.into());
        };
        
        // Verify wallet address matches signer
        require!(
            ctx.accounts.payer.key() == ctx.accounts.wallet.key(),
            AttestationError::InvalidWallet
        );
        
        // Increment attestation count
        let registry = &mut ctx.accounts.registry;
        registry.total_attestations = registry.total_attestations
            .checked_add(1)
            .ok_or(AttestationError::Overflow)?;
        
        msg!("Sealevel Studios: Attestation minted");
        msg!("Wallet: {:?}", ctx.accounts.wallet.key());
        msg!("Usage Count: {}", usage_count);
        msg!("Tier: {} ({})", tier, get_tier_name(tier));
        msg!("Total Attestations: {}", registry.total_attestations);
        
        // Note: cNFT minting via Bubblegum would happen here
        // The tier determines the rarity and metadata
        
        Ok(tier)
    }
    
    /// Helper function to get tier name
    fn get_tier_name(tier: u8) -> &'static str {
        match tier {
            3 => "Gold",
            2 => "Silver",
            1 => "Bronze",
            _ => "Unknown",
        }
    }

    /// Verify attestation eligibility and return tier
    pub fn verify_eligibility(
        ctx: Context<VerifyEligibility>,
        usage_count: u64,
    ) -> Result<u8> {
        let registry = &ctx.accounts.registry;
        
        // Determine tier (0 = not eligible)
        let tier = if usage_count >= registry.tier_3_threshold {
            3 // Gold tier
        } else if usage_count >= registry.tier_2_threshold {
            2 // Silver tier
        } else if usage_count >= registry.tier_1_threshold {
            1 // Bronze tier
        } else {
            0 // Not eligible
        };
        
        msg!("Sealevel Studios: Eligibility check");
        msg!("Wallet: {:?}", ctx.accounts.wallet.key());
        msg!("Usage Count: {}", usage_count);
        msg!("Tier 1 Threshold: {}", registry.tier_1_threshold);
        msg!("Tier 2 Threshold: {}", registry.tier_2_threshold);
        msg!("Tier 3 Threshold: {}", registry.tier_3_threshold);
        msg!("Eligible Tier: {}", tier);
        
        Ok(tier)
    }

    /// Update tier thresholds (authority only)
    pub fn update_thresholds(
        ctx: Context<UpdateThreshold>,
        tier_1: u64,
        tier_2: u64,
        tier_3: u64,
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        
        require!(
            tier_1 < tier_2 && tier_2 < tier_3,
            AttestationError::InvalidThresholds
        );
        
        registry.tier_1_threshold = tier_1;
        registry.tier_2_threshold = tier_2;
        registry.tier_3_threshold = tier_3;
        
        msg!("Sealevel Studios: Thresholds updated");
        msg!("Tier 1 (Bronze): {}", tier_1);
        msg!("Tier 2 (Silver): {}", tier_2);
        msg!("Tier 3 (Gold): {}", tier_3);
        
        Ok(())
    }
}

#[account]
pub struct AttestationRegistry {
    pub authority: Pubkey,
    pub merkle_tree: Pubkey,
    pub total_attestations: u64,
    pub revoked_attestations: Vec<u64>,
    pub tier_1_threshold: u64, // Bronze tier threshold (e.g., 10)
    pub tier_2_threshold: u64, // Silver tier threshold (e.g., 50)
    pub tier_3_threshold: u64, // Gold tier threshold (e.g., 250)
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
        space = 8 + 32 + 32 + 8 + 4 + (4 + 8 * 100) + 8 + 8 + 8 + 1,
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
        seeds = [b"attestation_registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, AttestationRegistry>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: Wallet address to verify
    pub wallet: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyEligibility<'info> {
    #[account(
        seeds = [b"attestation_registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, AttestationRegistry>,
    
    /// CHECK: Wallet address to check
    pub wallet: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdateThreshold<'info> {
    #[account(
        seeds = [b"attestation_registry"],
        bump = registry.bump,
        has_one = authority @ AttestationError::Unauthorized
    )]
    pub registry: Account<'info, AttestationRegistry>,
    
    pub authority: Signer<'info>,
}

#[error_code]
pub enum AttestationError {
    #[msg("Insufficient usage to qualify for attestation")]
    InsufficientUsage,
    #[msg("Invalid wallet address")]
    InvalidWallet,
    #[msg("Unauthorized: Only authority can perform this action")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Invalid thresholds: tier_1 must be < tier_2 < tier_3")]
    InvalidThresholds,
}
