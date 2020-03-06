import React, { useMemo, useCallback, useContext } from 'react';
import { useSelector, useDispatch }  from 'react-redux';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import { Connector, SIGNAL, MODE } from './index.js';
import { FPGAEnvContext } from '../Sandbox';
import Icon from '../comps/Icon';

import { BOARD_STATUS, setOutput, connectToBoard } from '../store/actions';

const PIN_COUNT = 38;
const PIN_CLOCKING = 37;

export default React.memo(({ id, ...rest }) => {
  const input = useSelector(state => state.input);
  const directions = useSelector(state => state.activeBuild?.directions);
  const dispatch = useDispatch();

  const status = useSelector(state => state.board.status);

  const padded = useMemo(() => {
    const head = (input || []).map((e, idx) => {
      if(directions && idx in directions && directions[idx] === 'output') // Inputs from FPGA
        return SIGNAL.X;
      else
        return e;
    });

    // TODO: slice based on board tmpl pin count
    if(head.length > PIN_COUNT) return head;
    const tail = Array(PIN_COUNT - head.length).fill(SIGNAL.X);

    return head.concat(tail);
  }, [input, directions]);

  const doConnect = useCallback(() => {
    dispatch(connectToBoard());
  });

  const ctx = useContext(FPGAEnvContext);

  // TODO: change fpga layout based on chosen board tempalte

  return <div className="block fpga" {...rest}>
    { padded.slice(0, PIN_COUNT).map((sig, idx) => (
      <div key={idx} className="pin-group">
        <Connector
          id={`${id}-${idx}`}
          className="pin"
          mode={idx === PIN_CLOCKING ? MODE.CLOCK_DEST : MODE.NORMAL}
          onChange={updated => {
            if(directions && idx in directions && directions[idx] === 'output')
              dispatch(setOutput(idx, updated))
          }}
          onReg={idx === PIN_CLOCKING ? ctx.regClocking : null}
          onUnreg={idx === PIN_CLOCKING ? ctx.unregClocking : null}
          output={sig}
        />
        <div className="label">{ idx }</div>
      </div>
    ))}

    <TransitionGroup className="fpga-mask-anchor">
      { status === BOARD_STATUS.DISCONNECTED && (
        <CSSTransition
          timeout={500}
          classNames="fade"
        >
          <div className="fpga-mask" onClick={doConnect}>
            <div className="fpga-mask-hint">
              FPGA disconnected
            </div>

            <Icon>settings_ethernet</Icon>

            <div className="fpga-mask-hint">
              click to connect
            </div>
          </div>
        </CSSTransition>
      )}

      { status === BOARD_STATUS.PROGRAMMING && (
        <CSSTransition
          timeout={500}
          classNames="fade"
        >
          <div className="fpga-mask">
            <div className="loading" />
          </div>
        </CSSTransition>
      )}
    </TransitionGroup>
  </div>
});
