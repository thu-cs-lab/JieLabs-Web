import React, { useState, useRef } from 'react';
import { List } from 'immutable';

import { Connector, SIGNAL } from './index.js';

function getX(part) {
  const step = 100;
  if (part === 4 || part === 5) {
    return step;
  }
  return 0;
}

function getY(part) {
  const step = 100;
  if (part === 0 || part === 2 || part === 4) {
    return step;
  } else if (part === 3) {
    return step * 2;
  }
  return 0;
}

function getRotate(part) {
  if (part === 1 || part === 2 || part === 4 || part === 5) {
    return 90;
  }
  return 0;
}

export default React.memo(({ id, ...rest }) => {
  const [pins, setPins] = useState(List(Array(3 * 7).fill(SIGNAL.X)));

  const currentPins = useRef(pins);

  return <div className="block digit7" {...rest}>
    <div className="pins">
      {
        pins.map((s, idx) => <div key={idx} style={{
          gridRow: idx % 7 + 1,
          gridColumn: Math.floor(idx / 7) + 1,
        }}>
          {(6 - (idx % 7) + 10).toString(17).toUpperCase()}
          <Connector
            id={`${id}-${idx}`}
            onChange={v => {
              currentPins.current = currentPins.current.set(idx, v);
              setPins(currentPins.current);
            }}
          ></Connector>
        </div>)
      }
    </div>
    <div className="digits">
      {
        [...Array(3).keys()].map((idx) => <div key={idx}>
          <svg width="20px" height="30px" viewBox="0 0 200 300" key={idx}>
            <path d="M 10,10 10,270 190,270 190,10 Z" fill="black"></path>
            {[...Array(7).keys()].map((part) =>
              <g transform={`translate(${getX(part)}, ${getY(part)}) rotate(${getRotate(part)}, 50, 40)`}
                fill={pins.get(idx * 7 + part) === SIGNAL.H ? 'red' : 'grey'} key={part}>
                <path d="M 50,30 40,40 50,50 150,50 160,40 150,30 Z"></path>
              </g>
            )}
          </svg>
        </div>)
      }
    </div>
  </div>
});
