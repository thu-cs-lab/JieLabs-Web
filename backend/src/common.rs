use serde_derive::{Deserialize, Serialize};
#[derive(Serialize, Deserialize, Debug)]
pub struct IOSetting {
    pub mask: u64,
    pub data: u64,
}
