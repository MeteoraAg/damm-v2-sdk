use cp_amm_interface::Rounding;
use ruint::aliases::U256;

use anyhow::{ensure, Context, Ok, Result};

use crate::math::mul_div_u256;

pub const RESOLUTION: u8 = 64;

pub fn get_initialize_amounts(
    sqrt_min_price: u128,
    sqrt_max_price: u128,
    sqrt_price: u128,
    liquidity: u128,
) -> Result<(u64, u64)> {
    // BASE TOKEN
    let amount_a =
        get_delta_amount_a_unsigned(sqrt_price, sqrt_max_price, liquidity, Rounding::Up)?;
    // QUOTE TOKEN
    let amount_b =
        get_delta_amount_b_unsigned(sqrt_min_price, sqrt_price, liquidity, Rounding::Up)?;
    Ok((amount_a, amount_b))
}

/// Gets the delta amount_a for given liquidity and price range
///
/// # Formula
///
/// * `Δa = L * (1 / √P_lower - 1 / √P_upper)`
/// * i.e. `L * (√P_upper - √P_lower) / (√P_upper * √P_lower)`
pub fn get_delta_amount_a_unsigned(
    lower_sqrt_price: u128,
    upper_sqrt_price: u128,
    liquidity: u128,
    round: Rounding,
) -> Result<u64> {
    let result = get_delta_amount_a_unsigned_unchecked(
        lower_sqrt_price,
        upper_sqrt_price,
        liquidity,
        round,
    )?;
    ensure!(result <= U256::from(u64::MAX), "MathMathOverflow");

    return Ok(result.try_into().context("CastTypeFailed")?);
}

/// * i.e. `L * (√P_upper - √P_lower) / (√P_upper * √P_lower)`
pub fn get_delta_amount_a_unsigned_unchecked(
    lower_sqrt_price: u128,
    upper_sqrt_price: u128,
    liquidity: u128,
    round: Rounding,
) -> Result<U256> {
    let numerator_1 = U256::from(liquidity);
    let numerator_2 = U256::from(upper_sqrt_price - lower_sqrt_price);

    let denominator = U256::from(lower_sqrt_price)
        .checked_mul(U256::from(upper_sqrt_price))
        .context("MathOverflow")?;

    assert!(denominator > U256::ZERO);
    let result =
        mul_div_u256(numerator_1, numerator_2, denominator, round).context("MathMathOverflow")?;
    return Ok(result);
}

/// Gets the delta amount_b for given liquidity and price range
/// * `Δb = L (√P_upper - √P_lower)`
pub fn get_delta_amount_b_unsigned(
    lower_sqrt_price: u128,
    upper_sqrt_price: u128,
    liquidity: u128,
    round: Rounding,
) -> Result<u64> {
    let result = get_delta_amount_b_unsigned_unchecked(
        lower_sqrt_price,
        upper_sqrt_price,
        liquidity,
        round,
    )?;
    ensure!(result <= U256::from(u64::MAX), "MathMathOverflow");
    return Ok(result.try_into().context("TypeCastFailed")?);
}

//Δb = L (√P_upper - √P_lower)
pub fn get_delta_amount_b_unsigned_unchecked(
    lower_sqrt_price: u128,
    upper_sqrt_price: u128,
    liquidity: u128,
    round: Rounding,
) -> Result<U256> {
    let liquidity = U256::from(liquidity);
    let delta_sqrt_price = U256::from(upper_sqrt_price - lower_sqrt_price);
    let prod = liquidity
        .checked_mul(delta_sqrt_price)
        .context("MathMathOverflow")?;

    match round {
        Rounding::Up => {
            let denominator = U256::from(1)
                .checked_shl((RESOLUTION as usize) * 2)
                .context("MathOverflow")?;
            let result = prod.div_ceil(denominator);
            Ok(result)
        }
        Rounding::Down => {
            let (result, _) = prod.overflowing_shr((RESOLUTION as usize) * 2);
            Ok(result)
        }
    }
}

/// Gets the next sqrt price given an input amount of token_a or token_b
/// Throws if price or liquidity are 0, or if the next price is out of bounds
pub fn get_next_sqrt_price_from_input(
    sqrt_price: u128,
    liquidity: u128,
    amount_in: u64,
    a_for_b: bool,
) -> Result<u128> {
    assert!(sqrt_price > 0);
    assert!(liquidity > 0);

    // round to make sure that we don't pass the target price
    if a_for_b {
        get_next_sqrt_price_from_amount_a_rounding_up(sqrt_price, liquidity, amount_in)
    } else {
        get_next_sqrt_price_from_amount_b_rounding_down(sqrt_price, liquidity, amount_in)
    }
}

pub fn get_next_sqrt_price_from_amount_a_rounding_up(
    sqrt_price: u128,
    liquidity: u128,
    amount: u64,
) -> Result<u128> {
    if amount == 0 {
        return Ok(sqrt_price);
    }
    let sqrt_price = U256::from(sqrt_price);
    let liquidity = U256::from(liquidity);

    let product = U256::from(amount)
        .checked_mul(sqrt_price)
        .context("MathOverflow")?;
    let denominator = liquidity
        .checked_add(U256::from(product))
        .context("MathOverflow")?;
    let result =
        mul_div_u256(liquidity, sqrt_price, denominator, Rounding::Up).context("MathOverflow")?;
    return Ok(result.try_into().context("TypeCastFailed")?);
}

pub fn get_next_sqrt_price_from_amount_b_rounding_down(
    sqrt_price: u128,
    liquidity: u128,
    amount: u64,
) -> Result<u128> {
    let quotient = U256::from(amount)
        .checked_shl((RESOLUTION * 2) as usize)
        .context("MathOverflow")?
        .checked_div(U256::from(liquidity))
        .context("MathOverflow")?;

    let result = U256::from(sqrt_price)
        .checked_add(quotient)
        .context("MathOverflow")?;
    Ok(result.try_into().context("TypeCastFailed")?)
}
