import React, { useState, useCallback } from 'react';
import cn from 'classnames';
import { List } from 'immutable';

import { Connector, SIGNAL } from './index.js';

export default function Switch4(rest) {
  const [leds, setLeds] = useState(List(Array(4).fill(SIGNAL.X)));
  const [switches, setSwitches] = useState(List(Array(4).fill(SIGNAL.L)));

  return <div className="block switch4" {...rest}>
    <div className="leds">
      {
        leds.map((s, idx) => <div key={idx}>
          <div className={cn("led", { lighten: s === SIGNAL.H })}></div>
          <Connector master={false} onChange={v => {
            setLeds(leds.set(idx, v))
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
          ></div>
          <Connector output={s} master={true}></Connector>
        </div>)
      }
    </div>
  </div>
}
