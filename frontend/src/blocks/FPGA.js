import React, { useMemo, useCallback, useContext } from 'react';
import { useSelector, useDispatch }  from 'react-redux';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import { Connector, SIGNAL, MODE } from './index.js';
import { FPGAEnvContext } from '../Sandbox';
import { TimeoutContext } from '../App';
import Icon from '../comps/Icon';
import { BOARDS } from '../config';

import { BOARD_STATUS, setOutput, connectToBoard } from '../store/actions';

export default React.memo(({ id, ...rest }) => {
  const input = useSelector(state => state.input);
  const directions = useSelector(state => state.activeBuild?.directions);
  const dispatch = useDispatch();

  const status = useSelector(state => state.board.status);
  const ident = useSelector(state => state.board.ident);
  const boardTmpl = useSelector(state => BOARDS[state.constraints.board]);
  const boardTmplPins = boardTmpl.pins;

  const maxIdx = Math.max(...boardTmplPins.map((e, idx) => Number.isInteger(e.idx) ? e.idx : idx));

  const paddedInput = useMemo(() => {
    // Build reverse direction mapping
    const revDir = {};
    if(directions)
      for(const i in directions) {
        const ridx = boardTmplPins[i].idx ?? i;
        revDir[ridx] = directions[i]; // We are using objects here because typeof i === 'string'
      }

    const head = (input || []).map((e, idx) => {
      if(revDir[idx] === 'output') // Inputs from FPGA
        return SIGNAL.X;
      else
        return e;
    });

    // TODO: slice based on board tmpl pin count
    if(head.length > maxIdx) return head;
    const tail = Array(maxIdx + 1 - head.length).fill(SIGNAL.X);

    return head.concat(tail);
  }, [input, directions, boardTmplPins]);

  const gridStyle = useMemo(() => {
    const slotCount = boardTmpl.dimensions[0] * boardTmpl.dimensions[1];
    let paddingBottom = 0;
    if(slotCount === boardTmpl.pins.length && !boardTmpl.pins[slotCount-1].placeholder)
      paddingBottom = 10 + 15;

    return {
      paddingBottom,
      gridTemplateColumns: new Array(boardTmpl.dimensions[0]).fill('1fr').join(' '),
      gridTemplateRows: new Array(boardTmpl.dimensions[1]).fill('1fr').join(' '),
    };
  }, [boardTmpl]);

  const timeoutCtx = useContext(TimeoutContext);
  const doConnect = useCallback(async () => {
    await dispatch(connectToBoard());

    // TODO: don't start timeout if board allocation fails
    timeoutCtx.start();
  }, [timeoutCtx]);

  const ctx = useContext(FPGAEnvContext);

  function formatIdent(ident) {
    const segs = ident.split('.');
    // const prev = segs.slice(0, segs.length-1).join('.') + '.';
    const last = segs[segs.length-1];
    return <>
      { last }
    </>
  }

  return <div className="block fpga" style={gridStyle} {...rest}>
    { boardTmplPins.map((pin, idx) => {
      if(pin.placeholder)  return<div key={idx} className="pin-group" />;
      const ridx = Number.isInteger(pin.idx) ? pin.idx : idx;

      return (
        <div key={idx} className="pin-group">
          <Connector
            id={`${id}-${idx}`}
            className="pin"
            mode={pin.clock ? MODE.CLOCK_DEST : MODE.NORMAL}
            onChange={updated => {
              if(directions && idx in directions && directions[idx] === 'output')
                dispatch(setOutput(ridx, updated))
            }}
            onReg={pin.clock ? ctx.regClocking : null}
            onUnreg={pin.clock ? ctx.unregClocking : null}
            output={paddedInput[ridx]}
          />
          <div className="label">{ pin.label || ridx }</div>
        </div>
      );
    })}

    <TransitionGroup>
      { ident && (
        <CSSTransition
          timeout={500}
          classNames="fade"
          key={ident}
        >
          <div className="fpga-ident">{ formatIdent(ident) }</div>
        </CSSTransition>
      )}
    </TransitionGroup>

    <TransitionGroup className="fpga-mask-anchor">
      { status === BOARD_STATUS.DISCONNECTED && (
        <CSSTransition
          timeout={500}
          classNames="fade"
        >
          <div className="fpga-mask" onClick={doConnect}>
            <div className="fpga-mask-hint">
              FPGA disconnected
            </div>

            <Icon>settings_ethernet</Icon>

            <div className="fpga-mask-hint">
              click to connect
            </div>
          </div>
        </CSSTransition>
      )}

      { status === BOARD_STATUS.PROGRAMMING && (
        <CSSTransition
          timeout={500}
          classNames="fade"
        >
          <div className="fpga-mask">
            <div className="loading" />
          </div>
        </CSSTransition>
      )}
    </TransitionGroup>
  </div>
});
