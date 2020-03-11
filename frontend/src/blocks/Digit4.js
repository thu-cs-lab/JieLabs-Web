import React, { useMemo, useState, useRef } from 'react';
import { List } from 'immutable';

import { Connector, SIGNAL } from './index.js';

import Digit from '../comps/Digit';

function toInteger(pins) {
  let result = 0;
  pins.forEach(pin => {
    result *= 2;
    if(pin === SIGNAL.H) result += 1;
  });

  return result
}

const LABELS = ['8', '4', '2', '1'];

export default React.memo(({ id, ...rest }) => {
  const DIGIT_LUT = useMemo(() => [
    '1111110', // 0
    '0110000', // 1
    '1101101', // 2
    '1111001', // 3
    '0110011', // 4
    '1011011', // 5
    '1011111', // 6
    '1110000', // 7
    '1111111', // 8
    '1111011', // 9
    '1110111', // A
    '0011111', // B
    '0001101', // C
    '0111101', // D
    '1001111', // E
    '1000111', // F
  ].map(
    e => List(e.split('').map(e => e === '1' ? SIGNAL.H : SIGNAL.L))
  ), []);

  function useGroup(name) {
    const [pins, setPins] = useState(List(new Array(4).fill(SIGNAL.L)));
    const curPins = useRef(pins);

    const integer = toInteger(pins);
    const sig = DIGIT_LUT[integer];

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
          <Digit values={sig} />
        </div>
      </div>
    );

    return [pins, elem];
  }

  const groupA = useGroup('A');
  const groupB = useGroup('B');
  const groupC = useGroup('C');

  return <div className="block digit4" {...rest}>
    { groupA }
    { groupB }
    { groupC }
  </div>
});
