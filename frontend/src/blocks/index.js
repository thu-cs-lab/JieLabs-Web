import React, { useState, useContext, useEffect } from 'react';

import { SandboxContext } from '../sandbox.js';

export const SIGNAL = {
  H: Symbol("High"),
  L: Symbol("Low"),
  X: Symbol("X"),
}

export function Connector({ onChange, output, master }) {
  const snd = useContext(SandboxContext);

  const [id, setId] = useState(null);

  useEffect(() => {
    const nid = setId(snd.register(onChange, master))

    return () => {
      snd.unregister(nid);
    }
  }, []);

  const { onClick } = snd.update(id, output);

  if(!id) return <div></div>;
  return <div className="connector" onClick={onClick}></div>;
}

export { default as Switch4 } from './switch4.js';
