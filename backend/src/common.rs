use serde_derive::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug)]
pub struct IOSetting {
    pub mask: u64,
    pub data: u64,
}

pub fn generate_uuid() -> String {
    let uuid = Uuid::new_v4();
    uuid.to_simple()
        .encode_lower(&mut Uuid::encode_buffer())
        .to_owned()
}
