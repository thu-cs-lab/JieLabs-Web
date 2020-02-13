use crate::ws_board::WSBoard;
use crate::ws_user::RequestForBoardResult;
use crate::ws_user::WSUser;
use actix::prelude::*;
use bimap::BiMap;
use log::*;
use serde_derive::Serialize;
use std::hash::{Hash, Hasher};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, PartialEq, Eq, Hash)]
pub struct BoardInfo {
    pub remote: String,
    pub software_version: String,
    pub hardware_version: String,
}

#[derive(PartialEq, Eq, Hash, Clone)]
struct BoardStat {
    addr: Addr<WSBoard>,
    info: BoardInfo,
}

#[derive(Eq)]
struct UserStat {
    addr: Addr<WSUser>,
    user_name: String,
}

impl PartialEq for UserStat {
    fn eq(&self, other: &Self) -> bool {
        self.user_name == other.user_name
    }
}

impl Hash for UserStat {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.user_name.hash(state);
    }
}

#[derive(Default)]
pub struct BoardManagerActor {
    idle_boards: Vec<BoardStat>,
    connections: BiMap<UserStat, BoardStat>,
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
            actor.idle_boards.retain(|board| !board.addr.connected());
            for (user, board) in &actor.connections {
                if !user.addr.connected() && board.addr.connected() {
                    actor.idle_boards.push(board.clone());
                }
            }
            actor.connections.retain(|user, board| {
                return !user.addr.connected() || !board.addr.connected();
            });
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
        self.idle_boards.push(BoardStat {
            addr: board.addr,
            info: board.info,
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
        for board in &self.idle_boards {
            res.push(board.info.clone());
        }
        for (_, board) in &self.connections {
            res.push(board.info.clone());
        }
        BoardInfoList(res)
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct RequestForBoard {
    pub user: Addr<WSUser>,
    pub user_name: String,
}

impl Handler<RequestForBoard> for BoardManagerActor {
    type Result = ();

    fn handle(&mut self, req: RequestForBoard, _ctx: &mut Context<Self>) {
        let addr = req.user.clone();
        let user_stat = UserStat {
            addr: req.user,
            user_name: req.user_name,
        };
        if let Some(board) = self.connections.get_by_left(&user_stat).cloned() {
            // this user has one connection already, remove old one
            self.connections.remove_by_right(&board);
            self.idle_boards.push(board);
        }
        let res = if let Some(board) = self.idle_boards.pop() {
            self.connections.insert(user_stat, board);
            true
        } else {
            false
        };
        addr.do_send(RequestForBoardResult(res));
    }
}

pub fn get_board_manager() -> Addr<BoardManagerActor> {
    BoardManagerActor::from_registry()
}
