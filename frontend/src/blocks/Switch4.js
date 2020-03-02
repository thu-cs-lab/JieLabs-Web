import React, { useState, useRef } from 'react';
import cn from 'classnames';
import { List } from 'immutable';

import { Connector, SIGNAL } from './index.js';

export default React.memo(rest => {
  const [leds, setLeds] = useState(List(Array(4).fill(SIGNAL.X)));
  const [switches, setSwitches] = useState(List(Array(4).fill(SIGNAL.L)));

  const currentLeds = useRef(leds);

  return <div className="block switch4" {...rest}>
    <div className="leds">
      {
        leds.map((s, idx) => <div key={idx}>
          <div className={cn("led", { lighten: s === SIGNAL.H })}></div>
          <Connector onChange={v => {
            currentLeds.current = currentLeds.current.set(idx, v);
            setLeds(currentLeds.current);
          }}></Connector>
        </div>)
      }
    </div>
    <div className="switches">
      {
        switches.map((s, idx) => <div key={idx}>
          <div
            className={cn("switch", { pusheen: s === SIGNAL.H })}
            onClick={() => setSwitches(switches.set(idx, s === SIGNAL.L ? SIGNAL.H : SIGNAL.L))}
            onMouseDown={e => e.stopPropagation()}
          ></div>
          <Connector output={s}></Connector>
        </div>)
      }
    </div>
  </div>
});
