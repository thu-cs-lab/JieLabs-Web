use crate::ws_board::WSBoard;
use actix::prelude::*;
use log::*;
use serde_derive::Serialize;

#[derive(Message)]
#[rtype(result = "()")]
pub struct RegisterBoard {
    pub addr: Addr<WSBoard>,
    pub info: BoardInfo,
}

#[derive(Debug, Clone, Serialize)]
pub struct BoardInfo {
    pub remote: String,
    pub software_version: String,
    pub hardware_version: String,
}

#[derive(MessageResponse)]
pub struct BoardInfoList(pub Vec<BoardInfo>);

#[derive(Message)]
#[rtype(result = "BoardInfoList")]
pub struct GetBoardList;

#[derive(Default)]
pub struct BoardManagerActor {
    boards: Vec<(Addr<WSBoard>, BoardInfo)>,
}

impl actix::Supervised for BoardManagerActor {}
impl SystemService for BoardManagerActor {
    fn service_started(&mut self, _ctx: &mut Context<Self>) {
        info!("board manager is up");
    }
}

impl Actor for BoardManagerActor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Context<Self>) {}
}

impl Handler<RegisterBoard> for BoardManagerActor {
    type Result = ();

    fn handle(&mut self, board: RegisterBoard, _ctx: &mut Context<Self>) -> () {
        info!("board registered {:?}", board.info);
        self.boards.push((board.addr, board.info));
    }
}

impl Handler<GetBoardList> for BoardManagerActor {
    type Result = BoardInfoList;

    fn handle(&mut self, _req: GetBoardList, _ctx: &mut Context<Self>) -> BoardInfoList {
        let mut res = vec![];
        for board in &self.boards {
            res.push(board.1.clone());
        }
        BoardInfoList(res)
    }
}

pub fn get_board_manager() -> Addr<BoardManagerActor> {
    BoardManagerActor::from_registry()
}
