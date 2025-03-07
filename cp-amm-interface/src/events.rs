use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;
use crate::*;
pub const EVT_CLOSE_CONFIG_EVENT_DISCM: [u8; 8] = [36, 30, 239, 45, 58, 132, 14, 5];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtCloseConfig {
    config: Pubkey,
    admin: Pubkey,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtCloseConfigEvent(pub EvtCloseConfig);
impl BorshSerialize for EvtCloseConfigEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_CLOSE_CONFIG_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtCloseConfigEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_CLOSE_CONFIG_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_CLOSE_CONFIG_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtCloseConfig::deserialize(buf)?))
    }
}
pub const EVT_CREATE_CONFIG_EVENT_DISCM: [u8; 8] = [
    131,
    207,
    180,
    174,
    180,
    73,
    165,
    54,
];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtCreateConfig {
    pool_fees: PoolFeeParamters,
    vault_config_key: Pubkey,
    pool_creator_authority: Pubkey,
    activation_type: u8,
    sqrt_min_price: u128,
    sqrt_max_price: u128,
    collect_fee_mode: u8,
    index: u64,
    config: Pubkey,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtCreateConfigEvent(pub EvtCreateConfig);
impl BorshSerialize for EvtCreateConfigEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_CREATE_CONFIG_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtCreateConfigEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_CREATE_CONFIG_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_CREATE_CONFIG_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtCreateConfig::deserialize(buf)?))
    }
}
pub const EVT_CREATE_TOKEN_BADGE_EVENT_DISCM: [u8; 8] = [
    141,
    120,
    134,
    116,
    34,
    28,
    114,
    160,
];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtCreateTokenBadge {
    token_mint: Pubkey,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtCreateTokenBadgeEvent(pub EvtCreateTokenBadge);
impl BorshSerialize for EvtCreateTokenBadgeEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_CREATE_TOKEN_BADGE_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtCreateTokenBadgeEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_CREATE_TOKEN_BADGE_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_CREATE_TOKEN_BADGE_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtCreateTokenBadge::deserialize(buf)?))
    }
}
pub const EVT_CREATE_CLAIM_FEE_OPERATOR_EVENT_DISCM: [u8; 8] = [
    21,
    6,
    153,
    120,
    68,
    116,
    28,
    177,
];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtCreateClaimFeeOperator {
    operator: Pubkey,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtCreateClaimFeeOperatorEvent(pub EvtCreateClaimFeeOperator);
impl BorshSerialize for EvtCreateClaimFeeOperatorEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_CREATE_CLAIM_FEE_OPERATOR_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtCreateClaimFeeOperatorEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_CREATE_CLAIM_FEE_OPERATOR_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_CREATE_CLAIM_FEE_OPERATOR_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtCreateClaimFeeOperator::deserialize(buf)?))
    }
}
pub const EVT_CLOSE_CLAIM_FEE_OPERATOR_EVENT_DISCM: [u8; 8] = [
    111,
    39,
    37,
    55,
    110,
    216,
    194,
    23,
];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtCloseClaimFeeOperator {
    claim_fee_operator: Pubkey,
    operator: Pubkey,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtCloseClaimFeeOperatorEvent(pub EvtCloseClaimFeeOperator);
impl BorshSerialize for EvtCloseClaimFeeOperatorEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_CLOSE_CLAIM_FEE_OPERATOR_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtCloseClaimFeeOperatorEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_CLOSE_CLAIM_FEE_OPERATOR_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_CLOSE_CLAIM_FEE_OPERATOR_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtCloseClaimFeeOperator::deserialize(buf)?))
    }
}
pub const EVT_INITIALIZE_POOL_EVENT_DISCM: [u8; 8] = [
    228,
    50,
    246,
    85,
    203,
    66,
    134,
    37,
];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtInitializePool {
    token_a_mint: Pubkey,
    token_b_mint: Pubkey,
    creator: Pubkey,
    payer: Pubkey,
    alpha_vault: Pubkey,
    pool_fees: PoolFeeParamters,
    sqrt_min_price: u128,
    sqrt_max_price: u128,
    activation_type: u8,
    collect_fee_mode: u8,
    liquidity: u128,
    sqrt_price: u128,
    activation_point: u64,
    token_a_flag: u8,
    token_b_flag: u8,
    total_amount_a: u64,
    total_amount_b: u64,
    pool_type: u8,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtInitializePoolEvent(pub EvtInitializePool);
impl BorshSerialize for EvtInitializePoolEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_INITIALIZE_POOL_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtInitializePoolEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_INITIALIZE_POOL_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_INITIALIZE_POOL_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtInitializePool::deserialize(buf)?))
    }
}
pub const EVT_ADD_LIQUIDITY_EVENT_DISCM: [u8; 8] = [175, 242, 8, 157, 30, 247, 185, 169];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtAddLiquidity {
    pool: Pubkey,
    position: Pubkey,
    owner: Pubkey,
    params: AddLiquidityParameters,
    total_amount_a: u64,
    total_amount_b: u64,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtAddLiquidityEvent(pub EvtAddLiquidity);
impl BorshSerialize for EvtAddLiquidityEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_ADD_LIQUIDITY_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtAddLiquidityEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_ADD_LIQUIDITY_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_ADD_LIQUIDITY_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtAddLiquidity::deserialize(buf)?))
    }
}
pub const EVT_CLAIM_POSITION_FEE_EVENT_DISCM: [u8; 8] = [
    198,
    182,
    183,
    52,
    97,
    12,
    49,
    56,
];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtClaimPositionFee {
    pool: Pubkey,
    position: Pubkey,
    owner: Pubkey,
    fee_a_claimed: u64,
    fee_b_claimed: u64,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtClaimPositionFeeEvent(pub EvtClaimPositionFee);
impl BorshSerialize for EvtClaimPositionFeeEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_CLAIM_POSITION_FEE_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtClaimPositionFeeEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_CLAIM_POSITION_FEE_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_CLAIM_POSITION_FEE_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtClaimPositionFee::deserialize(buf)?))
    }
}
pub const EVT_CREATE_POSITION_EVENT_DISCM: [u8; 8] = [
    156,
    15,
    119,
    198,
    29,
    181,
    221,
    55,
];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtCreatePosition {
    pool: Pubkey,
    owner: Pubkey,
    position: Pubkey,
    position_nft_mint: Pubkey,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtCreatePositionEvent(pub EvtCreatePosition);
impl BorshSerialize for EvtCreatePositionEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_CREATE_POSITION_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtCreatePositionEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_CREATE_POSITION_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_CREATE_POSITION_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtCreatePosition::deserialize(buf)?))
    }
}
pub const EVT_REMOVE_LIQUIDITY_EVENT_DISCM: [u8; 8] = [87, 46, 88, 98, 175, 96, 34, 91];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtRemoveLiquidity {
    pool: Pubkey,
    position: Pubkey,
    owner: Pubkey,
    params: RemoveLiquidityParameters,
    amount_a: u64,
    amount_b: u64,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtRemoveLiquidityEvent(pub EvtRemoveLiquidity);
impl BorshSerialize for EvtRemoveLiquidityEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_REMOVE_LIQUIDITY_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtRemoveLiquidityEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_REMOVE_LIQUIDITY_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_REMOVE_LIQUIDITY_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtRemoveLiquidity::deserialize(buf)?))
    }
}
pub const EVT_SWAP_EVENT_DISCM: [u8; 8] = [27, 60, 21, 213, 138, 170, 187, 147];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtSwap {
    pool: Pubkey,
    trade_direction: u8,
    is_referral: bool,
    params: SwapParameters,
    swap_result: SwapResult,
    transfer_fee_excluded_amount_in: u64,
    current_timestamp: u64,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtSwapEvent(pub EvtSwap);
impl BorshSerialize for EvtSwapEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_SWAP_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtSwapEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_SWAP_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_SWAP_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtSwap::deserialize(buf)?))
    }
}
pub const EVT_LOCK_POSITION_EVENT_DISCM: [u8; 8] = [168, 63, 108, 83, 219, 82, 2, 200];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtLockPosition {
    pool: Pubkey,
    position: Pubkey,
    owner: Pubkey,
    vesting: Pubkey,
    cliff_point: u64,
    period_frequency: u64,
    cliff_unlock_liquidity: u128,
    liquidity_per_period: u128,
    number_of_period: u16,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtLockPositionEvent(pub EvtLockPosition);
impl BorshSerialize for EvtLockPositionEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_LOCK_POSITION_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtLockPositionEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_LOCK_POSITION_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_LOCK_POSITION_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtLockPosition::deserialize(buf)?))
    }
}
pub const EVT_PERMANENT_LOCK_POSITION_EVENT_DISCM: [u8; 8] = [
    145,
    143,
    162,
    218,
    218,
    80,
    67,
    11,
];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtPermanentLockPosition {
    pool: Pubkey,
    position: Pubkey,
    liquidity: u128,
    pool_new_permanent_locked_liquidity: u128,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtPermanentLockPositionEvent(pub EvtPermanentLockPosition);
impl BorshSerialize for EvtPermanentLockPositionEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_PERMANENT_LOCK_POSITION_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtPermanentLockPositionEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_PERMANENT_LOCK_POSITION_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_PERMANENT_LOCK_POSITION_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtPermanentLockPosition::deserialize(buf)?))
    }
}
pub const EVT_CLAIM_PROTOCOL_FEE_EVENT_DISCM: [u8; 8] = [
    186,
    244,
    75,
    251,
    188,
    13,
    25,
    33,
];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtClaimProtocolFee {
    pool: Pubkey,
    token_a_amount: u64,
    token_b_amount: u64,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtClaimProtocolFeeEvent(pub EvtClaimProtocolFee);
impl BorshSerialize for EvtClaimProtocolFeeEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_CLAIM_PROTOCOL_FEE_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtClaimProtocolFeeEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_CLAIM_PROTOCOL_FEE_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_CLAIM_PROTOCOL_FEE_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtClaimProtocolFee::deserialize(buf)?))
    }
}
pub const EVT_CLAIM_PARTNER_FEE_EVENT_DISCM: [u8; 8] = [118, 99, 77, 10, 226, 1, 1, 87];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtClaimPartnerFee {
    pool: Pubkey,
    token_a_amount: u64,
    token_b_amount: u64,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtClaimPartnerFeeEvent(pub EvtClaimPartnerFee);
impl BorshSerialize for EvtClaimPartnerFeeEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_CLAIM_PARTNER_FEE_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtClaimPartnerFeeEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_CLAIM_PARTNER_FEE_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_CLAIM_PARTNER_FEE_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtClaimPartnerFee::deserialize(buf)?))
    }
}
pub const EVT_SET_POOL_STATUS_EVENT_DISCM: [u8; 8] = [100, 213, 74, 3, 95, 91, 228, 146];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtSetPoolStatus {
    pool: Pubkey,
    status: u8,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtSetPoolStatusEvent(pub EvtSetPoolStatus);
impl BorshSerialize for EvtSetPoolStatusEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_SET_POOL_STATUS_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtSetPoolStatusEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_SET_POOL_STATUS_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_SET_POOL_STATUS_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtSetPoolStatus::deserialize(buf)?))
    }
}
pub const EVT_INITIALIZE_REWARD_EVENT_DISCM: [u8; 8] = [
    129,
    91,
    188,
    3,
    246,
    52,
    185,
    249,
];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtInitializeReward {
    pool: Pubkey,
    reward_mint: Pubkey,
    funder: Pubkey,
    reward_index: u8,
    reward_duration: u64,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtInitializeRewardEvent(pub EvtInitializeReward);
impl BorshSerialize for EvtInitializeRewardEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_INITIALIZE_REWARD_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtInitializeRewardEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_INITIALIZE_REWARD_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_INITIALIZE_REWARD_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtInitializeReward::deserialize(buf)?))
    }
}
pub const EVT_FUND_REWARD_EVENT_DISCM: [u8; 8] = [104, 233, 237, 122, 199, 191, 121, 85];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtFundReward {
    pool: Pubkey,
    funder: Pubkey,
    mint_reward: Pubkey,
    reward_index: u8,
    amount: u64,
    transfer_fee_excluded_amount_in: u64,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtFundRewardEvent(pub EvtFundReward);
impl BorshSerialize for EvtFundRewardEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_FUND_REWARD_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtFundRewardEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_FUND_REWARD_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_FUND_REWARD_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtFundReward::deserialize(buf)?))
    }
}
pub const EVT_CLAIM_REWARD_EVENT_DISCM: [u8; 8] = [
    218,
    86,
    147,
    200,
    235,
    188,
    215,
    231,
];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtClaimReward {
    pool: Pubkey,
    position: Pubkey,
    owner: Pubkey,
    mint_reward: Pubkey,
    reward_index: u8,
    total_reward: u64,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtClaimRewardEvent(pub EvtClaimReward);
impl BorshSerialize for EvtClaimRewardEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_CLAIM_REWARD_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtClaimRewardEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_CLAIM_REWARD_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_CLAIM_REWARD_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtClaimReward::deserialize(buf)?))
    }
}
pub const EVT_UPDATE_REWARD_DURATION_EVENT_DISCM: [u8; 8] = [
    149,
    135,
    65,
    231,
    129,
    153,
    65,
    57,
];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtUpdateRewardDuration {
    pool: Pubkey,
    reward_index: u8,
    old_reward_duration: u64,
    new_reward_duration: u64,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtUpdateRewardDurationEvent(pub EvtUpdateRewardDuration);
impl BorshSerialize for EvtUpdateRewardDurationEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_UPDATE_REWARD_DURATION_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtUpdateRewardDurationEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_UPDATE_REWARD_DURATION_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_UPDATE_REWARD_DURATION_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtUpdateRewardDuration::deserialize(buf)?))
    }
}
pub const EVT_UPDATE_REWARD_FUNDER_EVENT_DISCM: [u8; 8] = [
    76,
    154,
    208,
    13,
    40,
    115,
    246,
    146,
];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtUpdateRewardFunder {
    pool: Pubkey,
    reward_index: u8,
    old_funder: Pubkey,
    new_funder: Pubkey,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtUpdateRewardFunderEvent(pub EvtUpdateRewardFunder);
impl BorshSerialize for EvtUpdateRewardFunderEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_UPDATE_REWARD_FUNDER_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtUpdateRewardFunderEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_UPDATE_REWARD_FUNDER_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_UPDATE_REWARD_FUNDER_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtUpdateRewardFunder::deserialize(buf)?))
    }
}
pub const EVT_WITHDRAW_INELIGIBLE_REWARD_EVENT_DISCM: [u8; 8] = [
    248,
    215,
    184,
    78,
    31,
    180,
    179,
    168,
];
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize)]
pub struct EvtWithdrawIneligibleReward {
    pool: Pubkey,
    reward_mint: Pubkey,
    amount: u64,
}
#[derive(Clone, Debug, PartialEq)]
pub struct EvtWithdrawIneligibleRewardEvent(pub EvtWithdrawIneligibleReward);
impl BorshSerialize for EvtWithdrawIneligibleRewardEvent {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        EVT_WITHDRAW_INELIGIBLE_REWARD_EVENT_DISCM.serialize(writer)?;
        self.0.serialize(writer)
    }
}
impl EvtWithdrawIneligibleRewardEvent {
    pub fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let maybe_discm = <[u8; 8]>::deserialize(buf)?;
        if maybe_discm != EVT_WITHDRAW_INELIGIBLE_REWARD_EVENT_DISCM {
            return Err(
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!(
                        "discm does not match. Expected: {:?}. Received: {:?}",
                        EVT_WITHDRAW_INELIGIBLE_REWARD_EVENT_DISCM, maybe_discm
                    ),
                ),
            );
        }
        Ok(Self(EvtWithdrawIneligibleReward::deserialize(buf)?))
    }
}
