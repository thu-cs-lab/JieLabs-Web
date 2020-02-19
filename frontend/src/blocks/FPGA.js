import React, { useState, useCallback } from 'react';
import cn from 'classnames';
import { List } from 'immutable';

import { Connector, SIGNAL } from './index.js';

const PIN_COUNT = 38;

export default function FPGA(rest) {
  const [io, setIO] = useState(List(Array(PIN_COUNT).fill(SIGNAL.X)));
  const [reset, setReset] = useState(SIGNAL.L);

  // TODO: change fpga layout based on chosen board tempalte

  return <div className="block fpga" {...rest}>
    { io.map((pin, idx) => (
      <div key={idx} className="pin-group">
        <Connector className={cn("pin", { clocking: idx === 37 })} />
        <div className="label">{ idx }</div>
      </div>
    ))}
  </div>
}
