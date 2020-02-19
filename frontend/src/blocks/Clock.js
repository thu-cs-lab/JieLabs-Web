import React, { useState } from 'react';
import cn from 'classnames';

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
        <Connector output={manualClock} master={true}></Connector>
        CLK
        <div
          className={cn("press-btn", { pusheen: manualClock === SIGNAL.H })}
          onMouseDown={e => { e.stopPropagation(); setManualClock(SIGNAL.H); }}
          onMouseUp={e => { e.stopPropagation(); setManualClock(SIGNAL.L); }}
        ></div>
      </div>
      <div className="clock-box">
        <Connector output={manualReset} master={true}></Connector>
        RST
        <div
          className={cn("press-btn", { pusheen: manualReset === SIGNAL.H })}
          onMouseDown={e => { e.stopPropagation(); setManualReset(SIGNAL.H); }}
          onMouseUp={e => { e.stopPropagation(); setManualReset(SIGNAL.L); }}
        ></div>
      </div>
    </div>
  </div>
}
