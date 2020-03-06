import React, { useEffect, useLayoutEffect, useRef, useCallback, useState, useMemo } from 'react';
import uuidv4 from 'uuid/v4'
import { List } from 'immutable';
import { useDispatch, useSelector } from 'react-redux';
import cn from 'classnames';

import * as blocks from './blocks';
import { SIGNAL, MODE } from './blocks';
import { updateClock } from './store/actions';

import Icon from './comps/Icon';

export const SandboxContext = React.createContext(null);
export const FPGAEnvContext = React.createContext(null);

function negotiateSignal(...signals) {
  // Filter X
  const meaningful = signals.filter(e => e !== SIGNAL.X);
  if(meaningful.length === 0) return SIGNAL.X;
  if(meaningful.every(e => e === SIGNAL.H)) return SIGNAL.H;
  if(meaningful.every(e => e === SIGNAL.L)) return SIGNAL.L;
  return SIGNAL.X;
}

class Handler {
  constructor(onConnectorClicked) {
    this.onConnectorClicked = onConnectorClicked;
  }

  connectors = {};
  selecting = null;
  listeners = new Set();
  groups = {};

  // TODO: move groups into outer component
  register(id, cbref, mode, data, selcbref) {
    if(!id) throw new Error('Connector registered without ID');
    const ref = React.createRef();
    this.connectors[id] = { cb: cbref, ref, input: SIGNAL.X, ack: SIGNAL.X, group: null, mode, data, selcb: selcbref };
    this.fireListeners();
    return { ref, id };
  }

  connSet(id) {
    const gid = this.connectors[id].group;
    if(!gid) return new Set([id]);
    // TODO: asserts that it's in the group
    return this.groups[gid];
  }

  removeFromGroup(id) {
    const gid = this.connectors[id].group;
    if(!gid) return;
    this.connectors[id].group = null;

    const group = this.groups[gid];
    if(!group.delete(id)) throw new Error(`Unexpected: removing ${id} from ${group}, but not in conn set`);

    if(group.size === 0)
      delete this.groups[gid];
    else if(group.size === 1)
      this.removeFromGroup(group.values().next().value);
    else
      this.tryUpdateSet(group);

    this.tryUpdate(id);
  }

  unionGroup(aid, bid) {
    const ag = this.groups[aid];
    const bg = this.groups[bid];
    console.log(ag, bg);

    for(const id of bg) {
      this.connectors[id].group = aid;
      ag.add(id);
    }

    delete this.groups[bid];
    this.tryUpdateSet(ag);
  }

  connectPin(aid, bid) {
    const gaid = this.connectors[aid].group;
    const gbid = this.connectors[bid].group;

    if(gaid && gbid) {
      this.unionGroup(gaid, gbid);
      return;
    }

    let gid = gaid || gbid;

    if(!gid) {
      gid = uuidv4();
      this.groups[gid] = new Set();
    }

    const group = this.groups[gid];
    group.add(aid);
    group.add(bid);

    this.connectors[aid].group = gid;
    this.connectors[bid].group = gid;

    this.tryUpdateSet(group);
  }

  tryUpdateSet(set) {
    const sigs = Array.from(set).map(id => this.connectors[id].input);
    const sig = negotiateSignal(...sigs);
    for(const id of set)
      this.tryNotify(id, sig);
  }

  tryUpdate(id) {
    this.tryUpdateSet(this.connSet(id));
  }

  tryNotify(id, signal) {
    if(this.connectors[id].ack !== signal) {
      if(this.connectors[id].cb.current)
        this.connectors[id].cb.current(signal)
      this.connectors[id].ack = this.connectors[id].input;
    }
  }

  unregister(id) {
    this.removeFromGroup(id);
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
    if(this.onConnectorClicked)
      this.onConnectorClicked(id);
  }

  checkConnectable(aid, bid) {
    // TODO: check if clock is connected to multiple clock source, this is forbidden
    const { mode: am } = this.connectors[aid];
    const { mode: bm } = this.connectors[bid];

    if(am === MODE.CLOCK_DEST || bm === MODE.CLOCK_DEST) return true;
    if(am === MODE.CLOCK_SRC || bm === MODE.CLOCK_SRC) return false;
    return true;
  }

  getLines() {
    const result = [];
    for(const gid in this.groups) {
      if(this.groups[gid].size <= 1) throw new Error(`Unexpected group size ${this.groups[gid].size}`);
      const ids = Array.from(this.groups[gid]);

      result.push({
        id: gid,
        color: 'black',
        members: ids.map(id => ({
          ref: this.connectors[id].ref,
          id
        })),
      });
    }

    return result;
  }

  getConnected(id) {
    const cs = this.connSet(id);
    if(cs.size === 1) return null;
    if(cs.size !== 2) throw new Error(`Getting connected pin in a conset with size ${cs.size}`);
    return Array.from(cs).filter(e => e !== id)[0];
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
    return Object.keys(this.connectors).filter(e => !!this.connectors[e]).map(k => {
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

const LAYERS = Object.freeze({
  WIRE: Symbol('Wire'),
  BLOCK: Symbol('Block'),
});

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
  const scrollRef = useRef(scroll);
  // TODO: impl scaling
  // const [scale, setScale] = useState(1);

  const [lines, setLines] = useState(List());
  const [linking, setLinking] = useState(null);
  const [focus, setFocus] = useState(null);

  const handler = useMemo(() => new Handler(setLinking), []);

  const link = useCallback(id => {
    handler.connectPin(linking, id);
    setLines(handler.getLines());
    setLinking(null);
  }, [handler, linking]);

  const linkCancel = useCallback(() => {
    setLinking(null);
  });

  const container = useRef();

  // Map lines to groups
  const groups = useMemo(() => {
    if(!container.current) return [];

    return lines.map(({ id, color, members })=> ({
      id, color,
      members: members.map(({ id, ref }) => {
        if(!ref.current) return null;
        const bounding = ref.current.getBoundingClientRect();
        const { x, y } = center(bounding, container.current.getBoundingClientRect());

        return {
          x: x - scrollRef.current.x,
          y: y - scrollRef.current.y,
          id,
        };
      }).filter(e => e !== null),
    }));
  }, [lines]);

  // Keep track of all connectors
  const [connectors, setConnectors] = useState([]);
  const refreshConnectors = useCallback(() => {
    if(!container.current) return;

    const all = handler.getAllConnectors();

    setConnectors(all.map(({ id, ref }) => {
      const bounding = ref.current.getBoundingClientRect();
      const { x, y } = center(bounding, container.current.getBoundingClientRect());

      return {
        id,
      x: x - scrollRef.current.x,
      y: y - scrollRef.current.y,
      };
    }));
  }, [handler]);

  // Update lines & connectors when updating field
  useLayoutEffect(() => {
    setTimeout(() => {
      setLines(handler.getLines());
      refreshConnectors();
    });
  }, [handler, field, refreshConnectors]);

  useEffect(() => {
    return handler.onChange(() => {
      setTimeout(() => refreshConnectors());
    });
  }, [handler, refreshConnectors]);

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

  const [moving, setMoving] = useState(false);

  const requestLift = useCallback(() => setMoving(true));

  const requestSettle = useCallback((idx, { x, y }) => {
    setMoving(false);

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

  const requestRedraw = useCallback(() => setLines(handler.getLines()), []);

  // FPGA Context related stuff

  const dispatch = useDispatch();

  // cpid = Clocking Pin ID
  const cpid = useRef(null);
  const fpgaCtx = useMemo(() => {
    return {
      regClocking: id => {
        cpid.current = id;

        const other = handler.getConnected(id);
        if(other !== null)
          return dispatch(updateClock(handler.getData(other)));
        else
          return dispatch(updateClock(null));
      },
      unregClocking: () => {
        cpid.current = null;
        dispatch(updateClock(null));
      }
    };
  }, [handler, dispatch]);

  useEffect(() => {
    return handler.onChange(() => {
      if(!cpid.current) return;

      const other = handler.getConnected(cpid.current);
      if(other !== null)
        return dispatch(updateClock(handler.getData(other)));
      else
        return dispatch(updateClock(null));
    });
  }, [handler, cpid, dispatch]);

  const [layer, setLayer] = useState(LAYERS.BLOCK);
  const switchLayer = useCallback(() => {
    if(layer === LAYERS.BLOCK) setLayer(LAYERS.WIRE);
    else setLayer(LAYERS.BLOCK);

    setLinking(null);
    setFocus(null);
  }, [layer]);
  console.log(focus);

  const onBlur = useCallback(() => { console.log('BLUR'); setFocus(null); }, []);

  return <>
    <div
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
          scrollRef.current = { ...curScroll };
          setScroll(scrollRef.current);
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
        <SandboxContext.Provider value={handler}>
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
                requestLift={requestLift}
                requestSettle={requestSettle}
                requestDelete={requestDelete}
                requestRedraw={requestRedraw}
              >
              </BlockWrapper>
            ))}
          </div>

          <Shutter open={layer === LAYERS.WIRE} />

          <WireLayer
            groups={groups}
            connectors={connectors}
            scroll={scroll}
            width={canvasWidth}
            height={canvasHeight}
            active={layer === LAYERS.WIRE || linking !== null}
            linking={linking}
            link={link}
            linkCancel={linkCancel}
            focus={focus}
            onFocus={setFocus}
            onBlur={onBlur}
            className={cn({ 'wires-off': moving })}
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
    </div>

    <div className={cn("sandbox-toolbar", { 'block-mode': layer === LAYERS.BLOCK, 'wire-mode': layer === LAYERS.WIRE })}>
      <div className="layer-switcher" onClick={switchLayer}>
        <Icon
          className={cn("layer-icon", { 'layer-icon-active': layer === LAYERS.BLOCK })}
        >border_all</Icon>
        <Icon
          className={cn("layer-icon", { 'layer-icon-active': layer === LAYERS.WIRE })}
        >device_hub</Icon>
      </div>

      <div className="sep">/</div>

      <span className="tool" data-tool="block 1"><Icon>save</Icon></span>
      <div className="sandbox-toolbar-hint tool-activated">Save sandbox <small>[C-s]</small></div>

      <span className="tool" data-tool="block 2"><Icon>open_in_browser</Icon></span>
      <div className="sandbox-toolbar-hint tool-activated">Load sandbox <small>[C-o]</small></div>

      <span className={cn("tool", { 'tool-disabled': focus === null })} data-tool="wire 1"><Icon>close</Icon></span>
      <div className="sandbox-toolbar-hint tool-activated">Disconnect <small>[C-d]</small></div>

      <span className={cn("tool", { 'tool-disabled': focus?.type !== 'group' })} data-tool="wire 2"><Icon>format_paint</Icon></span>
      <div className="sandbox-toolbar-hint tool-activated">Color <small>[C-c]</small></div>

      <div className="sandbox-toolbar-hint">
        <div data-iter="1" className={cn("layer-hint", { 'layer-hint-active': layer === LAYERS.BLOCK })}>Block</div>
        <div data-iter="2" className={cn("layer-hint", { 'layer-hint-active': layer === LAYERS.WIRE })}>Wire</div>
        <div className={cn('layer-hint-tail', `layer-hint-tail-${layer === LAYERS.WIRE ? 'wire' : 'block'}`)}>layer [C-l]</div>
      </div>
    </div>
  </>;
});

const BlockWrapper = React.memo(({ idx, spec, requestLift, requestSettle, requestDelete, requestRedraw, ...rest }) => {
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

    if(requestLift)
      requestLift();

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

  const onDelete = useCallback(() => requestDelete(idx), [idx, requestDelete])

  const weakBlocker = useCallback(e => {
    e.stopPropagation();
  }, [moving]);

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
          <button className="delete" onClick={onDelete} onMouseDown={weakBlocker}>
            <Icon>close</Icon>
          </button>
        )}
      </div>
      <Block
        id={spec.id}
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
const WireLayer = React.memo(({
  className,
  width,
  height,
  scroll,

  connectors,
  groups,

  active,

  linking,
  link,
  linkCancel,

  onFocus,
  onBlur,
  focus,
}) => {
  const FACTOR = 3;
  const MASK_RADIUS = 2;

  const lib = useSelector((state) => state.lib);

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
  const { xSet, ySet } = useMemo(() => {
    const xSet = new Set();
    const ySet = new Set();

    for(const connector of connectors) {
    }
  }, [connectors]);
  */

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
      return [
        bounded(x - delta, mWidth),
        bounded(y - delta, mHeight),
        bounded(x + delta, mWidth),
        bounded(y + delta, mHeight),
      ];
    }

    const result = [];

    for(const { x, y, /* id */ } of connectors) {
      if (x < minX || x > maxX || y < minY || y > maxY)
        continue;
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

      let points = [];
      for (const { x, y } of mazeCoords) {
        maze.clean_mut(...boundedRadius(x, y, MASK_RADIUS));
        points.push([x, y]);
      }
      const arg = new lib.Points(points);

      const rawChangeset = maze.multi_terminal(arg);
      arg.free();

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

      for(const [x, y, /* type */] of changeset) {
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
      for (const [x, y, /* type */] of changeset) {
        const dx = (x - minMCX) * FACTOR;
        const dy = (y - minMCY) * FACTOR;

        ctx.fillRect(
          dx,
          dy,
          FACTOR,
          FACTOR,
        );
      }

      result.push({
        group,
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
  }, [groups, maxX, minX, maxY, minY, lib.Maze, lib.Points, connectors]);

  const collide = useCallback((x, y) => {
    const dx = x - scroll.x;
    const dy = y - scroll.y;

    for(const cur of canvases) {
      const { group, offset, dim, canvas } = cur;
      const cdx = dx - offset.x;
      const cdy = dy - offset.y;

      if(cdx < 0 || cdy < 0) continue;
      if(cdx >= dim.w || cdy >= dim.h) continue;

      const ctx = canvas.getContext('2d');
      const imgData = ctx.getImageData(cdx, cdy, 1, 1);

      // Extract alpha
      const alpha = imgData.data[3];
      if(alpha > 0) {
        console.log('Collided with ', group);
        return cur;
      }
    }

    return null;
  }, [canvases, scroll]);

  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const handleMouse = useCallback(e => {
    const { x, y } = e.target.getBoundingClientRect();

    setMouse({
      x: e.clientX - x,
      y: e.clientY - y,
    })
  }, []);

  const collided = useMemo(() => {
    return collide(mouse.x, mouse.y);
  }, [collide, mouse]);

  // Connector stuff
  const connectorRadius = 15 / 2;

  // Get hovered connector
  const hovered = useMemo(() => {
    const { x: mx, y: my } = mouse;
    const smx = mx - scroll.x;
    const smy = my - scroll.y;
    for(const connector of connectors) {
      const { x: cx, y: cy } = connector;

      const distSq = (smx - cx) * (smx - cx) + (smy - cy) * (smy - cy);
      if(distSq <= connectorRadius * connectorRadius)
        return connector;
    }

    return null;
  }, [mouse, connectors, scroll]);

  // Draw connectors
  const renderConnectors = useCallback(canvas => {
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    for(const { id, x, y } of connectors) 
      if(id !== hovered?.id && id !== linking) {
        ctx.beginPath();
        ctx.arc(x + scroll.x, y + scroll.y, connectorRadius, 0, 2*Math.PI);
        ctx.fill();
        ctx.stroke();
      }

    if(hovered !== null && hovered.id !== linking) {
      ctx.shadowColor = 'rgba(255, 199, 56, .8)'
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.beginPath();
      ctx.arc(hovered.x + scroll.x, hovered.y + scroll.y, connectorRadius, 0, 2*Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = 'transparent';
    }

    const linkingComp = connectors.find(e => e.id === linking);

    if(linkingComp) {
      ctx.fillStyle = 'rgba(255, 199, 56, .5)'
      ctx.strokeStyle = 'rgba(255, 199, 56, 1)'
      ctx.beginPath();
      ctx.arc(linkingComp.x + scroll.x, linkingComp.y + scroll.y, connectorRadius, 0, 2*Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = 'transparent';
    }
  }, [connectors, scroll, width, height, hovered, linking]);

  // Composite all canvases
  const renderer = useCallback(canvas => {
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    function drawWithShadow(spec, color, blur, mapper = null) {
      const { offset: { x, y }, dim: { w, h }, canvas: cvs } = spec;

      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      const mapped = mapper ? mapper(cvs) : cvs;

      ctx.drawImage(mapped, 0, 0, w, h, x + scroll.x, y + scroll.y, w, h);

      ctx.shadowColor = 'rgba(0, 0, 0, 0)';
    }

    function recolor(canvas, color) {
      const ncvs = document.createElement('canvas');
      ncvs.height = canvas.height;
      ncvs.width = canvas.width;
      const ctx = ncvs.getContext('2d');

      ctx.fillStyle = color;
      ctx.fillRect(0, 0, ncvs.width, ncvs.height);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(canvas, 0, 0);
      return ncvs;
    }

    let focusedComp = null;
    if(focus && focus.type === 'group')
      focusedComp = canvases.find(e => e.group.id === focus.id);

    ctx.globalAlpha = 0.7;
    for(const { offset: { x, y }, dim: { w, h }, canvas: cvs } of canvases)
      if(hovered || !collided || cvs !== collided.canvas) // TODO: focus?
        ctx.drawImage(cvs, 0, 0, w, h, x + scroll.x, y + scroll.y, w, h);

    ctx.globalAlpha = 1;

    // Draw shadow for focused object
    if(focusedComp)
      drawWithShadow(focusedComp, 'rgba(255, 199, 56, 1)', 12, cvs => recolor(cvs, 'rgb(255,199,56)'));

    // Draw shadow for hovered object
    if(!hovered && collided && collided !== focusedComp)
      drawWithShadow(collided, 'rgba(255, 199, 56, .8)', 4);
  }, [canvases, scroll, width, height, collided, focus, hovered]);

  const handleMouseDown = useCallback(e => {
    if(linking) {
      if(hovered && hovered.id === linking) {
        if(linkCancel) linkCancel();
      } else if(hovered) {
        if(link) link(hovered.id);
      } else if(collided) {
        // Asserts group have more than 0 member
        if(link) link(collided.group.members[0].id);
      }
    } else {
      if(collided) {
        e.stopPropagation();
        if(onFocus)
          onFocus({
            type: 'group',
            id: collided.group.id,
          });
      } else {
        if(onBlur) onBlur();
      }
    }
  }, [collided, hovered, linking, link]);

  return (
    <>
      <canvas
        ref={renderer}
        width={width}
        height={height}
        className={cn('wires', { 'wires-shown': active, 'wires-hover': hovered !== null || collided !== null }, className)}
        onMouseMove={handleMouse}
        onMouseDown={handleMouseDown}
      />
      <canvas
        ref={renderConnectors}
        width={width}
        height={height}
        className={cn('hover-connectors', { 'hover-connectors-shown': active })}
      />
    </>
  );
});

const Shutter = React.memo(({ open, className, ...rest }) => {
  return <div className={cn('shutter', className, { 'shutter-open': open })} {...rest}>
    <div className="shutter-top"></div>
    <div className="shutter-bottom"></div>
  </div>;
});
