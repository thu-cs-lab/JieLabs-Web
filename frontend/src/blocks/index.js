import React, { useCallback, useRef, useState, useContext, useEffect } from 'react';
import cn from 'classnames';

import { SandboxContext } from '../Sandbox.js';

export const SIGNAL = Object.freeze({
  H: Symbol('High'),
  L: Symbol('Low'),
  X: Symbol('X'),
});

/**
 * Connector mode.
 *
 * Normal pins can be connected to normal pins or ClockDest pins
 * ClockSrc pins can only be connected to ClockDest pins
 * ClockDest pins can be connected to any pins
 */
export const MODE = Object.freeze({
  NORMAL: Symbol('Normal'),
  CLOCK_SRC: Symbol('ClockSrc'),
  CLOCK_DEST: Symbol('ClockDest'),
});

/**
 * Note: currently, `mode`, `onReg` and `onUnreg` are not reactive
 */
export const Connector = React.memo(({
  output: _output,
  mode: _mode,
  data,
  onChange,
  onReg,
  onUnreg,
  className,
  ...rest
}) => {
  const output = _output || SIGNAL.X;
  const mode = _mode || MODE.NORMAL;

  const snd = useContext(SandboxContext);

  const [id, setId] = useState(null);
  const [ref, setRef] = useState(null);

  const cb = useRef(onChange);
  const dataref = useRef(data);

  useEffect(() => {
    cb.current = onChange;
  }, [onChange]);

  useEffect(() => {
    dataref.current = data;
  }, [data]);

  useEffect(() => {
    const { id: nid, ref: nref } = snd.register(cb, mode, dataref);
    setId(nid);
    setRef(nref);

    if(onReg)
      onReg(nid);

    return () => {
      snd.unregister(nid);
      if(onUnreg)
        onUnreg();
    }
  }, [snd]);

  useEffect(() => {
    if(id !== null)
      snd.update(id, output);
  }, [id, output]);

  const onClick = useCallback(() => {
    if(id !== null)
      snd.click(id);
  }, [id]);

  if(!id) return <div className={className} {...rest}></div>;
  return <div
    ref={ref}
    className={cn("connector", className, { clocking: mode === MODE.CLOCK_DEST || mode === MODE.CLOCK_SRC })}
    onClick={onClick}
    onMouseDown={e => e.stopPropagation()}
  ></div>;
});

export { default as Switch4 } from './Switch4.js';
export { default as FPGA } from './FPGA.js';
export { default as Digit4 } from './Digit4.js';
export { default as Clock } from './Clock.js';
