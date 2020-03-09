import React, { useState, useRef, useContext } from 'react';
import cn from 'classnames';
import { List } from 'immutable';

import { Connector, SIGNAL } from './index.js';

import { TimeoutContext } from '../App';

export default React.memo(({ id, ...rest }) => {
  const [leds, setLeds] = useState(List(Array(4).fill(SIGNAL.X)));
  const [switches, setSwitches] = useState(List(Array(4).fill(SIGNAL.L)));

  const timeoutCtx = useContext(TimeoutContext);

  const currentLeds = useRef(leds);

  return <div className="block switch4" {...rest}>
    <div className="leds">
      {
        leds.map((s, idx) => <div key={idx}>
          <div className={cn("led", { lighten: s === SIGNAL.H })}></div>
          <Connector
            id={`${id}-led-${idx}`}
            onChange={v => {
              currentLeds.current = currentLeds.current.set(idx, v);
              setLeds(currentLeds.current);
            }}
          ></Connector>
        </div>)
      }
    </div>
    <div className="switches">
      {
        switches.map((s, idx) => <div key={idx}>
          <div
            className={cn("switch", { pusheen: s === SIGNAL.H })}
            onClick={() => {
              setSwitches(switches.set(idx, s === SIGNAL.L ? SIGNAL.H : SIGNAL.L));
              timeoutCtx.reset();
            }}
            onMouseDown={e => e.stopPropagation()}
          ></div>
          <Connector id={`${id}-switch-${idx}`} output={s}></Connector>
        </div>)
      }
    </div>
  </div>
});
