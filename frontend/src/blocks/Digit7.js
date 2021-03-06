import React, { useState, useRef } from 'react';
import { List } from 'immutable';

import { Connector, SIGNAL } from './index.js';

import Digit from '../comps/Digit';

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export default React.memo(({ id, ...rest }) => {
  function useGroup(name) {
    const [pins, setPins] = useState(List(new Array(7).fill(SIGNAL.L)));
    const curPins = useRef(pins);

    const elem = (
      <div className="group" key={name}>
        <div className="pins">
          { pins.map((pin, idx) => (
            <div className="pin" key={idx}>
              <div className="pin-label">{ LABELS[idx] }</div>
              <Connector
                id={`${id}-${name}-${LABELS[idx]}`}
                onChange={val => {
                  curPins.current = curPins.current.set(idx, val);
                  setPins(curPins.current);
                }}
              />
            </div>
          ))}
        </div>
        <div className="digit-wrapper">
          <Digit values={pins} />
        </div>
      </div>
    );

    return [pins, elem];
  }

  const groupA = useGroup('A');
  const groupB = useGroup('B');
  const groupC = useGroup('C');

  return <div className="block digit7" {...rest}>
    { groupA }
    { groupB }
    { groupC }
  </div>
});
