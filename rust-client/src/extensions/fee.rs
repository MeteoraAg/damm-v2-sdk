use cp_amm_interface::{BaseFeeStruct, DynamicFeeStruct, PoolFeesStruct};

pub trait BaseFeeExtension {}

impl BaseFeeExtension for BaseFeeStruct {}

pub trait DynamicFeeExtension {}

impl DynamicFeeExtension for DynamicFeeStruct {}
pub trait PoolFeesExtension {}

impl PoolFeesExtension for PoolFeesStruct {}
