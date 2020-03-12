use crate::ws_board::{
    ProgramBitstream, SendToBoard, WSBoard, WSBoardMessageB2S, WSBoardMessageS2B,
};
use crate::ws_user::RequestForBoardResult;
use crate::ws_user::{BoardDisconnected, SendToUser, WSUser};
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
            actor.idle_boards.retain(|board| board.addr.connected());
            for (user, board) in &actor.connections {
                if !user.addr.connected() && board.addr.connected() {
                    actor.idle_boards.push(board.clone());
                } else if user.addr.connected() && !board.addr.connected() {
                    user.addr.do_send(BoardDisconnected);
                }
            }
            actor.connections.retain(|user, board| {
                return user.addr.connected() && board.addr.connected();
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
        info!("board registered {:?}", board.info,);
        self.idle_boards.push(BoardStat {
            addr: board.addr,
            info: board.info,
        });
    }
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq, Hash)]
pub struct BoardInfo2 {
    pub board: BoardInfo,
    pub connected_user: Option<String>,
}

#[derive(MessageResponse)]
pub struct BoardInfoList(pub Vec<BoardInfo2>);

#[derive(Message)]
#[rtype(result = "BoardInfoList")]
pub struct GetBoardList;

impl Handler<GetBoardList> for BoardManagerActor {
    type Result = BoardInfoList;

    fn handle(&mut self, _req: GetBoardList, _ctx: &mut Context<Self>) -> BoardInfoList {
        let mut res = vec![];
        for (user, board) in &self.connections {
            res.push(BoardInfo2 {
                board: board.info.clone(),
                connected_user: Some(user.user_name.clone()),
            });
        }
        for board in &self.idle_boards {
            res.push(BoardInfo2 {
                board: board.info.clone(),
                connected_user: None,
            });
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
            let old = self.connections.remove_by_right(&board);
            self.idle_boards.push(board);
            if let Some((old_user, old_board)) = old {
                old_user.addr.do_send(BoardDisconnected);
                info!(
                    "kicking user {} old connection to board {}",
                    old_user.user_name, old_board.info.remote
                );
            }
        }
        let res = if let Some(board) = self.idle_boards.pop() {
            info!(
                "connect user {} to board {}",
                user_stat.user_name, board.info.remote
            );
            let remote = board.info.remote.clone();
            self.connections.insert(user_stat, board);
            Some(remote)
        } else {
            info!("no idle boards, can't allocate");
            None
        };
        addr.do_send(RequestForBoardResult(res));
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct RouteToBoard {
    pub user: Addr<WSUser>,
    pub user_name: String,
    pub action: WSBoardMessageS2B,
}

impl Handler<RouteToBoard> for BoardManagerActor {
    type Result = ();

    fn handle(&mut self, req: RouteToBoard, _ctx: &mut Context<Self>) {
        let user_stat = UserStat {
            addr: req.user,
            user_name: req.user_name,
        };
        // TODO: filter unneed actions
        if let Some(board) = self.connections.get_by_left(&user_stat) {
            board.addr.do_send(SendToBoard { action: req.action });
        }
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct ProgramBitstreamToBoard {
    pub user: Addr<WSUser>,
    pub user_name: String,
    pub data: bytes::Bytes,
}

impl Handler<ProgramBitstreamToBoard> for BoardManagerActor {
    type Result = ();

    fn handle(&mut self, req: ProgramBitstreamToBoard, _ctx: &mut Context<Self>) {
        let user_stat = UserStat {
            addr: req.user,
            user_name: req.user_name,
        };
        if let Some(board) = self.connections.get_by_left(&user_stat) {
            board.addr.do_send(ProgramBitstream { data: req.data });
        } else {
            user_stat.addr.do_send(SendToUser {
                action: WSBoardMessageB2S::ProgramBitstreamFinish(false),
            });
        }
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct RouteToUser {
    pub addr: Addr<WSBoard>,
    pub info: BoardInfo,
    pub action: WSBoardMessageB2S,
}

impl Handler<RouteToUser> for BoardManagerActor {
    type Result = ();

    fn handle(&mut self, req: RouteToUser, _ctx: &mut Context<Self>) {
        let board = BoardStat {
            addr: req.addr,
            info: req.info,
        };
        // TODO: filter unneed actions
        if let Some(user) = self.connections.get_by_right(&board) {
            user.addr.do_send(SendToUser { action: req.action });
        }
    }
}

#[derive(Message)]
#[rtype(result = "bool")]
pub struct SendToBoardByRemote {
    pub remote: String,
    pub action: WSBoardMessageS2B,
}

impl Handler<SendToBoardByRemote> for BoardManagerActor {
    type Result = bool;

    fn handle(&mut self, req: SendToBoardByRemote, _ctx: &mut Context<Self>) -> bool {
        for (_user, board) in &self.connections {
            if board.info.remote == req.remote {
                board.addr.do_send(SendToBoard { action: req.action });
                return true;
            }
        }
        for board in &self.idle_boards {
            if board.info.remote == req.remote {
                board.addr.do_send(SendToBoard { action: req.action });
                return true;
            }
        }
        return false;
    }
}

pub fn get_board_manager() -> Addr<BoardManagerActor> {
    BoardManagerActor::from_registry()
}
