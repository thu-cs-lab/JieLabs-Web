import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import uuidv4 from 'uuid/v4'
import { List } from 'immutable';
import { useDispatch } from 'react-redux';

import * as blocks from './blocks';
import { SIGNAL, MODE } from './blocks';
import { setClock } from './store/actions';

import Icon from './comps/Icon';

export const SandboxContext = React.createContext(null);
export const FPGAEnvContext = React.createContext(null);

function negotiateSignal(a, b) {
  if(a === SIGNAL.X) return b;
  if(b === SIGNAL.X) return a;
  if(a === b) return a;
  return SIGNAL.X;
}

class Handler {
  constructor(onLineChange) {
    this.onLineChange = onLineChange;
  }

  connectors = {};
  selecting = null;
  listeners = new Set();

  register(cbref, mode, data) {
    const id = uuidv4();
    const ref = React.createRef();
    this.connectors[id] = { cb: cbref, ref, input: SIGNAL.X, ack: SIGNAL.X, connected: null, mode, data };
    this.fireListeners();
    return { ref, id };
  }

  tryUpdate(id) {
    if(this.connectors[id].connected === null)
      this.tryNotify(id, this.connectors[id].input);
    else {
      const other = this.connectors[id].connected;
      const handshaked = negotiateSignal(this.connectors[id].input, this.connectors[other].input);
      this.tryNotify(id, handshaked);
      this.tryNotify(other, handshaked);
    }
  }

  tryNotify(id, signal) {
    if(this.connectors[id].ack !== signal) {
      if(this.connectors[id].cb.current)
        this.connectors[id].cb.current(signal)
      this.connectors[id].ack = this.connectors[id].input;
    }
  }

  unregister(id) {
    if(this.selecting === id) this.selecting = false;
    const other = this.connectors[id].connected;

    if(other !== null) {
      this.connectors[other].connected = null;
      this.tryUpdate(other);
    }
    this.connectors[id] = null;
    this.fireListeners();
  }

  update(id, value) {
    if(!this.connectors[id]) return {};

    if(this.connectors[id].input !== value) {
      this.connectors[id].input = value;
      this.tryUpdate(id);
    }
  }

  click(id) {
    let updated = false;
    const original = this.connectors[id].connected;
    if(original !== null) {
      this.connectors[original].connected = null;
      this.connectors[id].connected = null;

      this.tryUpdate(id);
      this.tryUpdate(original);
      updated = true;
    }

    if(this.selecting === null) this.selecting = id;
    else if(this.selecting === id) this.selecting = null;
    else {
      if(this.checkConnectable(id, this.selecting)) {
        this.connectors[this.selecting].connected = id;
        this.connectors[id].connected = this.selecting;

        this.tryUpdate(this.selecting);
        this.tryUpdate(id);
        updated = true;
      }

      this.selecting = null;
    }

    if(updated) {
      this.fireListeners();
      this.updateLines();
    }
  }

  checkConnectable(aid, bid) {
    const { mode: am } = this.connectors[aid];
    const { mode: bm } = this.connectors[bid];

    if(am === MODE.CLOCK_DEST || bm === MODE.CLOCK_DEST) return true;
    if(am === MODE.CLOCK_SRC || bm === MODE.CLOCK_SRC) return false;
    return true;
  }

  updateLines() {
    const result = [];

    const ignored = new Set();
    for(const id in this.connectors) {
      if(this.connectors[id] === null) continue;

      if(ignored.has(id)) continue;
      const other = this.connectors[id].connected;
      if(other === null) continue;

      result.push({
        from: this.connectors[id].ref,
        to: this.connectors[other].ref,
      });

      ignored.add(other);
      ignored.add(id);
    }

    this.onLineChange(List(result));
  }

  getConnected(id) {
    return this.connectors[id]?.connected;
  }

  getData(id) {
    return this.connectors[id]?.data.current;
  }

  /**
   * Currently, onChange listeners only fires on topology changes, not on signal updates
   */
  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  fireListeners() {
    for(const listener of this.listeners)
      listener();
  }
}

function center(rect, ref) {
  return {
    x: (rect.left + rect.right) / 2 - ref.x,
    y: (rect.top + rect.bottom) / 2 - ref.y,
  }
}

const BLOCK_ALIGNMENT = 200;

function alignToBlock(pos) {
  return Math.round(pos / BLOCK_ALIGNMENT) * BLOCK_ALIGNMENT;
}

function findAlignedPos(field, pos, id) {
  let realPos = {
    x: alignToBlock(pos.x),
    y: alignToBlock(pos.y),
  };
  while (field.findIndex((item) => item.x === realPos.x && item.y === realPos.y && item.id !== id) !== -1) {
    realPos.y += BLOCK_ALIGNMENT;
  }
  return realPos;
}

const INSERTABLES = [
  'Switch4',
  'Digit4',
  'Clock',
];

export default React.memo(() => {
  /**
   * Field configuration
   *
   * type: Type of the block
   * x: current x position
   * y: current y position
   * id: id of the block
   * persistent: if the deletion of the block is forbidden
   */
  const [field, setField] = useState(List(
    [
      { type: 'FPGA', x: 0, y: 0, id: 'fpga', persistent: true },
      { type: 'Switch4', x: 0, y: 1 * BLOCK_ALIGNMENT, id: 'switch4_1' },
      { type: 'Digit4', x: 1 * BLOCK_ALIGNMENT, y: 0, id: 'digit4_1' },
      { type: 'Clock', x: 1 * BLOCK_ALIGNMENT, y: 1 * BLOCK_ALIGNMENT, id: 'clock_1' },
    ]
  ));

  const [scroll, setScroll] = useState({ x: 20, y: 20 });
  const [scale, setScale] = useState(1);

  const [lines, setLines] = useState(List());
  const ctx = useMemo(() => new Handler(setLines), []);

  const container = useRef();
  const canvas = useRef();

  const redraw = useCallback(() => {
    // Compute line indexes
    if(canvas.current && container.current) {
      const ctx = canvas.current.getContext('2d');
      ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);

      for(const { from, to } of lines) {
        if(!from.current) continue;
        if(!to.current) continue;

        const fr = from.current.getBoundingClientRect();
        const tr = to.current.getBoundingClientRect();

        const fc = center(fr, container.current.getBoundingClientRect());
        const tc = center(tr, container.current.getBoundingClientRect());

        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(0,0,0,.2)';

        ctx.beginPath();
        ctx.moveTo(fc.x, fc.y);
        ctx.lineTo(tc.x, tc.y);
        ctx.stroke();
        ctx.closePath();
      };
    }
  }, [canvas, container, lines]);

  const observer = React.useMemo(() => new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect;
    if(canvas.current) {
      canvas.current.width = width;
      canvas.current.height = height;
      redraw();
    }
  }), [redraw]);

  useEffect(() => {
    if(container.current) {
      observer.observe(container.current);
      if(canvas.current) {
        const rect = container.current.getBoundingClientRect();
        canvas.current.width = rect.width;
        canvas.current.height = rect.height;
        redraw();
      }
    }

    return () => {
      observer.unobserve(container.current);
    };
  }, [canvas, container, observer, redraw]);

  setTimeout(() => redraw());

  const [ctxMenu, setCtxMenu] = useState(null);

  const requestSettle = useCallback((idx, { x, y }) => {
    const ax = alignToBlock(x);
    const ay = alignToBlock(y);

    for(const block of field)
      if(block.x === ax && block.y === ay)
        return;

    setField(field.set(idx, { ...field.get(idx), x: ax, y: ay }));
  }, [setField, field]);

  const requestDelete = useCallback(idx => {
    setField(field.delete(idx));
  }, [setField, field]);

  // FPGA Context related stuff

  const dispatch = useDispatch();

  // cpid = Clocking Pin ID
  const cpid = useRef(null);
  const fpgaCtx = useMemo(() => {
    return {
      regClocking: id => {
        cpid.current = id;

        const other = ctx.getConnected(id);
        if(other !== null)
          return dispatch(setClock(ctx.getData(other)));
        else
          return dispatch(setClock(null));
      },
      unregClocking: () => {
        cpid.current = null;
        dispatch(setClock(null));
      }
    };
  }, [ctx, cpid]);

  useEffect(() => {
    return ctx.onChange(() => {
      if(!cpid.current) return;

      const other = ctx.getConnected(cpid.current);
      if(other !== null)
        return dispatch(setClock(ctx.getData(other)));
      else
        return dispatch(setClock(null));
    });
  }, [ctx, cpid]);

  return <div
    ref={container}
    className="sandbox"
    onContextMenu={ev => {
      setCtxMenu({ x: ev.clientX, y: ev.clientY });
      ev.preventDefault();

      const discard = () => {
        setCtxMenu(null);
        document.removeEventListener('click', discard, false);
      }
      document.addEventListener('click', discard, false);
    }}
    onMouseDown={e => {
      if(e.button !== 0) // Center or right key
        return;

      let curScroll = scroll;

      const move = ev => {
        curScroll.x += ev.movementX;
        curScroll.y += ev.movementY;
        setScroll({ ...curScroll });
      };

      const up = ev => {
        document.removeEventListener('mousemove', move, false);
        document.removeEventListener('mouseup', up, false);
      };

      document.addEventListener('mousemove', move, false);
      document.addEventListener('mouseup', up, false);
    }}
  >
    <FPGAEnvContext.Provider value={fpgaCtx}>
      <SandboxContext.Provider value={ctx}>
        { field.map((spec, idx) => (
          <BlockWrapper
            key={spec.id}
            idx={idx}
            spec={spec}
            requestSettle={requestSettle}
            requestDelete={requestDelete}
            requestRedraw={redraw}
            scroll={scroll}
          >
          </BlockWrapper>
        ))}

        <canvas ref={canvas} className="lines"></canvas>
      </SandboxContext.Provider>
    </FPGAEnvContext.Provider>

    { ctxMenu !== null ?
      <div className="ctx" style={{
        top: ctxMenu.y,
        left: ctxMenu.x,
      }}>
        { INSERTABLES.map(t => (
          <div className="ctx-entry" onClick={() => {
            const cont = container.current.getBoundingClientRect();
            let pos = findAlignedPos(field, {
              x: ctxMenu.x - scroll.x - cont.x,
              y: ctxMenu.y - scroll.y - cont.y,
            }, null);
            setField(field.push(
              { type: t, id: uuidv4(), ...pos },
            ))
          }}>Create {t}</div>
        ))}
      </div> : null
    }
  </div>;
});

const BlockWrapper = React.memo(({ idx, spec, scroll, requestSettle, requestDelete, requestRedraw, ...rest }) => {
  const [moving, setMoving] = useState(null);

  const style = useMemo(() => {
    if(moving) {
      return {
        transform: `translate(${scroll.x + moving.x}px,${scroll.y + moving.y}px)`,
        zIndex: 2,
      }
    } else {
      return {
        transform: `translate(${scroll.x + spec.x}px,${scroll.y + spec.y}px)`,
        zIndex: 1,
      }
    }
  }, [spec, scroll, moving]);

  const movingStyle = useMemo(() => moving ? {
    transform: `translate(${scroll.x + alignToBlock(moving.x)}px,${scroll.y + alignToBlock(moving.y)}px)`,
    zIndex: 0,
    opacity: 0.5,
  } : {}, [moving, scroll.x, scroll.y]);

  const onMouseDown = useCallback(ev => {
    const cur = { x: spec.x, y: spec.y };
    setMoving(cur);

    const move = ev => {
      cur.x += ev.movementX;
      cur.y += ev.movementY;
      // Bypass weak equality
      setMoving({ ...cur });
      setTimeout(() => {
        requestRedraw();
      });
    };

    const up = ev => {
      requestSettle(idx, cur);
      setMoving(null);
      document.removeEventListener('mousemove', move, false);
      document.removeEventListener('mouseup', up, false);
    };

    document.addEventListener('mousemove', move, false);
    document.addEventListener('mouseup', up, false);

    ev.stopPropagation();
    ev.preventDefault();
  }, [idx, spec, requestSettle, requestRedraw, setMoving]);

  const onDelete = useCallback(() => requestDelete(idx), [idx, requestDelete])

  const Block = blocks[spec.type];

  return <>
    { moving !== null ? 
      <div
          style={movingStyle}
          className="block-wrapper"
      >
        <div className="block"></div>
      </div> : null
    }

    <div
      style={style}
      className="block-wrapper"
      {...rest}
    >
      <div className="block-ops">
        { (!spec.persistent) && (
          <button className="delete" onClick={onDelete}>
            <Icon>close</Icon>
          </button>
        )}
      </div>
      <Block
        onMouseDown={onMouseDown}
      >
      </Block>
    </div>
  </>;
});
