import React, { useState, useCallback } from 'react';
import cn from 'classnames';
import { List } from 'immutable';

import { Connector, SIGNAL } from './index.js';

const CLOCK_FREQUENCY = [16, 8, 4, 2, 1];

export default function Digit4(rest) {
  const [manualClock, setManualClock] = useState(SIGNAL.L);
  const [manualReset, setManualReset] = useState(SIGNAL.L);

  return <div className="block clock" {...rest}>
    <div className="clocks">
      {
        CLOCK_FREQUENCY.map((f, idx) => <div key={idx}>
          <div className="clock-box">
            {`${f}M`}
            <Connector master={false}></Connector>
          </div>
        </div>)
      }
    </div>
    <div className="clock-bottom">
      <div className="clock-box">
        CLK
        <div
          className={cn("switch", { pusheen: manualClock === SIGNAL.H })}
          onClick={() => setManualClock(manualClock === SIGNAL.L ? SIGNAL.H : SIGNAL.L)}
          onMouseDown={e => e.stopPropagation()}
        ></div>
        <Connector output={manualClock} master={true}></Connector>
      </div>
      <div className="clock-box">
        RST
        <div
          className={cn("switch", { pusheen: manualReset === SIGNAL.H })}
          onClick={() => setManualReset(manualReset === SIGNAL.L ? SIGNAL.H : SIGNAL.L)}
          onMouseDown={e => e.stopPropagation()}
        ></div>
        <Connector output={manualReset} master={true}></Connector>
      </div>
    </div>
  </div>
}
