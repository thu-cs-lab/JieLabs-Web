import React, { useState, useContext } from 'react';
import cn from 'classnames';

import { Connector, SIGNAL, MODE } from './index.js';

import { TimeoutContext } from '../App';

const CLOCK_FREQUENCY = [16, 8, 4, 2, 1];

export default React.memo(({ id, ...rest }) => {
  const [manualClock, setManualClock] = useState(SIGNAL.L);
  const [manualReset, setManualReset] = useState(SIGNAL.L);

  const timeoutCtx = useContext(TimeoutContext);

  function getHandler(setter, signal) {
    return e => {
      e.stopPropagation();
      setter(signal);
      timeoutCtx.reset();
    }
  }

  return <div className="block clock" {...rest}>
    <div className="clock-top">
      <div className="clocks">
        {
          CLOCK_FREQUENCY.map((f, idx) =>
            <div className="clock-box" key={idx}>
              <Connector
                mode={MODE.CLOCK_SRC}
                data={f * 1000000}
                id={`${id}-${f}`}
              />
              <div className="clock-label">{f}<small>M</small></div>
            </div>)
        }
      </div>
    </div>
    <div className="clock-bottom">
      <div className="clock-box">
        <Connector output={manualClock} id={`${id}-clk`}></Connector>
        <div
          className={cn("press-btn", { pusheen: manualClock === SIGNAL.H })}
          onMouseDown={getHandler(setManualClock, SIGNAL.H)}
          onMouseUp={getHandler(setManualClock, SIGNAL.L)}
        ></div>
      </div>
      <div className="clock-box">
        <Connector output={manualReset} id={`${id}-rst`}></Connector>
        <div
          className={cn("press-btn", { pusheen: manualReset === SIGNAL.H })}
          onMouseDown={getHandler(setManualReset, SIGNAL.H)}
          onMouseUp={getHandler(setManualReset, SIGNAL.L)}
        ></div>
      </div>
    </div>
  </div>
});
