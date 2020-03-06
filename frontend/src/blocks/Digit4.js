import React, { useState, useCallback, useRef } from 'react';
import { List } from 'immutable';

import { Connector, SIGNAL } from './index.js';

export default React.memo(({ id, ...rest }) => {
  const [pins, setPins] = useState(List(Array(12).fill(SIGNAL.X)));

  const currentPins = useRef(pins);

  const calcDigit = useCallback((index) => {
    let digit0 = pins.get(index * 4 + 0) === SIGNAL.H;
    let digit1 = pins.get(index * 4 + 1) === SIGNAL.H;
    let digit2 = pins.get(index * 4 + 2) === SIGNAL.H;
    let digit3 = pins.get(index * 4 + 3) === SIGNAL.H;
    let digit = digit3 * 8 + digit2 * 4 + digit1 * 2 + digit0;
    return digit.toString(16).toUpperCase();
  }, [pins]);

  return <div className="block digit4" {...rest}>
    <div className="pins">
      {
        pins.map((s, idx) => <div key={idx} style={{
          gridRow: idx % 4 + 1,
          gridColumn: Math.floor(idx / 4) + 1,
        }}>
          {idx % 2 === 1 ? (1 << idx % 4) : ""}
          <Connector
            id={`${id}-${idx}`}
            onChange={v => {
              currentPins.current = currentPins.current.set(idx, v);
              setPins(currentPins.current);
            }}
          ></Connector>
          {idx % 2 === 0 ? (1 << idx % 4) : ""}
        </div>)
      }
    </div>
    <div className="digits">
      {
        [...Array(3).keys()].map((idx) => <div key={idx}>
          <div className="digit">
            {calcDigit(idx)}
          </div>
        </div>)
      }
    </div>
  </div>
});
