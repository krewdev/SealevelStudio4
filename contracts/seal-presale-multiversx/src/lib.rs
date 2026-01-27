#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// SEAL Token Presale Smart Contract for MultiversX
/// 
/// Features:
/// - 3-tier bonus structure (15%, 25%, 35%)
/// - Configurable contribution limits (min/max per wallet, total cap)
/// - Whitelist support
/// - Automatic SEAL token distribution
/// - Vesting schedule tracking
/// - Emergency pause functionality
/// 
/// Presale Configuration:
/// - Duration: 90 days
/// - Min Purchase: 0.1 EGLD
/// - Max Purchase: 1000 EGLD per wallet
/// - Total Raise Cap: 10,000 EGLD
/// - Price: 0.00005 EGLD per SEAL (~20,000 SEAL per EGLD)

/// Contribution tier for bonus calculation
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, Clone, PartialEq, Debug)]
pub enum ContributionTier {
    None,
    Tier1, // 1-9.99 EGLD: 15% bonus
    Tier2, // 10-49.99 EGLD: 25% bonus
    Tier3, // 50+ EGLD: 35% bonus
}

/// Contributor information stored on-chain
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, Clone)]
pub struct Contributor<M: ManagedTypeApi> {
    pub wallet: ManagedAddress<M>,
    pub total_contributed: BigUint<M>,
    pub total_tokens: BigUint<M>,
    pub tier: ContributionTier,
    pub has_claimed: bool,
}

/// Presale state
#[derive(TopEncode, TopDecode, TypeAbi, PartialEq, Clone, Copy)]
pub enum PresaleState {
    NotStarted,
    Active,
    Paused,
    Ended,
}

#[multiversx_sc::contract]
pub trait SealPresale {
    /// Initialize the presale contract
    /// 
    /// # Arguments
    /// * `seal_token_id` - The ESDT token identifier for SEAL tokens
    /// * `treasury` - Address to receive EGLD contributions
    /// * `start_timestamp` - Unix timestamp when presale starts
    /// * `duration_seconds` - Duration of presale in seconds (default: 90 days = 7776000)
    #[init]
    fn init(
        &self,
        seal_token_id: TokenIdentifier,
        treasury: ManagedAddress,
        start_timestamp: u64,
        duration_seconds: u64,
    ) {
        require!(seal_token_id.is_valid_esdt_identifier(), "SEAL token must be a valid ESDT");
        require!(duration_seconds > 0, "Duration must be positive");
        
        self.seal_token_id().set(&seal_token_id);
        self.treasury().set(&treasury);
        self.start_timestamp().set(start_timestamp);
        self.end_timestamp().set(start_timestamp + duration_seconds);
        
        // Set default configuration using EGLD denomination (10^18)
        let denomination = BigUint::from(10u64).pow(18);
        
        // Price: 0.00005 EGLD per SEAL = 50_000_000_000_000 wei
        // This gives ~20,000 SEAL per EGLD
        self.price_per_seal().set(BigUint::from(50_000_000_000_000u64));
        
        // Min purchase: 0.1 EGLD = 10^17 wei
        self.min_purchase().set(&denomination / 10u64);
        
        // Max purchase per wallet: 1000 EGLD
        self.max_purchase().set(&denomination * 1000u64);
        
        // Total raise cap: 10,000 EGLD
        self.total_raise_cap().set(&denomination * 10_000u64);
        
        // Presale supply: 300,000,000 SEAL tokens (with 18 decimals)
        let presale_supply = BigUint::from(300_000_000u64) * &denomination;
        self.presale_supply().set(presale_supply);
        
        // Bonus tiers (in wei)
        // Tier 1: 1 EGLD = 1 * 10^18
        let one_egld = BigUint::from(10u64).pow(18);
        self.tier1_threshold().set(one_egld.clone());
        // Tier 2: 10 EGLD
        self.tier2_threshold().set(&one_egld * 10u64);
        // Tier 3: 50 EGLD
        self.tier3_threshold().set(&one_egld * 50u64);
        
        // Bonus percentages (in basis points: 1500 = 15%, 2500 = 25%, 3500 = 35%)
        self.tier1_bonus().set(1500u32);
        self.tier2_bonus().set(2500u32);
        self.tier3_bonus().set(3500u32);
        
        // Initialize state
        self.presale_state().set(PresaleState::NotStarted);
        self.whitelist_enabled().set(false);
        self.total_raised().set(BigUint::zero());
        self.total_contributors().set(0u64);
        self.tokens_sold().set(BigUint::zero());
    }

    /// Contribute EGLD to the presale and receive SEAL tokens
    /// 
    /// The contribution is validated against:
    /// - Presale active status and time window
    /// - Minimum/maximum purchase limits
    /// - Total raise cap
    /// - Whitelist (if enabled)
    /// 
    /// Tokens are calculated based on contribution amount with tier bonuses applied
    #[payable("EGLD")]
    #[endpoint]
    fn contribute(&self) {
        let caller = self.blockchain().get_caller();
        let payment = self.call_value().egld_value().clone_value();
        
        // Validate presale is active
        self.require_presale_active();
        
        // Validate time window
        let current_timestamp = self.blockchain().get_block_timestamp();
        let start = self.start_timestamp().get();
        let end = self.end_timestamp().get();
        require!(current_timestamp >= start, "Presale has not started yet");
        require!(current_timestamp <= end, "Presale has ended");
        
        // Validate whitelist
        if self.whitelist_enabled().get() {
            require!(self.whitelist().contains(&caller), "Address not whitelisted");
        }
        
        // Validate minimum purchase
        let min_purchase = self.min_purchase().get();
        require!(payment >= min_purchase, "Below minimum purchase amount");
        
        // Get existing contribution
        let existing_contribution = self.get_contribution(&caller);
        let new_total = &existing_contribution + &payment;
        
        // Validate maximum purchase per wallet
        let max_purchase = self.max_purchase().get();
        require!(new_total <= max_purchase, "Exceeds maximum purchase per wallet");
        
        // Validate total raise cap
        let total_raised = self.total_raised().get();
        let raise_cap = self.total_raise_cap().get();
        require!(&total_raised + &payment <= raise_cap, "Presale cap exceeded");
        
        // Calculate tokens with bonus
        let (base_tokens, bonus_tokens, tier) = self.calculate_tokens(&new_total);
        let total_tokens = &base_tokens + &bonus_tokens;
        
        // Validate sufficient token supply
        let tokens_sold = self.tokens_sold().get();
        let presale_supply = self.presale_supply().get();
        require!(&tokens_sold + &total_tokens <= presale_supply, "Insufficient token supply");
        
        // Update contributor record
        let is_new_contributor = existing_contribution == BigUint::zero();
        
        let contributor = Contributor {
            wallet: caller.clone(),
            total_contributed: new_total.clone(),
            total_tokens: total_tokens.clone(),
            tier,
            has_claimed: false,
        };
        self.contributors(&caller).set(&contributor);
        
        // Update global stats
        self.total_raised().update(|v| *v += &payment);
        self.tokens_sold().update(|v| *v += &total_tokens);
        
        if is_new_contributor {
            self.total_contributors().update(|v| *v += 1);
        }
        
        // Transfer EGLD to treasury
        let treasury = self.treasury().get();
        self.send().direct_egld(&treasury, &payment);
        
        // Transfer SEAL tokens to contributor
        let seal_token = self.seal_token_id().get();
        self.send().direct_esdt(&caller, &seal_token, 0, &total_tokens);
        
        // Emit event
        self.contribution_event(&caller, &payment, &total_tokens);
    }

    /// Calculate tokens for a given total contribution amount
    /// Returns (base_tokens, bonus_tokens, tier)
    fn calculate_tokens(&self, total_egld: &BigUint) -> (BigUint, BigUint, ContributionTier) {
        let price_per_seal = self.price_per_seal().get();
        let denomination = BigUint::from(10u64).pow(18);
        
        // base_tokens = (total_egld * denomination) / price_per_seal
        let base_tokens = (total_egld * &denomination) / &price_per_seal;
        
        // Determine tier and bonus
        let tier3_threshold = self.tier3_threshold().get();
        let tier2_threshold = self.tier2_threshold().get();
        let tier1_threshold = self.tier1_threshold().get();
        
        let (bonus_bps, tier) = if total_egld >= &tier3_threshold {
            (self.tier3_bonus().get(), ContributionTier::Tier3)
        } else if total_egld >= &tier2_threshold {
            (self.tier2_bonus().get(), ContributionTier::Tier2)
        } else if total_egld >= &tier1_threshold {
            (self.tier1_bonus().get(), ContributionTier::Tier1)
        } else {
            (0u32, ContributionTier::None)
        };
        
        // Calculate bonus tokens: base_tokens * bonus_bps / 10000
        let bonus_tokens = &base_tokens * bonus_bps / 10000u32;
        
        (base_tokens, bonus_tokens, tier)
    }

    /// Get total contribution for an address
    fn get_contribution(&self, address: &ManagedAddress) -> BigUint {
        if self.contributors(address).is_empty() {
            BigUint::zero()
        } else {
            self.contributors(address).get().total_contributed
        }
    }

    /// Require presale to be in Active state
    fn require_presale_active(&self) {
        let state = self.presale_state().get();
        require!(state == PresaleState::Active, "Presale is not active");
    }

    // ============ Admin Functions ============

    /// Start the presale (owner only)
    #[only_owner]
    #[endpoint(startPresale)]
    fn start_presale(&self) {
        let state = self.presale_state().get();
        require!(
            state == PresaleState::NotStarted || state == PresaleState::Paused,
            "Cannot start presale from current state"
        );
        self.presale_state().set(PresaleState::Active);
        self.presale_state_changed_event(PresaleState::Active);
    }

    /// Pause the presale (owner only)
    #[only_owner]
    #[endpoint(pausePresale)]
    fn pause_presale(&self) {
        let state = self.presale_state().get();
        require!(state == PresaleState::Active, "Presale is not active");
        self.presale_state().set(PresaleState::Paused);
        self.presale_state_changed_event(PresaleState::Paused);
    }

    /// End the presale (owner only)
    #[only_owner]
    #[endpoint(endPresale)]
    fn end_presale(&self) {
        self.presale_state().set(PresaleState::Ended);
        self.presale_state_changed_event(PresaleState::Ended);
    }

    /// Update treasury address (owner only)
    #[only_owner]
    #[endpoint(updateTreasury)]
    fn update_treasury(&self, new_treasury: ManagedAddress) {
        let old_treasury = self.treasury().get();
        self.treasury().set(&new_treasury);
        self.treasury_updated_event(&old_treasury, &new_treasury);
    }

    /// Enable/disable whitelist (owner only)
    #[only_owner]
    #[endpoint(setWhitelistEnabled)]
    fn set_whitelist_enabled(&self, enabled: bool) {
        self.whitelist_enabled().set(enabled);
    }

    /// Add addresses to whitelist (owner only)
    #[only_owner]
    #[endpoint(addToWhitelist)]
    fn add_to_whitelist(&self, addresses: MultiValueEncoded<ManagedAddress>) {
        for address in addresses {
            self.whitelist().insert(address);
        }
    }

    /// Remove addresses from whitelist (owner only)
    #[only_owner]
    #[endpoint(removeFromWhitelist)]
    fn remove_from_whitelist(&self, addresses: MultiValueEncoded<ManagedAddress>) {
        for address in addresses {
            self.whitelist().swap_remove(&address);
        }
    }

    /// Update price per SEAL (owner only, before presale starts)
    #[only_owner]
    #[endpoint(updatePricePerSeal)]
    fn update_price_per_seal(&self, new_price: BigUint) {
        let state = self.presale_state().get();
        require!(state == PresaleState::NotStarted, "Cannot update price after presale started");
        require!(new_price > BigUint::zero(), "Price must be positive");
        self.price_per_seal().set(&new_price);
    }

    /// Update purchase limits (owner only)
    #[only_owner]
    #[endpoint(updatePurchaseLimits)]
    fn update_purchase_limits(&self, min_purchase: BigUint, max_purchase: BigUint) {
        require!(min_purchase < max_purchase, "Min must be less than max");
        self.min_purchase().set(&min_purchase);
        self.max_purchase().set(&max_purchase);
    }

    /// Update total raise cap (owner only)
    #[only_owner]
    #[endpoint(updateRaiseCap)]
    fn update_raise_cap(&self, new_cap: BigUint) {
        let total_raised = self.total_raised().get();
        require!(new_cap >= total_raised, "New cap cannot be below amount already raised");
        self.total_raise_cap().set(&new_cap);
    }

    /// Withdraw any remaining SEAL tokens after presale ends (owner only)
    #[only_owner]
    #[endpoint(withdrawRemainingTokens)]
    fn withdraw_remaining_tokens(&self) {
        let state = self.presale_state().get();
        require!(state == PresaleState::Ended, "Presale must be ended");
        
        let seal_token = self.seal_token_id().get();
        let balance = self.blockchain().get_sc_balance(&EgldOrEsdtTokenIdentifier::esdt(seal_token.clone()), 0);
        
        require!(balance > BigUint::zero(), "No tokens to withdraw");
        
        let owner = self.blockchain().get_owner_address();
        self.send().direct_esdt(&owner, &seal_token, 0, &balance);
    }

    /// Emergency withdraw EGLD (owner only) - for recovery purposes
    #[only_owner]
    #[endpoint(emergencyWithdrawEgld)]
    fn emergency_withdraw_egld(&self) {
        let balance = self.blockchain().get_sc_balance(&EgldOrEsdtTokenIdentifier::egld(), 0);
        require!(balance > BigUint::zero(), "No EGLD to withdraw");
        
        let owner = self.blockchain().get_owner_address();
        self.send().direct_egld(&owner, &balance);
    }

    // ============ View Functions ============

    /// Get presale statistics
    #[view(getPresaleStats)]
    fn get_presale_stats(&self) -> MultiValue6<BigUint, u64, BigUint, BigUint, BigUint, PresaleState> {
        let total_raised = self.total_raised().get();
        let total_contributors = self.total_contributors().get();
        let tokens_sold = self.tokens_sold().get();
        let raise_cap = self.total_raise_cap().get();
        let remaining_cap = &raise_cap - &total_raised;
        let state = self.presale_state().get();
        
        (total_raised, total_contributors, tokens_sold, raise_cap, remaining_cap, state).into()
    }

    /// Get contributor information
    #[view(getContributor)]
    fn get_contributor_info(&self, address: ManagedAddress) -> MultiValue4<BigUint, BigUint, ContributionTier, bool> {
        if self.contributors(&address).is_empty() {
            return (BigUint::zero(), BigUint::zero(), ContributionTier::None, false).into();
        }
        
        let contributor = self.contributors(&address).get();
        (
            contributor.total_contributed,
            contributor.total_tokens,
            contributor.tier,
            contributor.has_claimed,
        ).into()
    }

    /// Check if address is whitelisted
    #[view(isWhitelisted)]
    fn is_whitelisted(&self, address: ManagedAddress) -> bool {
        if !self.whitelist_enabled().get() {
            return true;
        }
        self.whitelist().contains(&address)
    }

    /// Calculate tokens for a potential contribution
    #[view(calculateTokensForContribution)]
    fn calculate_tokens_for_contribution(&self, egld_amount: BigUint) -> MultiValue3<BigUint, BigUint, ContributionTier> {
        let (base, bonus, tier) = self.calculate_tokens(&egld_amount);
        (base, bonus, tier).into()
    }

    /// Get time remaining in presale
    #[view(getTimeRemaining)]
    fn get_time_remaining(&self) -> u64 {
        let current = self.blockchain().get_block_timestamp();
        let end = self.end_timestamp().get();
        
        if current >= end {
            0
        } else {
            end - current
        }
    }

    // ============ Events ============

    #[event("contribution")]
    fn contribution_event(
        &self,
        #[indexed] contributor: &ManagedAddress,
        #[indexed] egld_amount: &BigUint,
        #[indexed] total_tokens: &BigUint,
    );

    #[event("presale_state_changed")]
    fn presale_state_changed_event(&self, #[indexed] new_state: PresaleState);

    #[event("treasury_updated")]
    fn treasury_updated_event(
        &self,
        #[indexed] old_treasury: &ManagedAddress,
        #[indexed] new_treasury: &ManagedAddress,
    );

    // ============ Storage ============

    #[storage_mapper("sealTokenId")]
    fn seal_token_id(&self) -> SingleValueMapper<TokenIdentifier>;

    #[storage_mapper("treasury")]
    fn treasury(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("startTimestamp")]
    fn start_timestamp(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("endTimestamp")]
    fn end_timestamp(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("presaleState")]
    fn presale_state(&self) -> SingleValueMapper<PresaleState>;

    #[storage_mapper("pricePerSeal")]
    fn price_per_seal(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("minPurchase")]
    fn min_purchase(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("maxPurchase")]
    fn max_purchase(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("totalRaiseCap")]
    fn total_raise_cap(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("presaleSupply")]
    fn presale_supply(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("tier1Threshold")]
    fn tier1_threshold(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("tier2Threshold")]
    fn tier2_threshold(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("tier3Threshold")]
    fn tier3_threshold(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("tier1Bonus")]
    fn tier1_bonus(&self) -> SingleValueMapper<u32>;

    #[storage_mapper("tier2Bonus")]
    fn tier2_bonus(&self) -> SingleValueMapper<u32>;

    #[storage_mapper("tier3Bonus")]
    fn tier3_bonus(&self) -> SingleValueMapper<u32>;

    #[storage_mapper("totalRaised")]
    fn total_raised(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("totalContributors")]
    fn total_contributors(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("tokensSold")]
    fn tokens_sold(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("whitelistEnabled")]
    fn whitelist_enabled(&self) -> SingleValueMapper<bool>;

    #[storage_mapper("whitelist")]
    fn whitelist(&self) -> UnorderedSetMapper<ManagedAddress>;

    #[storage_mapper("contributors")]
    fn contributors(&self, address: &ManagedAddress) -> SingleValueMapper<Contributor<Self::Api>>;
}
