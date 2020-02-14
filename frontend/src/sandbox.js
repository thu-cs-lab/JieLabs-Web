import React, { useRef, useEffect, useState, useMemo } from 'react';

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
  counter = 0;

  selecting = null;

  register(master) {
    // TODO: use uuid
    const id = `${this.counter++}`;
    const ref = React.createRef();
    this.connectors[id] = { onChange: null, ref, master, value: SIGNAL.X, connected: null };
    return { ref, id };
  }

  setHook(id, onChange) {
    this.connectors[id].onChange = onChange;
  }

  unregister(id) {
    console.log(`Unreg: `, id);
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

export default function Sandbox() {
  const [field, setField] = useState(List(
    [
      { type: 'Switch4', x: 0, y: 0, id: 'test' },
      { type: 'Switch4', x: 0, y: 0, id: 'test2' },
    ]
  ));

  const [scroll, setScroll] = useState({ x: 0, y: 0 });
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
  }), [canvas]);

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
  }, [canvas, container, observer]);

  setTimeout(() => redraw());

  return <div
    ref={container}
    className="sandbox"
    onMouseDown={() => {
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
              let all = field;

              const move = ev => {
                curScroll.x += ev.movementX;
                curScroll.y += ev.movementY;
                setField(field.set(idx, { type, id, ...curScroll }));
              };

              const up = ev => {
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
  </div>;
}
