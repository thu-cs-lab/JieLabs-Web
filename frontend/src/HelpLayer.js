import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import cn from 'classnames';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import Icon from './comps/Icon';
import { unstepHelp, stepHelp, endHelp } from './store/actions';

const STEPS = [
  {
    backdrop: true,
    done: () => true,
    renderer: () => (
      <div className="help-welcome">
        <div className="hint">Welcome to</div>
        JieLabs
      </div>
    )
  }
];

function useStep(step) {
  const state = useSelector(state => state);
  const dispatch = useDispatch();

  const config = STEPS[step];
  const done = config ? config.done(step) : false;

  const prev = useMemo(() => step === 0 ? null : () => dispatch(unstepHelp()), [step])
  const next = useMemo(() => {
    if(!done) return null;
    if(step === STEPS.length - 1) return () => dispatch(endHelp());
    return () => dispatch(stepHelp());
  }, [step]);

  return {
    prev,
    next,

    backdrop: config ? config.backdrop : false,
    renderer: config ? config.renderer : () => {},
  };
}

export default React.memo(() => {
  const dispatch = useDispatch();
  const step = useSelector(state => state.help);

  const { prev, next, renderer, backdrop } = useStep(step);

  const open = step !== null;

  const exit = useCallback(() => dispatch(endHelp()), []);

  const [hidden, setHidden] = useState(false);
  // Whenever step changes, reset hidden
  useEffect(() => {
    setHidden(false);
  }, [step])

  const toggleHidden = useCallback(() => {
    setHidden(!hidden);
  }, [hidden]);

  return <div className={cn("help", { 'help-open': open })}>
    <div className={cn("help-backdrop", { 'help-backdrop-shown': open && backdrop && !hidden })}></div>

    <div className="help-controller-cont">
      <div className="help-controller">
        <Icon className={cn("help-controller-action", { 'help-controller-action-disabled': !prev})} onClick={prev}>skip_previous</Icon>
        <Icon className={cn("help-controller-action", { 'help-controller-action-disabled': !next })} onClick={next}>skip_next</Icon>
        <Icon className="help-controller-action" onClick={toggleHidden}>{ hidden ? 'tab' : 'tab_unselected' }</Icon>
        <Icon className="help-controller-action">settings_backup_restore</Icon>
        <Icon className="help-controller-action" onClick={exit}>stop</Icon>
      </div>
    </div>

    <TransitionGroup>
      <CSSTransition
        timeout={500}
        classNames="fade"
        key={step}
      >
        <div>
          { renderer() }
        </div>
      </CSSTransition>
    </TransitionGroup>
  </div>
});
