import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import cn from 'classnames';
import { saveAs } from 'file-saver';

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
  exportWorkspace,
  showSnackbar,
} from '../store/actions';

import { registerCodeLens } from '../lang';

import Monaco from 'react-monaco-editor';
import { Range, editor } from 'monaco-editor/esm/vs/editor/editor.api';

import Sandbox from '../Sandbox';

export default React.memo(({ showSettings, sandboxHandlerRef }) => {
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
      if(searchRef.current) setTimeout(() => searchRef.current.focus());
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
    else return board.pins.map((e, i) => ({ index: i, ...e })).filter(e => {
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
      const sig = rev.get(p.index);
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

    let perfectMatch = null;

    const filtered = sortedPins.filter(e => {
      const signal = revAssignment.get(e.index);
      if(signal && signal.indexOf(search) !== -1)
        return true;

      if('clock'.indexOf(search.toLowerCase()) === 0 && e.clock)
        return true;

      const label = e.label || e.index.toString();
      if(label.toLowerCase() === search.toLowerCase()) perfectMatch = e;
      if(label.toLowerCase().indexOf(search.toLowerCase()) !== -1)
        return true;

      return false;
    });

    if(perfectMatch === null) return filtered;
    else return [perfectMatch, ...filtered.filter(e => e !== perfectMatch)];
  }, [search, sortedPins, revAssignment])

  const handleAssign= useCallback(index => {
    if(assigning.subscript === -1) throw new Error('Condition failed');
    const fullName = assigning.subscript === null ? assigning.name : assigning.name + `[${assigning.subscript}]`;
    dispatch(assignPin(fullName, index));
    setTimeout(() => searchRef.current.focus());
  }, [dispatch, assigning]);

  let firstFilteredIndex = filteredPins.findIndex(e => !e.current);

  const pinDisp = useMemo(() => filteredPins.map((pin, fidx) => {
    const directions = [];

    // From the FPGA's PoV
    if(pin.input) directions.push('Out');
    if(pin.output) directions.push('In');
    if(pin.clock) directions.push('Clock');

    const signal = revAssignment.get(pin.index);

    return (
      <div className={cn("pin", "monospace", { "pin-assigned": !!signal })} key={ pin.index } onClick={() => handleAssign(pin.index)}>
        <div className="pin-ident">
          <div className="pin-number">{ pin.label || (Number.isInteger(pin.idx) ? pin.idx : pin.index) }</div>
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

  const expandedSignals = useMemo(() => {
    if(!analysis) return [];
    if(analysis.top === null) return [];
    const entity = analysis.entities[analysis.top];

    return entity.signals.reduce((acc, { name, dir, arity }) => {
      const result = [];
      if (arity === null) {
        // std_logic
        const assigned = assignments.get(name) ?? null;
        result.push({
          name,
          subscript: null,
          assigned,
          dir,
          start: true,
          end: true,
        });
      } else {
        // std_logic_vector
        let { from, to } = arity;
        let step = 1;
        if (from > to) {
          step = -1;
        }
        for (let i = from; i !== to + step; i += step) {
          const assigned = assignments.get(`${name}[${i}]`) ?? null;
          result.push({
            name,
            subscript: i,
            assigned,
            dir,
            start: i === from,
            end: i === to,
          });
        }
      }

      return acc.concat(result);
    }, []);
  }, [assignments, analysis]);

  const signalStep = useCallback(step => {
    // Find signal
    if(expandedSignals.length === 0) return;
    const cur = expandedSignals.findIndex(e => e.name === assigning.name && e.subscript === assigning.subscript);
    let next = cur + step;
    if(next >= expandedSignals.length) next = 0;
    else if(next === -1) next = expandedSignals.length - 1;

    const { name, subscript, dir } = expandedSignals[next];

    setAssigning({ name, subscript, dir });
  }, [expandedSignals, assigning]);

  const signalInc = useCallback(() => signalStep(1), [signalStep]);
  const signalDec = useCallback(() => signalStep(-1), [signalStep]);

  const checkKey= useCallback(ev => {
    if(ev.key === 'Escape' || (ev.key === 'g' && ev.ctrlKey))
      setAssigning(null);
    else if(ev.key === 'Enter') {
      if(firstFilteredIndex !== -1) {
        handleAssign(filteredPins[firstFilteredIndex].index)
        setSearch('');
        signalInc();
      }
    } else if(ev.key === 'Tab') {
      // TODO: add hint/guide for this
      if(ev.shiftKey)
        signalDec();
      else
        signalInc();

      ev.preventDefault();
    } else if (ev.key === 'n' && ev.ctrlKey) {
      // C-n
      signalInc();
      ev.preventDefault();
    } else if (ev.key === 'p' && ev.ctrlKey) {
      // C-p
      signalDec();
      ev.preventDefault();
    }
  }, [setAssigning, handleAssign, filteredPins, firstFilteredIndex, signalInc, signalDec]);

  const canUpload = useMemo(() => {
    if(!analysis || analysis.top === null) return null;
    return expandedSignals.every(e => e.assigned !== null);
  }, [analysis, expandedSignals]);

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
  }, [dispatch]);

  const lang = useSelector(store => store.lang);
  useEffect(() => {
    const model = editorRef.current.editor.getModel();
    editor.setModelLanguage(model, lang);
  }, [lang]);

  const doExport = useCallback(() => {
    const redux = dispatch(exportWorkspace());
    const sandbox = sandboxHandlerRef.current.export();

    const str = JSON.stringify({ redux, sandbox, lang }, null, 2);
    const blob = new Blob([str], { type: 'application/json;charset=utf-8' });
    saveAs(blob, 'jielabs-export.json');
    dispatch(showSnackbar('Exported! Drag-n-Drop to load', 5000));
  }, [sandboxHandlerRef, dispatch, lang]);

  return <main className="workspace">
    <div className="left">
      <Sandbox handlerRef={sandboxHandlerRef} />
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

      <button onClick={doExport}>
        <Icon>save</Icon>
      </button>

      <button onClick={showSettings}>
        <Icon>settings</Icon>
      </button>

      <button onClick={showHelp}>
        <Icon>help_outline</Icon>
      </button>
    </div>
    <div className="right">
      <Monaco
        options={{
          theme: 'vs-dark',
          language: 'vhdl',
          glyphMargin: true,
          automaticLayout: true,
          fontFamily: 'Roboto Mono',
        }}
        value={code}
        onChange={setCode}
        editorDidMount={editorDidMount}
        ref={editorRef}
      />
    </div>

    <Dialog open={assigning} onClose={dismissAssigning}
      className="pin-assignment-dialog"
      onKeyDown={checkKey}
      tabIndex="0"
      render={() => (<>
        <div className="pin-assignment-left">
          <div className="subscript-adjust-box">
            <span
              className={cn('subscript-adjust', { invalid: assigning.subscript === -1})}
              onClick={signalDec}
            >
              <Icon>keyboard_arrow_left</Icon>
              S-Tab
            </span>

            <span className="sep">/</span>

            <span
              className={cn('subscript-adjust', { invalid: assigning.subscript === -1})}
              onClick={signalInc}
            >
              Tab
              <Icon>keyboard_arrow_right</Icon>
            </span>
          </div>

          <div className="pin-assignment-signals">
            { expandedSignals.map(({ name, subscript, assigned, dir, start, end }) => (
              <div
                className={cn("pin-assignment-signal", {
                  'pin-assignment-signal-active': assigning?.name === name && assigning.subscript === subscript,
                  'pin-assignment-signal-start': start,
                  'pin-assignment-signal-end': end,
                })}
                onClick={() => setAssigning({ name, subscript, dir })}
                key={`${name}-${subscript || ''}`}
              >
                <span className={cn('pin-assignment-signal-name', { 'pin-assignment-signal-name-assigned': assigned !== null })}>
                  { name }{ subscript !== null && (
                    <span className="pin-assignment-signal-subscript">
                      <span className="dimmed">[</span>
                      { subscript }
                      <span className="dimmed">]</span>
                    </span>
                  )}
                </span>

                { assigned !== null && (
                  <div
                    className={cn("pin-assignment-signal-assigned", `pin-assignment-signal-assigned-${dir}`)}
                  >
                    { board.pins[assigned].label ?? assigned }
                  </div>
                )}
              </div>
            )) }
          </div>
        </div>
        <div className="pin-assignment-right">
          <div className="hint">PIN ASSIGNMENT</div>
          <div className="dialog-title monospace pin-assignment-title">
            <span className="dimmed pin-assignment-top">
              { top }
            </span>
            <span className="dimmed">/</span>
            <span className="spacer"></span>
            <span>{ assigning.name }</span>
            { assigning.subscript !== null && (
              <span>
                <span className="dimmed">[</span>
                { assigning.subscript.toString() }
                <span className="dimmed">]</span>
              </span>
            )}
          </div>
          <div className="search-box">
            <Icon className="search-icon">search</Icon>
            <input
              className="search-input monospace"
              placeholder="Signal | Label | 'clock'"
              value={search}
              onMouseDown={weakBlocker}
              onChange={searchChange}
              ref={searchRef}
            />
          </div>

          <div className="pin-selector">
            { pinDisp }
          </div>
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
      <div className="help-spacer" />
      <div className="hint help-cheatsheet-header">Editor - Pin Assignment</div>
      <div className="help-cheatsheet">
        <div className="help-shortcut"><strong>Enter</strong> Assign + step</div>
        <div className="help-shortcut"><strong>Escape</strong> Exit</div>
        <div className="help-shortcut"><strong>Tab</strong> Next signal</div>
        <div className="help-shortcut"><strong>Shift-Tab</strong> Previous signal</div>
      </div>
    </Dialog>
  </main>;
});
