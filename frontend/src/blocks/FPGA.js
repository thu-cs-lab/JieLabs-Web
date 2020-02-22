import React, { useState, useMemo, useCallback, useContext } from 'react';
import { useSelector, useDispatch }  from 'react-redux';
import cn from 'classnames';
import { List } from 'immutable';

import { Connector, SIGNAL, MODE } from './index.js';
import { FPGAEnvContext } from '../Sandbox';
import Icon from '../comps/Icon';

import { BOARD_STATUS, setOutput, connectToBoard } from '../store/actions';

const PIN_COUNT = 38;
const PIN_CLOCKING = 37;

export default React.memo(rest => {
  const [reset, setReset] = useState(SIGNAL.L);

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
          className="pin"
          mode={idx === PIN_CLOCKING ? MODE.CLOCK_DEST : MODE.NORMAL}
          onChange={updated => {
            console.log(idx, updated);
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

    { status === BOARD_STATUS.DISCONNECTED && (
      <div className="fpga-connect-mask" onClick={doConnect}>
        <div className="fpga-connect-hint">
          FPGA disconnected
        </div>

        <Icon>settings_ethernet</Icon>

        <div className="fpga-connect-hint">
          click to connect
        </div>
      </div>
    )}
  </div>
});
