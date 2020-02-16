import React, { useState, useCallback } from 'react';
import cn from 'classnames';
import { List } from 'immutable';

import { Connector, SIGNAL } from './index.js';

export default function Digit4(rest) {
  const [pins, setPins] = useState(List(Array(12).fill(SIGNAL.X)));

  return <div className="block digit4" {...rest}>
    <div className="pins">
      {
        pins.map((s, idx) => <div key={idx} style={{
          gridRow: idx % 4 + 1,
          gridColumn: Math.floor(idx / 4) + 1,
        }}>
          {idx%2===1?(1<<idx%4):""}
          <Connector master={false} onChange={v => {
            setPins(pins.set(idx, v))
          }}></Connector>
          {idx%2===0?(1<<idx%4):""}
        </div>)
      }
    </div>
    <div className="digits">
      {
        [...Array(3).keys()].map((idx) => <div key={idx}>
          <div className="digit">
            
          </div>
        </div>)
      }
    </div>
  </div>
}
