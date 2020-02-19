import React, { useState, useCallback, useContext } from 'react';
import cn from 'classnames';
import { List } from 'immutable';

import { Connector, SIGNAL, MODE } from './index.js';

import { FPGAEnvContext } from '../Sandbox';

const PIN_COUNT = 38;
const PIN_CLOCKING = 37;

export default React.memo(rest => {
  const [io, setIO] = useState(List(Array(PIN_COUNT).fill(SIGNAL.X)));
  const [reset, setReset] = useState(SIGNAL.L);

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
        />
        <div className="label">{ idx }</div>
      </div>
    ))}
  </div>
});
