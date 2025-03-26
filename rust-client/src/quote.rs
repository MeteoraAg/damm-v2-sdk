use crate::extensions::PoolExtension;
use anyhow::{ensure, Ok, Result};
use cp_amm_interface::accounts::Config;
use cp_amm_interface::typedefs::{ActivationType, SwapResult, TradeDirection};
use cp_amm_interface::Pool;
use std::ops::Deref;

#[derive(Debug)]
pub struct SwapExactInQuote {
    pub amount_out: u64,
    pub fee: u64,
}

#[derive(Debug)]
pub struct SwapExactOutQuote {
    pub amount_in: u64,
    pub fee: u64,
}

fn get_current_point(pool: &Pool, current_timestamp: u64, current_slot: u64) -> Result<u64> {
    let activation_type = pool.activation_type()?;
    let current_point = match activation_type.deref() {
        ActivationType::Slot => current_slot,
        ActivationType::Timestamp => current_timestamp,
    };

    Ok(current_point)
}

pub fn quote_exact_in(
    pool: &Pool,
    config: &Config,
    a_for_b: bool,
    current_timestamp: u64,
    current_slot: u64,
    transfer_fee_excluded_amount_in: u64, // calculated from outside depend on spl-token or token2022
    is_referral: bool,
) -> Result<SwapResult> {
    let mut pool = *pool;

    ensure!(transfer_fee_excluded_amount_in > 0, "amount is zero");

    pool.update_pre_swap(current_timestamp)?;

    let current_point = get_current_point(&pool, current_timestamp, current_slot)?;

    let trade_direction = if a_for_b {
        TradeDirection::AtoB
    } else {
        TradeDirection::BtoA
    };

    let swap_result = pool.get_swap_result(
        transfer_fee_excluded_amount_in,
        is_referral,
        trade_direction,
        current_point,
    )?;

    Ok(swap_result)
}
