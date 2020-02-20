import React, { useState, useCallback, useContext } from 'react';
import { useSelector }  from 'react-redux';
import cn from 'classnames';
import { List } from 'immutable';

import { Connector, SIGNAL, MODE } from './index.js';

import { FPGAEnvContext } from '../Sandbox';

const PIN_COUNT = 38;
const PIN_CLOCKING = 37;

export default React.memo(rest => {
  const [io, setIO] = useState(List(Array(PIN_COUNT).fill(SIGNAL.X)));
  const [reset, setReset] = useState(SIGNAL.L);
  // TODO: handle directions
  const boardInput = useSelector(state => state.board.input || 0);

  const ctx = useContext(FPGAEnvContext);

  // TODO: change fpga layout based on chosen board tempalte

  return <div className="block fpga" {...rest}>
    { io.map((pin, idx) => (
      <div key={idx} className="pin-group">
        <Connector
          className="pin"
          mode={idx === PIN_CLOCKING ? MODE.CLOCK_DEST : MODE.NORMAL}
          onReg={idx === PIN_CLOCKING ? ctx.regClocking : null}
          onUnreg={idx === PIN_CLOCKING ? ctx.unregClocking : null}
          output={(boardInput & (1 << idx)) ? SIGNAL.H : SIGNAL.L}
        />
        <div className="label">{ idx }</div>
      </div>
    ))}
  </div>
});
