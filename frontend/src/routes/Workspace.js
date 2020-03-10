import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import cn from 'classnames';

import Icon from '../comps/Icon';
import Tooltip from '../comps/Tooltip';
import Dialog from '../comps/Dialog';

import { BOARDS } from '../config';

import {
  BOARD_STATUS,
  updateCode,
  submitBuild,
  programBitstream,
  updateTop,
  assignPin,
  startHelp,
  showSnackbar,
} from '../store/actions';

import { registerCodeLens } from '../lang';

import Monaco from 'react-monaco-editor';
import { Range, editor } from 'monaco-editor/esm/vs/editor/editor.api';

import Sandbox from '../Sandbox';

export default React.memo(({ showSettings }) => {
  const dispatch = useDispatch();

  const code = useSelector(store => store.code);
  const setCode = useCallback(code => dispatch(updateCode(code)), [dispatch]);

  const doUpload = useCallback(async () => {
    await dispatch(submitBuild());
  }, [dispatch]);

  const hasBoard = useSelector(store => store.board.status === BOARD_STATUS.CONNECTED || store.board.status === BOARD_STATUS.PROGRAMMING);
  const idleBoard = useSelector(store => store.board.status === BOARD_STATUS.CONNECTED);

  // The ID of the latest build, or null if the latest build is not ready yet
  const readyLatestId = useSelector(store => {
    const { builds } = store;
    const latest = builds.list.get(0);
    if(!latest) return null;
    if(latest.status !== 'Compilation Success') return null;
    return latest.id;
  });

  const doProgram = useCallback(() => {
    if(readyLatestId !== null && idleBoard)
      dispatch(programBitstream(readyLatestId));
  }, [readyLatestId, idleBoard, dispatch]);
  
  const [help, setHelp] = useState(false);
  const showHelp = useCallback(() => {
    setHelp(true);
  }, []);
  const dismissHelp = useCallback(() => setHelp(false), []);

  const [assigning, setAssigning] = useState(null);
  const dismissAssigning = useCallback(() => setAssigning(null), []);

  const [search, setSearch] = useState('');
  const searchChange = useCallback(e => setSearch(e.target.value), []);
  const searchRef = useRef();

  const editorRef = useRef();
  const unregCodeLens = useRef(null);
  const editorDidMount = useCallback((editor, monaco) => {
    const asTop = editor.addCommand(0, (ctx, { name }) => {
      dispatch(updateTop(name));
    });

    const assignPin = editor.addCommand(0, (ctx, { name, dir }, subscript) => {
      if(subscript === null)
        setAssigning({ name, dir, subscript: null });
      else
        setAssigning({ name, dir, subscript });
      setSearch('');
      setTimeout(() => searchRef.current.focus());
    });

    const unreg = registerCodeLens({ asTop, assignPin });
    unregCodeLens.current = unreg;
  }, [dispatch]);

  useEffect(() => () => {
    if(unregCodeLens.current) unregCodeLens.current();
  }, []);

  const top = useSelector(state => state.constraints.top);

  const weakBlocker = useCallback(e => {
    e.stopPropagation();
  }, []);

  const boardName = useSelector(state => state.constraints.board);
  const board = BOARDS[boardName];

  const assignments = useSelector(state => state.constraints.signals);

  const availablePins = useMemo(() => {
    if(!assigning) return [];
    else return board.pins.map((e, i) => ({ idx: i, ...e })).filter(e => {
      if(assigning.dir === 'input') return e.output;
      else if(assigning.dir === 'output') return e.input;
      else return true;
    });
  }, [board, assigning]);

  const [sortedPins, revAssignment] = useMemo(() => {
    if(assigning === null) return [[], new Map()];
    const assignedResult = [], unassignedResult = [];
    const rev = new Map();

    for(const [signal, pin] of assignments.entries())
      rev.set(pin, signal);

    let current = null;

    if(assigning.subscript === -1) return [[], new Map()];
    const fullName = assigning.subscript === null ? assigning.name : assigning.name + `[${assigning.subscript}]`;

    for(const p of availablePins) {
      const sig = rev.get(p.idx);
      if(sig === fullName)
        current = p;
      else if(sig !== undefined)
        assignedResult.push(p);
      else unassignedResult.push(p);
    }

    const tail = unassignedResult.concat(assignedResult);
    const sorted = current !== null ? [{ current: true, ...current }, ...tail] : tail;

    return [sorted, rev];
  }, [availablePins, assignments, assigning]);

  const filteredPins = useMemo(() => {
    if(search === '') return sortedPins;
    const rawNum = Number.parseInt(search, 10);
    const num = Number.isInteger(rawNum) ? rawNum : null;

    return sortedPins.filter(e => {
      // Strong equality to avoid rawNum = NaN
      if(e.idx === num)
        return true;

      const signal = revAssignment.get(e.idx);
      if(signal && signal.indexOf(search) !== -1)
        return true;

      if('clock'.indexOf(search.toLowerCase()) === 0 && e.clock)
        return true;

      return false;
    });
  }, [search, sortedPins, revAssignment])

  const handleAssign= useCallback(idx => {
    if(assigning.subscript === -1) throw new Error('Condition failed');
    const fullName = assigning.subscript === null ? assigning.name : assigning.name + `[${assigning.subscript}]`;
    dispatch(assignPin(fullName, idx));
  }, [dispatch, assigning]);

  let firstFilteredIndex = filteredPins.findIndex(e => !e.current);

  const pinDisp = useMemo(() => filteredPins.map((pin, fidx) => {
    const directions = [];

    // From the FPGA's PoV
    if(pin.input) directions.push('Out');
    if(pin.output) directions.push('In');
    if(pin.clock) directions.push('Clock');

    const signal = revAssignment.get(pin.idx);

    return (
      <div className={cn("pin", "monospace", { "pin-assigned": !!signal })} key={ pin.idx } onClick={() => handleAssign(pin.idx)}>
        <div className="pin-ident">
          <div className="pin-number">{ pin.idx }</div>
          <div className="pin-name">{ pin.pin }</div>
        </div>
        <div className="pin-info">
          <div className="pin-assignment">{ signal || 'Unassigned' }</div>
          <div className="pin-direction">{ directions.join(' / ') }</div>
        </div>
        { fidx === firstFilteredIndex && <div className="pin-enter-hint"><Icon>keyboard_return</Icon></div> }
        { pin.current && <div className="pin-enter-hint">ESC</div> }
      </div>
    );
  }), [filteredPins, revAssignment, firstFilteredIndex, handleAssign]);

  const analysis = useSelector(state => state.analysis);

  useEffect(() => {
    if(!analysis) return;
    if(!editorRef.current) return;

    const decorations = [
      // Diagnostics
      ...analysis.diagnostics.map(d => ({
        range: new Range(
          d.pos.from_line + 1,
          d.pos.from_char + 1,
          d.pos.to_line + 1,
          d.pos.to_char + 1,
        ),
        options: {
          inlineClassName: `diagnostic-${d.severity}`,
        },
      })),
    ];

    if(analysis.top !== null) {
      const topEntity = analysis.entities[analysis.top];

      decorations.push(
        // Top entity marker
        {
          range: new Range(
            topEntity.decl.from_line + 1,
            topEntity.decl.from_char + 1,
            topEntity.decl.to_line + 1,
            topEntity.decl.to_char + 1,
          ),
          options: {
            isWholeLine: true,
            className: 'top-line',
            glyphMarginClassName: 'top-glyph',
          },
        },
        // Pin assignments
        ...topEntity.signals.map(signal => {
          let mapped = false;
          if(signal.arity === null)
            mapped = assignments.get(signal.name) !== undefined;
          else if(signal.arity.from >= signal.arity.to) {
            mapped = true;
            for(let i = signal.arity.to; i <= signal.arity.from; ++i)
              if(assignments.get(signal.name + `[${i}]`) === undefined) {
                mapped = false;
                break;
              }
          } else {
            mapped = true;
            for(let i = signal.arity.from; i <= signal.arity.to; ++i)
              if(assignments.get(signal.name + `[${i}]`) === undefined) {
                mapped = false;
                break;
              }
          }

          return {
            range: new Range(
              signal.pos.from_line + 1,
              signal.pos.from_char + 1,
              signal.pos.to_line + 1,
              signal.pos.to_char + 1,
            ),
            options: {
              isWholeLine: true,
              className: mapped ? 'assigned-signal-line' : 'unassigned-signal-line',
              glyphMarginClassName: mapped ? 'assigned-signal-glyph' : 'unassigned-signal-glyph',
            },
          };
        }),
      );
    }

    const editor = editorRef.current.editor;

    const ids = editor.deltaDecorations([], decorations);

    return () => {
      editor.deltaDecorations(ids, []);
    };
  }, [analysis, assignments]);

  const [pendingSubscript, setPendingSubscript] = useState('');

  const subscriptChange = useCallback(e => {
    const nv = e.target.value;
    const parsed = Number.parseInt(nv, 10);

    const target = analysis.entities[analysis.top].signals.find(e => e.name === assigning.name);
    if(!target || target.arity === null) return;

    let valid;
    if(Number.isInteger(parsed)) {
      if(target.arity.from >= target.arity.to) {
        valid = parsed <= target.arity.from && parsed >= target.arity.to;
      } else {
        valid = parsed <= target.arity.to && parsed >= target.arity.from;
      }
    } else {
      valid = false;
    }

    setPendingSubscript(nv);
    setAssigning({
      ...assigning,
      subscript: valid ? parsed : -1,
    });
  }, [assigning, analysis]);

  const subscriptStep = useCallback(step => {
    // Asserts step \in {1, -1}
    if(assigning.subscript === -1 || assigning.subscript === null) return;
    if(!analysis) return;

    const target = analysis.entities[analysis.top].signals.find(e => e.name === assigning.name);
    if(!target || target.arity === null) return;

    let next;
    if(target.arity.from >= target.arity.to) {
      // Inc = -1
      next = assigning.subscript - step;
      if(next === target.arity.from+1) next = target.arity.to;
      if(next === target.arity.to-1) next = target.arity.from;
    } else {
      next = assigning.subscript + step;
      if(next === target.arity.from-1) next = target.arity.to;
      if(next === target.arity.to+1) next = target.arity.from;
    }

    setAssigning({
      ...assigning,
      subscript: next,
    });
  }, [analysis, assigning]);

  const subscriptInc = useCallback(() => subscriptStep(1), [subscriptStep]);
  const subscriptDec = useCallback(() => subscriptStep(-1), [subscriptStep]);

  const checkKey= useCallback(ev => {
    if(ev.key === 'Escape' || (ev.key === 'g' && ev.ctrlKey))
      setAssigning(null);
    else if(ev.key === 'Enter') {
      if(firstFilteredIndex !== -1)
        handleAssign(filteredPins[firstFilteredIndex].idx)
    } else if(ev.key === 'Tab') {
      // TODO: add hint/guide for this
      if(ev.shiftKey)
        subscriptDec();
      else
        subscriptInc();

      ev.preventDefault();
    } else if (ev.key === 'n' && ev.ctrlKey) {
      // C-n
      subscriptInc();
    } else if (ev.key === 'p' && ev.ctrlKey) {
      // C-p
      subscriptDec();
    }
  }, [setAssigning, handleAssign, filteredPins, firstFilteredIndex, subscriptInc, subscriptDec]);

  const canUpload = useMemo(() => {
    if(!analysis) return false;
    if(analysis.top === null) return false;
    const entity = analysis.entities[analysis.top];

    return entity.signals.every(({ name, arity }) => {
      if (arity === null) {
        // std_logic
        return assignments.get(name) !== undefined;
      } else {
        // std_logic_vector
        let { from, to } = arity;
        if (from > to) {
          [from, to] = [to, from];
        }
        for (let i = from; i <= to; i += 1) {
          if (assignments.get(`${name}[${i}]`) === undefined) {
            return false;
          }
        }
        return true;
      }
    });
  }, [assignments, analysis]);

  let downloadTooltip = '';
  if(!hasBoard) downloadTooltip = 'FPGA disconnected';
  else if(readyLatestId === null) downloadTooltip = 'Latest build not ready';

  const lastBuildBlocker = useSelector(store => {
    const { builds } = store;
    const latest = builds.list.get(0);
    if(!latest) return null;
    return latest.status === null ? latest.id : null;
  });
  let buildTooltip = '';
  if(!canUpload) buildTooltip = 'Top entity or signal not assigned';
  else if(lastBuildBlocker !== null) buildTooltip = `#${lastBuildBlocker} running. Hold Alt to submit again`;

  const [altHeld, setAltHeld] = useState(false);
  useEffect(() => {
    const down = e => {
      if(e.key === 'Alt') {
        e.preventDefault();
        setAltHeld(true);
      }
    }

    const up = e => {
      if(e.key === 'Alt') setAltHeld(false);
    }

    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);

    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
    };
  }, []);

  const startIntHelp = useCallback(() => {
    setHelp(false);
    dispatch(startHelp());
  });

  const lang = useSelector(store => store.lang);
  useEffect(() => {
    const model = editorRef.current.editor.getModel();
    editor.setModelLanguage(model, lang);
  }, [lang]);

  const helpStep = useSelector(state => state.help);
  useEffect(() => {
    if(helpStep === null) {
      // Help just closed
    }
  }, []);

  return <main className="workspace">
    <div className="left">
      <Sandbox />
    </div>
    <div className="toolbar">
      <Tooltip tooltip={buildTooltip}>
        <button className="primary" onClick={doUpload} disabled={!canUpload || (lastBuildBlocker !== null && !altHeld)}>
          <Icon>build</Icon>
        </button>
      </Tooltip>

      <Tooltip tooltip={downloadTooltip}>
        <button className="secondary" onClick={doProgram} disabled={!idleBoard || readyLatestId === null}>
          <Icon>cloud_download</Icon>
        </button>
      </Tooltip>

      <button onClick={showHelp}>
        <Icon>help_outline</Icon>
      </button>

      <button onClick={showSettings}>
        <Icon>settings</Icon>
      </button>
    </div>
    <div className="right">
      <Monaco
        options={{
          theme: 'vs-dark',
          language: 'vhdl',
          glyphMargin: true,
          automaticLayout: true,
        }}
        value={code}
        onChange={setCode}
        editorDidMount={editorDidMount}
        ref={editorRef}
      />
    </div>

    <Dialog open={assigning} onClose={dismissAssigning}
      render={() => (<>
        <div className="hint">PIN ASSIGNMENT</div>
        <div className="dialog-title monospace">
          <span className="dimmed">
            { top }
            <span className="spacer"></span>
            /
            <span className="spacer"></span>
          </span>
          { assigning.name }
          { assigning.subscript !== null && (
            <span>
              <span className="dimmed">[</span>
              <Icon
                className={cn("subscript-adjust", { invalid: assigning.subscript === -1})}
                onClick={subscriptDec}
              >keyboard_arrow_left</Icon>
              <input
                className={cn("subscript-input-region", { invalid: assigning.subscript === -1 })}
                value={assigning.subscript !== -1 ? assigning.subscript.toString() : pendingSubscript}
                onMouseDown={weakBlocker}
                onChange={subscriptChange}
              />
              <Icon
                className={cn("subscript-adjust", { invalid: assigning.subscript === -1})}
                onClick={subscriptInc}
              >keyboard_arrow_right</Icon>
              <span className="dimmed">]</span>
            </span>
          )}
        </div>

        <div className="search-box">
          <Icon className="search-icon">search</Icon>
          <input
            className="search-input monospace"
            placeholder="Number | Signal | 'clock'"
            value={search}
            onMouseDown={weakBlocker}
            onChange={searchChange}
            onKeyDown={checkKey}
            ref={searchRef}
          />
        </div>

        <div className="pin-selector">
          { pinDisp }
        </div>
      </>)}
    />

    <Dialog className="help-dialog" open={help} onClose={dismissHelp}>
      <div className="hint">STOP IT,</div>
      <div className="dialog-title monospace">Get some help</div>
      <div className="help-body">
        SAVE YOUR PROGRESS before starting the tutorial, as it will destroy BOTH YOUR CODE AND THE SANDBOX STATE.<br/>
        <button
          className="labeled-btn"
          onClick={startIntHelp}
        >
          <Icon>play_arrow</Icon><span>START TUTORIAL</span>
        </button>
      </div>
      <div className="help-spacer" />
      <div className="hint help-cheatsheet-header">Sandbox - Global</div>
      <div className="help-cheatsheet">
        <div className="help-shortcut"><strong>Ctrl-F</strong> Switch layer</div>
        <div className="help-shortcut"><strong>Ctrl-C</strong> Open color palette</div>
        <div className="help-shortcut"><strong>Tab</strong> Select next color</div>
        <div className="help-shortcut"><strong>Shift-Tab</strong> Select previous color</div>
      </div>
      <div className="help-spacer" />
      <div className="hint help-cheatsheet-header">Sandbox - Wire Layer</div>
      <div className="help-cheatsheet">
        <div className="help-shortcut"><strong>Shift</strong> Connect mode</div>
        <div className="help-shortcut"><strong>Delete</strong> Disconnect</div>
        <div className="help-shortcut"><strong>Backspace</strong> Disconnect</div>
        <div className="help-shortcut"><strong>Ctrl-D</strong> Dye current color</div>
      </div>
    </Dialog>
  </main>;
});
