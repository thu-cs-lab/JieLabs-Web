use crate::ws_board::WSBoard;
use crate::ws_user::WSUser;
use actix::prelude::*;
use log::*;
use serde_derive::Serialize;
use std::time::Duration;

#[derive(Debug, Clone, Serialize)]
pub struct BoardInfo {
    pub remote: String,
    pub software_version: String,
    pub hardware_version: String,
}

struct BoardStat {
    addr: Addr<WSBoard>,
    info: BoardInfo,
    user: Option<Addr<WSUser>>,
}

#[derive(Default)]
pub struct BoardManagerActor {
    boards: Vec<BoardStat>,
}

impl actix::Supervised for BoardManagerActor {}

impl SystemService for BoardManagerActor {
    fn service_started(&mut self, _ctx: &mut Context<Self>) {
        info!("board manager is up");
    }
}

impl Actor for BoardManagerActor {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Context<Self>) {
        // cleanup disconnected clients
        ctx.run_interval(Duration::from_secs(5), |actor, _ctx| {
            for board in &mut actor.boards {
                if let Some(user) = &mut board.user {
                    if !user.connected() {
                        board.user = None;
                    }
                }
            }
            actor.boards.retain(|board| !board.addr.connected());
        });
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct RegisterBoard {
    pub addr: Addr<WSBoard>,
    pub info: BoardInfo,
}

impl Handler<RegisterBoard> for BoardManagerActor {
    type Result = ();

    fn handle(&mut self, board: RegisterBoard, _ctx: &mut Context<Self>) -> () {
        info!("board registered {:?}", board.info);
        self.boards.push(BoardStat {
            addr: board.addr,
            info: board.info,
            user: None,
        });
    }
}

#[derive(MessageResponse)]
pub struct BoardInfoList(pub Vec<BoardInfo>);

#[derive(Message)]
#[rtype(result = "BoardInfoList")]
pub struct GetBoardList;

impl Handler<GetBoardList> for BoardManagerActor {
    type Result = BoardInfoList;

    fn handle(&mut self, _req: GetBoardList, _ctx: &mut Context<Self>) -> BoardInfoList {
        let mut res = vec![];
        for board in &self.boards {
            res.push(board.info.clone());
        }
        BoardInfoList(res)
    }
}

#[derive(Message)]
#[rtype(result = "Option<Addr<WSBoard>>")]
pub struct RequestForBoard {
    pub user: Addr<WSUser>,
    pub user_name: String,
}

impl Handler<RequestForBoard> for BoardManagerActor {
    type Result = Option<Addr<WSBoard>>;

    fn handle(&mut self, req: RequestForBoard, _ctx: &mut Context<Self>) -> Option<Addr<WSBoard>> {
        for board in &mut self.boards {
            if let None = board.user {
                board.user = Some(req.user.clone());
                info!(
                    "board {} is assigned to {}",
                    board.info.remote, req.user_name
                );
                return Some(board.addr.clone());
            }
        }
        return None;
    }
}

pub fn get_board_manager() -> Addr<BoardManagerActor> {
    BoardManagerActor::from_registry()
}
