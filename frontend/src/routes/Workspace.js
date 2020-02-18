import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import cn from 'classnames';

import Icon from '../comps/Icon';

import { BOARDS } from '../config';

import { updateCode, submitBuild, connectToBoard, programBitstream, updateTop, assignPin } from '../store/actions';

import { registerCodeLens } from '../vhdl';

import Monaco from 'react-monaco-editor';
import { Range } from 'monaco-editor/esm/vs/editor/editor.api';

import Sandbox from '../Sandbox';

export default React.memo(() => {
  const dispatch = useDispatch();

  const code = useSelector(store => store.code);
  const setCode = useCallback(code => dispatch(updateCode(code)), [dispatch]);

  // TODO: disable button when polling
  const isPolling = useSelector(store => store.build.isPolling);
  const doUpload = useCallback(async () => {
    if (!isPolling) {
      await dispatch(submitBuild(code));
    }
  }, [code, dispatch, isPolling]);

  const hasBoard = useSelector(store => store.board.hasBoard);
  const doConnect = useCallback(async () => {
    if (!hasBoard) {
      await dispatch(connectToBoard());
    }
  }, [dispatch, hasBoard]);

  const hasBitstream = useSelector(store => store.build.buildInfo && store.build.buildInfo.status === "Compilation Success");
  const doProgram = useCallback(async () => {
    if (hasBoard && hasBitstream) {
      await dispatch(programBitstream());
    }
  }, [dispatch, hasBitstream, hasBoard]);

  const [assigning, setAssigning] = useState(null);
  const dismissAssigning = useCallback(() => setAssigning(null), []);

  const [search, setSearch] = useState('');
  const searchChange = useCallback(e => setSearch(e.target.value), []);
  const searchRef = useRef();

  const editorRef = useRef();
  const editorDidMount = useCallback((editor, monaco) => {
    const asTop = editor.addCommand(0, (ctx, { name }) => {
      dispatch(updateTop(name));
    });

    const assignPin = editor.addCommand(0, (ctx, { name, dir }) => {
      setAssigning({ name, dir });
      setSearch('');
      setTimeout(() => searchRef.current.focus());
    });

    registerCodeLens({ asTop, assignPin });
  }, [dispatch]);

  const top = useSelector(state => state.signals.top);
  const blocker = useCallback(e => {
    e.preventDefault();
    e.stopPropagation();
  });

  const boardName = useSelector(state => state.signals.board);
  const board = BOARDS[boardName];

  const assignments = useSelector(state => state.signals.signals);

  const availablePins = useMemo(() => {
    if(!assigning) return [];
    else return board.pins.map((e, i) => ({ idx: i, ...e })).filter(e => {
      if(assigning.dir === 'input') return e.output;
      else if(assigning.dir === 'output') return e.input;
      else return true;
    });
  }, [board, assigning]);

  const [sortedPins, revAssignment] = useMemo(() => {
    const assignedResult = [], unassignedResult = [];
    const rev = new Map();

    for(const [signal, pin] of assignments.entries())
      rev.set(pin, signal);

    let current = null;

    for(const p of availablePins) {
      const sig = rev.get(p.idx);
      if(sig === assigning.name)
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
      if(signal && signal.indexOf(search) === 0)
        return true;

      if('clock'.indexOf(search.toLowerCase()) === 0 && e.clock)
        return true;

      return false;
    });
  }, [search, sortedPins, revAssignment])

  const handleAssign= useCallback(idx => {
    dispatch(assignPin(assigning.name, idx));
    setAssigning(null);
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

  const checkKey= useCallback(ev => {
    if(ev.key === 'Escape')
      setAssigning(null);
    if(ev.key === 'Enter') {
      if(firstFilteredIndex != -1)
        handleAssign(filteredPins[firstFilteredIndex].idx)
    }
  }, [setAssigning, handleAssign, filteredPins, firstFilteredIndex]);

  const analysis = useSelector(state => state.analysis);

  useEffect(() => {
    if(!analysis || analysis.top === null) return;
    if(!editorRef.current) return;

    const editor = editorRef.current.editor;

    const topEntity = analysis.entities[analysis.top-1]; // TODO: fix backend counting

    const decorations = [
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
      ...topEntity.signals.map(signal => ({
        range: new Range(
          signal.pos.from_line + 1,
          signal.pos.from_char + 1,
          signal.pos.to_line + 1,
          signal.pos.to_char + 1,
        ),
        options: {
          isWholeLine: true,
          className: assignments.get(signal.name) === undefined ? 'unassigned-signal-line' : 'assigned-signal-line',
          glyphMarginClassName: assignments.get(signal.name) === undefined ? 'unassigned-signal-glyph' : 'assigned-signal-glyph',
        },
      }))
    ];

    const ids = editor.deltaDecorations([], decorations);

    return () => {
      editor.deltaDecorations(ids, []);
    };
  }, [analysis, assignments]);

  return <main className="workspace">
    <div className="left">
      <Sandbox />
    </div>
    <div className="toolbar">
      <button className="primary" onClick={doUpload}>
        <Icon>play_arrow</Icon>
      </button>

      <button className="secondary" onClick={doConnect}>
        <Icon>developer_board</Icon>
      </button>

      <button className="secondary" onClick={doProgram}>
        <Icon>cloud_download</Icon>
      </button>

      <button>
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
        }}
        value={code}
        onChange={setCode}
        editorDidMount={editorDidMount}
        ref={editorRef}
      />
    </div>

    <TransitionGroup>
      { assigning !== null &&
        <CSSTransition
          timeout={500}
          classNames="fade"
        >
          <div className="backdrop centering" onMouseDown={dismissAssigning}>
            <div className="dialog" onMouseDown={blocker}>
              <div className="hint">Pin Assignment</div>
              <div className="dialog-title monospace"><span className="dimmed">{ top } / </span>{ assigning.name }</div>

              <div className="search-box">
                <Icon className="search-icon">search</Icon>
                <input
                  className="search-input monospace"
                  placeholder="Number | Signal | 'clock'"
                  value={search}
                  onChange={searchChange}
                  onKeyDown={checkKey}
                  ref={searchRef}
                />
              </div>

              <div className="pin-selector">
                { pinDisp }
              </div>
            </div>
          </div>
        </CSSTransition>
      }
    </TransitionGroup>
  </main>;
});
