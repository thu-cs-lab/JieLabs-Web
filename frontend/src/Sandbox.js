import React, { useRef, useState, useMemo } from 'react';
import uuidv4 from 'uuid/v4'
import { List } from 'immutable';

import * as blocks from './blocks';
import { SIGNAL } from './blocks';

import Icon from './comps/Icon';

export const SandboxContext = React.createContext(null);

class Handler {
  constructor(onLineChange) {
    this.onLineChange = onLineChange;
  }

  connectors = {};

  selecting = null;

  register(master) {
    const id = uuidv4();
    const ref = React.createRef();
    this.connectors[id] = { onChange: null, ref, master, value: SIGNAL.X, connected: null };
    return { ref, id };
  }

  setHook(id, onChange) {
    this.connectors[id].onChange = onChange;
  }

  unregister(id) {
    if(this.selecting === id) this.selecting = false;
    const other = this.connectors[id].connected;

    if(other !== null) {
      this.connectors[other].connected = null;

      if(!this.connectors[other].master)
        this.connectors[other].onChange(SIGNAL.X);
    }
    this.connectors[id] = null;
  }

  update(id, value) {
    if(!this.connectors[id]) return {};

    if(this.connectors[id].master && this.connectors[id].value !== value) {
      this.connectors[id].value = value;

      const connected = this.connectors[id].connected;

      if(connected !== null && this.connectors[connected].onChange)
        this.connectors[connected].onChange(value);
    }

    return {
      onClick: () => {
        const original = this.connectors[id].connected;
        if(original !== null) {
          this.connectors[original].connected = null;
          this.connectors[id].connected = null;

          if(!this.connectors[original].master)
            this.connectors[original].onChange(SIGNAL.X);
          if(!this.connectors[id].master)
            this.connectors[id].onChange(SIGNAL.X);
        }

        if(this.selecting === null) this.selecting = id;
        else if(this.selecting === id) this.selecting = null;
        else {
          this.connectors[this.selecting].connected = id;
          this.connectors[id].connected = this.selecting;

          if(this.connectors[this.selecting].master && !this.connectors[id].master)
            this.connectors[id].onChange(this.connectors[this.selecting].value);
          else if(this.connectors[id].master && !this.connectors[this.selecting].master)
            this.connectors[this.selecting].onChange(this.connectors[id].value);

          this.selecting = null;
        }

        this.updateLines();
      },
    }
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

export default function Sandbox() {
  const [field, setField] = useState(List(
    [
      { type: 'FPGA', x: 0, y: 0, id: 'fpga' }, // TODO: change to type fpga
      { type: 'Switch4', x: 0, y: 1 * BLOCK_ALIGNMENT, id: 'switch4_1' },
    ]
  ));

  const [scroll, setScroll] = useState({ x: 20, y: 20 });
  const [moving, setMoving] = useState({ x: 0, y: 0, show: false });
  const [scale, setScale] = useState(1);

  const [lines, setLines] = useState(List());
  const ctx = useMemo(() => new Handler(setLines), []);

  const container = useRef();
  const canvas = useRef();

  function redraw() {
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
  }

  const observer = React.useMemo(() => new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect;
    if(canvas.current) {
      canvas.current.width = width;
      canvas.current.height = height;
      redraw();
    }
  }), [redraw]);

  React.useEffect(() => {
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
    <SandboxContext.Provider value={ctx}>
      <div
          key={'Mover'}
          style={{
            transform: `translate(${scroll.x + moving.x}px,${scroll.y + moving.y}px)`,
            opacity: moving.show ? "0.5" : "0",
          }}
          className="block-wrapper"
      >
        <div className="block"></div>
        </div>
      { field.map(({ type, x, y, id }, idx) => {
        const Block = blocks[type];
        return <div
            key={id}
            style={{
              transform: `translate(${scroll.x + x}px,${scroll.y + y}px)`,
            }}
            className="block-wrapper"
          >
          <div className="block-ops">
            <button className="delete" onClick={() => setField(field.delete(idx))}>
              <Icon>close</Icon>
            </button>
          </div>
          <Block
            onMouseDown={ev => {
              let curScroll = { x, y };

              const move = ev => {
                curScroll.x += ev.movementX;
                curScroll.y += ev.movementY;
                let realPos = {
                  x: alignToBlock(curScroll.x),
                  y: alignToBlock(curScroll.y),
                };
                setMoving({show: true, ...realPos});
                setField(field.set(idx, { type, id, ...curScroll }));
              };

              const up = ev => {
                setMoving({show: false, ...moving});
                let realPos = findAlignedPos(field, curScroll, id);
                setField(field.set(idx, { type, id, ...realPos }));
                document.removeEventListener('mousemove', move, false);
                document.removeEventListener('mouseup', up, false);
              };

              document.addEventListener('mousemove', move, false);
              document.addEventListener('mouseup', up, false);

              ev.stopPropagation();
            }}
          >
          </Block>
        </div>;
      })}

      <canvas ref={canvas} className="lines"></canvas>
    </SandboxContext.Provider>

    { ctxMenu !== null ?
      <div className="ctx" style={{
        top: ctxMenu.y,
        left: ctxMenu.x,
      }}>
        <div className="ctx-entry" onClick={() => {
          const cont = container.current.getBoundingClientRect();
          let pos = findAlignedPos(field, {
            x: ctxMenu.x - scroll.x - cont.x,
            y: ctxMenu.y - scroll.y - cont.y,
          }, null);
          setField(field.push(
            { type: 'Switch4', id: uuidv4(), ...pos },
          ))
        }}>Add</div>
      </div> : null
    }
  </div>;
}
