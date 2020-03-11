import React, { useState, useRef } from 'react';
import { List } from 'immutable';

import { Connector } from './index.js';

import Digit from '../comps/Digit';

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export default React.memo(({ id, ...rest }) => {
  function useGroup(name) {
    const [pins, setPins] = useState(List(new Array(7).fill(false)));
    const curPins = useRef(pins);

    const elem = (
      <div className="group">
        <div className="pins">
          { pins.map((pin, idx) => (
            <div className="pin">
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
