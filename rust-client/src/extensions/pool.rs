use std::ops::Deref;

use anyhow::{anyhow, Ok, Result};

use cp_amm_interface::{CollectFeeMode, Config, Pool, Rounding, SwapResult, TradeDirection};

use crate::{
    conversions::{ActivationTypeWrapper, CollectFeeModeWrapper},
    math::{
        get_delta_amount_a_unsigned, get_delta_amount_b_unsigned, get_next_sqrt_price_from_input,
    },
};

pub trait PoolExtension {
    fn update_pre_swap(&mut self, current_timestamp: u64) -> Result<()>;
    fn get_swap_result(
        &self,
        amount: u64,
        is_referral: bool,
        trade_direction: TradeDirection,
        current_point: u64,
    ) -> Result<SwapResult>;
    fn get_swap_result_from_a_to_b(
        &self,
        amount_in: u64,
        is_referral: bool,
        current_point: u64,
    ) -> Result<SwapResult>;
    fn get_swap_result_from_b_to_a(
        &self,
        amount_in: u64,
        is_referral: bool,
        is_skip_fee: bool,
        current_point: u64,
    ) -> Result<SwapResult>;
    fn collect_fee_mode(&self) -> Result<CollectFeeModeWrapper>;
    fn activation_type(&self) -> Result<ActivationTypeWrapper>;
}

impl PoolExtension for Pool {
    fn update_pre_swap(&mut self, current_timestamp: u64) -> Result<()> {
        if self.pool_fees.dynamic_fee.initialized != 0 {
            self.pool_fees
                .dynamic_fee
                .update_references(self.sqrt_price, current_timestamp)?;
        }

        Ok(())
    }

    fn get_swap_result(
        &self,
        amount_in: u64,
        is_referral: bool,
        trade_direction: TradeDirection,
        current_point: u64,
    ) -> Result<SwapResult> {
        let collect_fee_mode = self.collect_fee_mode()?;

        match collect_fee_mode.deref() {
            CollectFeeMode::BothToken => match trade_direction {
                TradeDirection::AtoB => {
                    self.get_swap_result_from_a_to_b(amount_in, is_referral, current_point)
                }
                TradeDirection::BtoA => {
                    self.get_swap_result_from_b_to_a(amount_in, is_referral, false, current_point)
                }
            },
            CollectFeeMode::OnlyB => match trade_direction {
                TradeDirection::AtoB => {
                    self.get_swap_result_from_a_to_b(amount_in, is_referral, current_point)
                }
                TradeDirection::BtoA => {
                    // fee will be in token b
                    let FeeOnAmountResult {
                        amount,
                        lp_fee,
                        protocol_fee,
                        partner_fee,
                        referral_fee,
                    } = self.pool_fees.get_fee_on_amount(
                        amount_in,
                        is_referral,
                        current_point,
                        self.activation_point,
                    )?;
                    // skip fee
                    let swap_result =
                        self.get_swap_result_from_b_to_a(amount, is_referral, true, current_point)?;

                    Ok(SwapResult {
                        output_amount: swap_result.output_amount,
                        next_sqrt_price: swap_result.next_sqrt_price,
                        lp_fee,
                        protocol_fee,
                        partner_fee,
                        referral_fee,
                    })
                }
            },
        }
    }

    fn get_swap_result_from_a_to_b(
        &self,
        amount_in: u64,
        is_referral: bool,
        current_point: u64,
    ) -> Result<SwapResult> {
        // finding new target price
        let next_sqrt_price =
            get_next_sqrt_price_from_input(self.sqrt_price, self.liquidity, amount_in, true)?;

        if next_sqrt_price < self.sqrt_min_price {
            return Err(anyhow::anyhow!("PriceRangeViolation"));
        }

        // finding output amount
        let output_amount = get_delta_amount_b_unsigned(
            next_sqrt_price,
            self.sqrt_price,
            self.liquidity,
            Rounding::Down,
        )?;

        let FeeOnAmountResult {
            amount,
            lp_fee,
            protocol_fee,
            partner_fee,
            referral_fee,
        } = self.pool_fees.get_fee_on_amount(
            output_amount,
            is_referral,
            current_point,
            self.activation_point,
        )?;
        Ok(SwapResult {
            output_amount: amount,
            lp_fee,
            protocol_fee,
            partner_fee,
            referral_fee,
            next_sqrt_price,
        })
    }

    fn get_swap_result_from_b_to_a(
        &self,
        amount_in: u64,
        is_referral: bool,
        is_skip_fee: bool,
        current_point: u64,
    ) -> Result<SwapResult> {
        // finding new target price
        let next_sqrt_price =
            get_next_sqrt_price_from_input(self.sqrt_price, self.liquidity, amount_in, false)?;

        if next_sqrt_price > self.sqrt_max_price {
            return Err(anyhow::anyhow!("PriceRangeViolation"));
        }
        // finding output amount
        let output_amount = get_delta_amount_a_unsigned(
            self.sqrt_price,
            next_sqrt_price,
            self.liquidity,
            Rounding::Down,
        )?;

        if is_skip_fee {
            Ok(SwapResult {
                output_amount,
                lp_fee: 0,
                protocol_fee: 0,
                partner_fee: 0,
                referral_fee: 0,
                next_sqrt_price,
            })
        } else {
            let FeeOnAmountResult {
                amount,
                lp_fee,
                protocol_fee,
                partner_fee,
                referral_fee,
            } = self.pool_fees.get_fee_on_amount(
                output_amount,
                is_referral,
                current_point,
                self.activation_point,
            )?;
            Ok(SwapResult {
                output_amount: amount,
                lp_fee,
                protocol_fee,
                partner_fee,
                referral_fee,
                next_sqrt_price,
            })
        }
    }

    fn collect_fee_mode(&self) -> Result<CollectFeeModeWrapper> {
        Ok(self.collect_fee_mode.try_into()?)
    }
    fn activation_type(&self) -> Result<ActivationTypeWrapper> {
        Ok(self.activation_type.try_into()?)
    }
}
