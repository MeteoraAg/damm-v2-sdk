use cp_amm_interface::CollectFeeMode;
use std::ops::Deref;

pub struct CollectFeeModeWrapper(CollectFeeMode);

impl Deref for CollectFeeModeWrapper {
    type Target = CollectFeeMode;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl TryFrom<u8> for CollectFeeModeWrapper {
    type Error = anyhow::Error;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(CollectFeeModeWrapper(CollectFeeMode::BothToken)),
            1 => Ok(CollectFeeModeWrapper(CollectFeeMode::OnlyB)),
            _ => Err(anyhow::anyhow!("Invalid ActivationType value: {}", value)),
        }
    }
}
