import React, { useEffect, useLayoutEffect, useRef, useCallback, useState, useMemo } from 'react';
import uuidv4 from 'uuid/v4'
import { List } from 'immutable';
import { useDispatch, useSelector } from 'react-redux';

import * as blocks from './blocks';
import { SIGNAL, MODE } from './blocks';
import { updateClock } from './store/actions';

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

      result.push([
        { ref: this.connectors[id].ref, id },
        { ref: this.connectors[other].ref, id: other },
      ]);

      ignored.add(other);
      ignored.add(id);
    }

    this.onLineChange(result);
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

  getAllConnectors() {
    return Object.keys(this.connectors).map(k => {
      return {
        id: k,
        ref: this.connectors[k].ref,
      };
    }).filter(e => !!e.ref);
  }
}

function center(rect, ref) {
  return {
    x: (rect.left + rect.right) / 2 - ref.x,
    y: (rect.top + rect.bottom) / 2 - ref.y,
  }
}

const BLOCK_ALIGNMENT = 175;

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
  'Digit7',
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
      { type: 'Digit7', x: 2 * BLOCK_ALIGNMENT, y: 0, id: 'digit7_1' },
      { type: 'Clock', x: 1 * BLOCK_ALIGNMENT, y: 1 * BLOCK_ALIGNMENT, id: 'clock_1' },
    ]
  ));

  const [scroll, setScroll] = useState({ x: 20, y: 20 });
  const [scale, setScale] = useState(1);

  const [lines, setLines] = useState(List());
  const ctx = useMemo(() => new Handler(setLines), []);

  const container = useRef();
  const canvas = useRef();

  // Map lines to groups
  const groups = useMemo(() => {
    if(!container.current) return [];

    return lines.map(line => ({
      color: 'rgba(0,0,0,.3)',
      members: line.map(({ id, ref }) => {
        if(!ref.current) return null;
        const bounding = ref.current.getBoundingClientRect();
        const { x, y } = center(bounding, container.current.getBoundingClientRect());

        return {
          x: x - scroll.x,
          y: y - scroll.y,
          id,
        };
      }).filter(e => e !== null),
    }));
  }, [lines]); // Intentionally leaves scroll out

  // Keep track of all connectors
  const [connectors, setConnectors] = useState([]);
  const refreshConnectors = useCallback(() => {
    if(!container.current) return;

    const all = ctx.getAllConnectors();

    setConnectors(all.map(({ id, ref }) => {
      const bounding = ref.current.getBoundingClientRect();
      const { x, y } = center(bounding, container.current.getBoundingClientRect());

      return {
        id,
        x: x - scroll.x,
        y: y - scroll.y,
      };
    }));
  }, [scroll]);

  // Update lines & connectors when updating field
  useLayoutEffect(() => { setTimeout(() => {
    ctx.updateLines();
    refreshConnectors();
  }) }, [field]);

  useEffect(() => {
    return ctx.onChange(() => {
      refreshConnectors();
    });
  }, [refreshConnectors]);

  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);

  const observer = React.useMemo(() => new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect;
    setCanvasWidth(width);
    setCanvasHeight(height);
  }), []);

  useEffect(() => {
    if(container.current) {
      observer.observe(container.current);
      const rect = container.current.getBoundingClientRect();
      setCanvasWidth(rect.width)
      setCanvasHeight(rect.height)
    }

    return () => {
      observer.unobserve(container.current);
    };
  }, [container, observer]);

  const [ctxMenu, setCtxMenu] = useState(null);

  const requestSettle = useCallback((idx, { x, y }) => {
    const ax = alignToBlock(x);
    const ay = alignToBlock(y);

    for(const block of field)
      if(block.x === ax && block.y === ay)
        return;

    setField(field.set(idx, { ...field.get(idx), x: ax, y: ay }));
  }, [setField, field]);

  // TODO: impl this in WireLayer
  // useLayoutEffect(redraw, [field, scroll]);
  
  const requestDelete = useCallback(idx => {
    setField(field.delete(idx));
  }, [setField, field]);

  const requestRedraw = useCallback(() => ctx.updateLines());

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
          return dispatch(updateClock(ctx.getData(other)));
        else
          return dispatch(updateClock(null));
      },
      unregClocking: () => {
        cpid.current = null;
        dispatch(updateClock(null));
      }
    };
  }, [ctx, dispatch]);

  useEffect(() => {
    return ctx.onChange(() => {
      if(!cpid.current) return;

      const other = ctx.getConnected(cpid.current);
      if(other !== null)
        return dispatch(updateClock(ctx.getData(other)));
      else
        return dispatch(updateClock(null));
    });
  }, [ctx, cpid, dispatch]);

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
        <div
          className="sandbox-scroll"
          style={{
            transform: `translate(${scroll.x}px,${scroll.y}px)`,
          }}
        >
          { field.map((spec, idx) => (
            <BlockWrapper
              key={spec.id}
              idx={idx}
              spec={spec}
              requestSettle={requestSettle}
              requestDelete={requestDelete}
              requestRedraw={requestRedraw}
            >
            </BlockWrapper>
          ))}
        </div>

        <WireLayer
          groups={groups}
          connectors={connectors}
          scroll={scroll}
          width={canvasWidth}
          height={canvasHeight}
        />
      </SandboxContext.Provider>
    </FPGAEnvContext.Provider>

    { ctxMenu !== null ?
      <div className="ctx" style={{
        top: ctxMenu.y,
        left: ctxMenu.x,
      }}>
        { INSERTABLES.map(t => (
          <div className="ctx-entry" key={t} onClick={() => {
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

const BlockWrapper = React.memo(({ idx, spec, requestSettle, requestDelete, requestRedraw, ...rest }) => {
  const [moving, setMoving] = useState(null);

  const style = useMemo(() => {
    if(moving) {
      return {
        transform: `translate(${moving.x}px,${moving.y}px)`,
        zIndex: 3,
      }
    } else {
      return {
        transform: `translate(${spec.x}px,${spec.y}px)`,
      }
    }
  }, [spec, moving]);

  const movingStyle = useMemo(() => moving ? {
    transform: `translate(${alignToBlock(moving.x)}px,${alignToBlock(moving.y)}px)`,
    zIndex: 0,
    opacity: 0.5,
  } : {}, [moving]);

  const onMouseDown = useCallback(ev => {
    const cur = { x: spec.x, y: spec.y };
    setMoving(cur);

    const move = ev => {
      cur.x += ev.movementX;
      cur.y += ev.movementY;
      // Bypass weak equality
      setMoving({ ...cur });
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
  }, [idx, spec, requestSettle, setMoving]);

  // useLayoutEffect(requestRedraw, [moving]);

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

/**
 * Syntax of groups:
 * [
 *   {
 *     color: 'some color hex',
 *     members: [
 *       {
 *         x: x cord without scroll offset,
 *         y: y cord without scroll offset,
 *         id: ID of the connector
 *       },
 *       ... (other connectors in this group)
 *     ],
 *   },
 *   ... (other groups)
 * ]
 */
const WireLayer = React.memo(({ groups, scroll, width, height, connectors }) => {
  const FACTOR = 3;
  const MASK_RADIUS = 2;

  const lib = useSelector((state) => state.lib);

  console.log('GROUPS: ', groups);
  console.log('CONNS: ', connectors);

  const { minX, minY, maxX, maxY } = useMemo(() => {
    let result = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };

    for(const group of groups)
      for(const { x, y } of group.members) {
        if(x < result.minX) result.minX = x;
        if(x > result.maxX) result.maxX = x;
        if(y < result.minY) result.minY = y;
        if(y > result.maxY) result.maxY = y;
      }

    return result;
  }, [groups]);

  /*
   * First, map groups to individual canvases
   * canvases has the following format
   *
   * [
   *   {
   *     offset: { x, y }, // Offset from overall origin
   *     dim: { w, h },
   *     canvas,
   *   }
   * ]
   */
  const canvases = useMemo(() => {
    if(!groups) return [];

    // We have to do this check, because if group.length === 0,
    // then the maze size will be -Infinity * -Infinity
    // and everything screams
    if(groups.length === 0) return [];

    const width = maxX - minX;
    const height = maxY - minY;
    const mWidth = Math.floor(width / FACTOR) + 1;
    const mHeight = Math.floor(height / FACTOR) + 1;

    let maze = new lib.Maze(mWidth, mHeight);

    function bounded(x, upper) {
      if(x < 0) return 0;
      if(x > upper - 1) return upper - 1;
      return x;
    }

    function boundedRadius(x, y, delta) {
      const r = [
        bounded(x - delta, mWidth),
        bounded(y - delta, mHeight),
        bounded(x + delta, mWidth),
        bounded(y + delta, mHeight),
      ];
      console.log(r);
      return r;
    }

    const result = [];

    for(const { x, y, /* id */ } of connectors) {
      const mx = Math.floor((x - minX) / FACTOR);
      const my = Math.floor((y - minY) / FACTOR);

      maze.fill_mut(...boundedRadius(mx, my, MASK_RADIUS));
    }

    // Draw
    for(const group of groups) {
      const mazeCoords = group.members.map(({ x, y }) => ({
        x: Math.floor((x - minX) / FACTOR),
        y: Math.floor((y - minY) / FACTOR),
      }));

      // TODO: multi-terminal
      console.assert(mazeCoords.length === 2);

      for(const { x, y } of mazeCoords)
        maze.clean_mut(...boundedRadius(x, y, MASK_RADIUS));

      const rawChangeset = maze.lee_minimum_edge_effect(
        mazeCoords[0].x,
        mazeCoords[0].y,
        mazeCoords[1].x,
        mazeCoords[1].y,
      );

      // TODO: properly handles this, maybe enlarge grid?
      if(rawChangeset === undefined)
        throw new Error('No solution!');

      const changeset = rawChangeset.to_js();
      maze.apply(rawChangeset);
      rawChangeset.free();

      for(const { x, y } of mazeCoords)
        maze.fill_mut(...boundedRadius(x, y, MASK_RADIUS));

      // Find bouding rect of this changeset
      let minMCX = Infinity;
      let minMCY = Infinity;
      let maxMCX = -Infinity;
      let maxMCY = -Infinity;

      for(const [x, y, type] of changeset) {
        if(x < minMCX) minMCX = x;
        if(x > maxMCX) maxMCX = x;
        if(y < minMCY) minMCY = y;
        if(y > maxMCY) maxMCY = y;
      }

      const minCX = minX + minMCX * FACTOR;
      const maxCX = maxX + (maxMCX + 1) * FACTOR; // +1 for the border column/row
      const minCY = minY + minMCY * FACTOR;
      const maxCY = maxY + (maxMCY + 1) * FACTOR;

      // Create the canvas
      const canvas = document.createElement('canvas');
      canvas.width = maxCX - minCX;
      canvas.height = maxCY - minCY;

      const ctx = canvas.getContext('2d');

      ctx.fillStyle = group.color;

      // FIXME: draw different shape based on types
      for (const [x, y, type] of changeset) {
        const dx = (x - minMCX) * FACTOR;
        const dy = (y - minMCY) * FACTOR;
        console.log("DX: ", dx);
        console.log("DY: ", dy);

        ctx.fillRect(
          dx + FACTOR * 0.1,
          dy + FACTOR * 0.1,
          FACTOR * 0.8,
          FACTOR * 0.8,
        );
      }

      result.push({
        offset: {
          x: minCX,
          y: minCY,
        },
        dim: {
          w: maxCX - minCX,
          h: maxCY - minCY,
        },
        canvas,
      });
    }

    maze.free();

    return result;
  }, [groups, width, height, minX, minY, maxX, maxY, connectors]);

  // Overlay all canvases
  const renderer = useCallback(canvas => {
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    for(const { offset: { x, y }, dim: { w, h }, canvas: cvs } of canvases) {
      console.log('OFFSET: ', x, y);
      ctx.drawImage(cvs, 0, 0, w, h, x + scroll.x, y + scroll.y, w, h);
    }
  }, [canvases, scroll, width, height]);

  return (
    <canvas ref={renderer} width={width} height={height} className="lines"></canvas>
  );
});
