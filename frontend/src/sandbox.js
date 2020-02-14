import React, { useEffect, useState, useMemo } from 'react';

import {List} from 'immutable';

import * as blocks from './blocks';
import { SIGNAL } from './blocks';

export const SandboxContext = React.createContext(null);

class Handler {
  connectors = {};
  counter = 0;

  register(onChange, master) {
    // TODO: use uuid
    const id = `${this.counter++}`;
    this.connectors[id] = { onChange, master, value: SIGNAL.X, connected: null };
    return id;
  }
  unregister(id) {
    this.connectors[id] = null;
    // TODO: unbind connected pin
  }
  update(id, value) {
    if(!this.connectors[id]) return {};

    if(this.connectors[id].master) {
      this.connectors[id].value = value;
      // TODO: update connected pin
    }

    return {
      onClick: () => {},
    }
  }
}

export default function Sandbox() {
  const [field, setField] = useState(List(
    [
      { type: 'Switch4', x: 0, y: 0, id: 'test' },
    ]
  ));

  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const ctx = useMemo(() => new Handler(), []);

  return <div
    className="sandbox"
    style={{
      transform: `scale(${scale}) translate(${scroll.x}px,${scroll.y}px)`,
    }}
  >
    <SandboxContext.Provider value={ctx}>
      { field.map(({ type, x, y, id }) => {
        const Block = blocks[type];
        return <Block key={id}>
        </Block>
      })}
    </SandboxContext.Provider>
  </div>;
}
