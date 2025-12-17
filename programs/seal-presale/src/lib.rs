use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use anchor_spl::associated_token::AssociatedToken;
use solana_program::clock::Clock;

declare_id!("SealPresale111111111111111111111111111");

#[program]
pub mod seal_presale {
    use super::*;

    /// Initialize the presale with all parameters
    pub fn initialize_presale(
        ctx: Context<InitializePresale>,
        start_time: i64,
        end_time: i64,
        min_purchase: u64,
        max_purchase: u64,
        total_raise_cap: u64,
        presale_supply: u64,
        price_per_seal: u64,
        whitelist_enabled: bool,
    ) -> Result<()> {
        let presale = &mut ctx.accounts.presale_state;
        let clock = Clock::get()?;
        
        // Validate times
        require!(end_time > start_time, PresaleError::InvalidTimeRange);
        require!(start_time >= clock.unix_timestamp, PresaleError::StartTimeInPast);
        
        // Validate amounts
        require!(min_purchase > 0, PresaleError::InvalidMinPurchase);
        require!(max_purchase >= min_purchase, PresaleError::InvalidMaxPurchase);
        require!(total_raise_cap > 0, PresaleError::InvalidRaiseCap);
        require!(presale_supply > 0, PresaleError::InvalidSupply);
        require!(price_per_seal > 0, PresaleError::InvalidPrice);
        
        presale.authority = ctx.accounts.authority.key();
        presale.treasury = ctx.accounts.treasury.key();
        presale.seal_mint = ctx.accounts.seal_mint.key();
        presale.treasury_token_account = ctx.accounts.treasury_token_account.key();
        presale.start_time = start_time;
        presale.end_time = end_time;
        presale.is_active = true;
        presale.min_purchase = min_purchase;
        presale.max_purchase = max_purchase;
        presale.total_raise_cap = total_raise_cap;
        presale.total_raised = 0;
        presale.presale_supply = presale_supply;
        presale.tokens_sold = 0;
        presale.price_per_seal = price_per_seal;
        presale.whitelist_enabled = whitelist_enabled;
        presale.whitelist_root = None;
        presale.total_contributors = 0;
        presale.bump = ctx.bumps.presale_state;
        
        msg!("Presale initialized: {} to {}", start_time, end_time);
        msg!("Raise cap: {} SOL, Supply: {} SEAL", total_raise_cap, presale_supply);
        
        Ok(())
    }

    /// Contribute SOL to the presale and receive SEAL tokens
    pub fn contribute(ctx: Context<Contribute>, sol_amount: u64) -> Result<()> {
        let presale = &mut ctx.accounts.presale_state;
        let contributor = &mut ctx.accounts.contributor;
        let clock = Clock::get()?;
        
        // Validate presale is active
        require!(presale.is_active, PresaleError::PresaleInactive);
        
        // Validate time window
        require!(
            clock.unix_timestamp >= presale.start_time,
            PresaleError::PresaleNotStarted
        );
        require!(
            clock.unix_timestamp <= presale.end_time,
            PresaleError::PresaleEnded
        );
        
        // Validate amount
        require!(sol_amount >= presale.min_purchase, PresaleError::AmountTooLow);
        require!(sol_amount <= presale.max_purchase, PresaleError::AmountTooHigh);
        
        // Check if whitelist is enabled
        if presale.whitelist_enabled {
            // TODO: Implement Merkle tree verification
            // For now, we'll skip whitelist check if not implemented
            // require!(is_whitelisted(ctx.accounts.contributor.wallet, presale.whitelist_root), PresaleError::NotWhitelisted);
        }
        
        // Check total raise cap (atomic check)
        let new_total = presale.total_raised
            .checked_add(sol_amount)
            .ok_or(PresaleError::Overflow)?;
        require!(new_total <= presale.total_raise_cap, PresaleError::CapExceeded);
        
        // Calculate tokens to distribute
        let seal_tokens = calculate_seal_tokens(sol_amount, presale.price_per_seal)?;
        
        // Check supply (atomic check)
        let new_tokens_sold = presale.tokens_sold
            .checked_add(seal_tokens)
            .ok_or(PresaleError::Overflow)?;
        require!(new_tokens_sold <= presale.presale_supply, PresaleError::SupplyExhausted);
        
        // Check contributor's total contribution
        let new_contributor_total = contributor.total_contributed
            .checked_add(sol_amount)
            .ok_or(PresaleError::Overflow)?;
        require!(new_contributor_total <= presale.max_purchase, PresaleError::ContributorCapExceeded);
        
        // Verify treasury has enough tokens
        let treasury_balance = ctx.accounts.treasury_token_account.amount;
        require!(treasury_balance >= seal_tokens, PresaleError::InsufficientTreasuryBalance);
        
        // Transfer SEAL tokens from treasury to contributor (atomic)
        let cpi_accounts = Transfer {
            from: ctx.accounts.treasury_token_account.to_account_info(),
            to: ctx.accounts.contributor_token_account.to_account_info(),
            authority: ctx.accounts.treasury.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, seal_tokens)?;
        
        // Transfer SOL from contributor to treasury (atomic)
        **ctx.accounts.treasury.lamports.borrow_mut() = ctx.accounts.treasury.lamports()
            .checked_add(sol_amount)
            .ok_or(PresaleError::Overflow)?;
        **ctx.accounts.contributor_account.lamports.borrow_mut() = ctx.accounts.contributor_account.lamports()
            .checked_sub(sol_amount)
            .ok_or(PresaleError::Overflow)?;
        
        // Update state (atomic)
        presale.total_raised = new_total;
        presale.tokens_sold = new_tokens_sold;
        
        // Update contributor state
        let is_new_contributor = contributor.total_contributed == 0;
        contributor.wallet = ctx.accounts.contributor_account.key();
        contributor.total_contributed = new_contributor_total;
        contributor.total_tokens_received = contributor.total_tokens_received
            .checked_add(seal_tokens)
            .ok_or(PresaleError::Overflow)?;
        
        if is_new_contributor {
            presale.total_contributors = presale.total_contributors
                .checked_add(1)
                .ok_or(PresaleError::Overflow)?;
        }
        
        msg!(
            "Contribution: {} SOL -> {} SEAL tokens",
            sol_amount,
            seal_tokens
        );
        
        emit!(ContributionEvent {
            contributor: ctx.accounts.contributor_account.key(),
            sol_amount,
            seal_tokens,
            timestamp: clock.unix_timestamp,
        });
        
        Ok(())
    }

    /// Finalize the presale (only authority)
    pub fn finalize_presale(ctx: Context<FinalizePresale>) -> Result<()> {
        let presale = &mut ctx.accounts.presale_state;
        require!(
            ctx.accounts.authority.key() == presale.authority,
            PresaleError::Unauthorized
        );
        
        presale.is_active = false;
        
        msg!("Presale finalized. Total raised: {} SOL", presale.total_raised);
        
        Ok(())
    }

    /// Update whitelist root (only authority)
    pub fn update_whitelist(
        ctx: Context<UpdateWhitelist>,
        whitelist_root: Option<[u8; 32]>,
    ) -> Result<()> {
        let presale = &mut ctx.accounts.presale_state;
        require!(
            ctx.accounts.authority.key() == presale.authority,
            PresaleError::Unauthorized
        );
        
        presale.whitelist_root = whitelist_root;
        presale.whitelist_enabled = whitelist_root.is_some();
        
        msg!("Whitelist updated");
        
        Ok(())
    }
}

/// Calculate SEAL tokens based on SOL amount and tiered bonuses
fn calculate_seal_tokens(sol_amount: u64, base_price: u64) -> Result<u64> {
    // Base calculation: sol_amount / price_per_seal
    // Price is in lamports per SEAL token
    // We need to handle decimals properly
    
    // Convert SOL (lamports) to SEAL tokens
    // sol_amount (lamports) / price_per_seal (lamports per SEAL) = SEAL tokens
    let base_tokens = sol_amount
        .checked_mul(1_000_000_000) // Convert to 9 decimals
        .ok_or(PresaleError::Overflow)?
        .checked_div(base_price)
        .ok_or(PresaleError::Overflow)?;
    
    // Apply tiered bonuses
    let bonus_multiplier = get_bonus_multiplier(sol_amount);
    let bonus_tokens = base_tokens
        .checked_mul(bonus_multiplier)
        .ok_or(PresaleError::Overflow)?
        .checked_div(100)
        .ok_or(PresaleError::Overflow)?;
    
    base_tokens
        .checked_add(bonus_tokens)
        .ok_or(PresaleError::Overflow)
}

/// Get bonus multiplier based on contribution amount
fn get_bonus_multiplier(sol_amount: u64) -> u64 {
    // Convert lamports to SOL for comparison
    let sol = sol_amount as f64 / 1_000_000_000.0;
    
    if sol >= 500.0 {
        30 // 30% bonus
    } else if sol >= 100.0 {
        25 // 25% bonus
    } else if sol >= 50.0 {
        20 // 20% bonus
    } else if sol >= 10.0 {
        15 // 15% bonus
    } else if sol >= 1.0 {
        10 // 10% bonus
    } else {
        0 // No bonus
    }
}

#[derive(Accounts)]
pub struct InitializePresale<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PresaleState::LEN,
        seeds = [b"presale", authority.key().as_ref()],
        bump
    )]
    pub presale_state: Account<'info, PresaleState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Treasury wallet that receives SOL
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,
    
    /// CHECK: SEAL token mint
    pub seal_mint: Account<'info, Mint>,
    
    /// CHECK: Treasury's token account holding SEAL tokens
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(mut)]
    pub presale_state: Account<'info, PresaleState>,
    
    #[account(
        init_if_needed,
        payer = contributor_account,
        space = 8 + Contributor::LEN,
        seeds = [b"contributor", presale_state.key().as_ref(), contributor_account.key().as_ref()],
        bump
    )]
    pub contributor: Account<'info, Contributor>,
    
    #[account(mut)]
    pub contributor_account: Signer<'info>,
    
    /// CHECK: Treasury wallet
    #[account(
        mut,
        address = presale_state.treasury
    )]
    pub treasury: SystemAccount<'info>,
    
    #[account(
        mut,
        address = presale_state.treasury_token_account
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = contributor_account,
        associated_token::mint = presale_state.seal_mint,
        associated_token::authority = contributor_account
    )]
    pub contributor_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizePresale<'info> {
    #[account(mut)]
    pub presale_state: Account<'info, PresaleState>,
    
    #[account(
        address = presale_state.authority
    )]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateWhitelist<'info> {
    #[account(mut)]
    pub presale_state: Account<'info, PresaleState>,
    
    #[account(
        address = presale_state.authority
    )]
    pub authority: Signer<'info>,
}

#[account]
pub struct PresaleState {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub seal_mint: Pubkey,
    pub treasury_token_account: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub is_active: bool,
    pub min_purchase: u64,
    pub max_purchase: u64,
    pub total_raise_cap: u64,
    pub total_raised: u64,
    pub presale_supply: u64,
    pub tokens_sold: u64,
    pub price_per_seal: u64, // in lamports
    pub whitelist_enabled: bool,
    pub whitelist_root: Option<[u8; 32]>,
    pub total_contributors: u64,
    pub bump: u8,
}

impl PresaleState {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 8 + 8 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 33 + 8 + 1;
}

#[account]
pub struct Contributor {
    pub wallet: Pubkey,
    pub total_contributed: u64,
    pub total_tokens_received: u64,
    pub bump: u8,
}

impl Contributor {
    pub const LEN: usize = 32 + 8 + 8 + 1;
}

#[event]
pub struct ContributionEvent {
    pub contributor: Pubkey,
    pub sol_amount: u64,
    pub seal_tokens: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum PresaleError {
    #[msg("Invalid time range")]
    InvalidTimeRange,
    #[msg("Start time cannot be in the past")]
    StartTimeInPast,
    #[msg("Invalid minimum purchase amount")]
    InvalidMinPurchase,
    #[msg("Invalid maximum purchase amount")]
    InvalidMaxPurchase,
    #[msg("Invalid raise cap")]
    InvalidRaiseCap,
    #[msg("Invalid supply")]
    InvalidSupply,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Presale is not active")]
    PresaleInactive,
    #[msg("Presale has not started yet")]
    PresaleNotStarted,
    #[msg("Presale has ended")]
    PresaleEnded,
    #[msg("Contribution amount is too low")]
    AmountTooLow,
    #[msg("Contribution amount is too high")]
    AmountTooHigh,
    #[msg("Not whitelisted")]
    NotWhitelisted,
    #[msg("Presale cap exceeded")]
    CapExceeded,
    #[msg("Supply exhausted")]
    SupplyExhausted,
    #[msg("Contributor cap exceeded")]
    ContributorCapExceeded,
    #[msg("Insufficient treasury balance")]
    InsufficientTreasuryBalance,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    Overflow,
}

