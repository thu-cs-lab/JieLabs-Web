import React, { useState, useContext, useEffect } from 'react';
import cn from 'classnames';

import { SandboxContext } from '../Sandbox.js';

export const SIGNAL = {
  H: Symbol("High"),
  L: Symbol("Low"),
  X: Symbol("X"),
}

export function Connector({ onChange, output, master, className, ...rest }) {
  const snd = useContext(SandboxContext);

  const [id, setId] = useState(null);
  const [ref, setRef] = useState(null);

  useEffect(() => {
    const { id: nid, ref: nref } = snd.register(master);
    setId(nid);
    setRef(nref);

    return () => {
      snd.unregister(nid);
    }
  }, [master, snd]);

  useEffect(() => {
    if(id !== null)
      snd.setHook(id, onChange);
  }, [onChange, id, snd]);

  const { onClick } = snd.update(id, output);

  if(!id) return <div className={className} {...rest}></div>;
  return <div ref={ref} className={cn("connector", className)} onClick={onClick} onMouseDown={e => e.stopPropagation()}></div>;
}

export { default as Switch4 } from './Switch4.js';
export { default as FPGA } from './FPGA.js';
export { default as Digit4 } from './Digit4.js';
