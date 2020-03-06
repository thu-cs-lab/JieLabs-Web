import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import cn from 'classnames';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import Icon from './comps/Icon';
import { unstepHelp, stepHelp, endHelp } from './store/actions';

const STEPS = [
  {
    done: () => true,
    renderer: () => (
      <div className="help-welcome">
        <div className="help-welcome-inner">
          <div className="hint">Welcome to</div>
          <div className="brand"><strong>Jie</strong>Labs</div>
          <div className="help-welcome-desc">
            <p>
              欢迎来到<del>杰哥的掌握</del>数电在线实验平台。这是你首次使用 JieLabs，因此我们为你准备了一个交互式的指南，希望能帮助你尽快熟悉平台的使用方法。
            </p>
            <p>
              指南的控制面板在页面右侧。你可以使用这些按钮来控制指南的进行。
            </p>

            <div className="help-welcome-icons">
              <div className="help-welcome-icon"><Icon>skip_previous</Icon> 上一步</div>
              <div className="sep">/</div>
              <div className="help-welcome-icon"><Icon>skip_next</Icon> 下一步</div>
              <div className="sep">/</div>
              <div className="help-welcome-icon"><Icon>tab_unselected</Icon> 暂时隐藏</div>
              <div className="sep">/</div>
              <div className="help-welcome-icon"><Icon>settings_backup_restore</Icon> 重置当前步骤</div>
              <div className="sep">/</div>
              <div className="help-welcome-icon"><Icon>stop</Icon> 结束指南</div>
            </div>
          </div>
        </div>
      </div>
    )
  }, {
    done: () => true,
    renderer: () => (
      <div className="help-layout">
        <div className="help-layout-base">
          <div className="help-layout-half">
            <div className="help-layout-box">
              <strong>沙盒</strong>
              你可以在这里增删、移动模块，修改连线，修改按钮、开关等输入部件的状态，并得到反馈。
            </div>
          </div>
          <div className="help-layout-half">
            <div className="help-layout-box">
              <strong>编辑器</strong>
              你可以在这里修改 RTL 代码，修改引脚映射等综合设定，并可以实时得到语法检查报告。
            </div>
          </div>
        </div>
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
  const reset = useMemo(() => {
    if(!config?.reset) return null;
    return () => config.reset(state, dispatch);
  }, [step]);

  // Reset on step changes
  useEffect(() => {
    if(reset) reset();
  }, [reset]);

  return {
    prev,
    next,

    reset,
    renderer: config ? config.renderer : () => {},
  };
}

export default React.memo(() => {
  const dispatch = useDispatch();
  const step = useSelector(state => state.help);

  const { prev, next, reset, renderer } = useStep(step);

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
    <div className={cn("help-backdrop", { 'help-backdrop-shown': open && !hidden })}></div>

    <div className="help-controller-cont">
      <div className="help-controller">
        <Icon className={cn("help-controller-action", { 'help-controller-action-disabled': !prev})} onClick={prev}>skip_previous</Icon>
        <Icon className={cn("help-controller-action", { 'help-controller-action-disabled': !next })} onClick={next}>skip_next</Icon>
        <Icon className="help-controller-action" onClick={toggleHidden}>{ hidden ? 'tab' : 'tab_unselected' }</Icon>
        <Icon className={cn("help-controller-action", { 'help-controller-action-disabled': !reset })} onClick={reset}>settings_backup_restore</Icon>
        <Icon className="help-controller-action" onClick={exit}>stop</Icon>
      </div>
    </div>

    <TransitionGroup>
      <CSSTransition
        timeout={500}
        classNames="fade"
        key={step}
      >
        <div className={cn("help-content", { 'help-content-hidden': hidden })}>
          { renderer() }
        </div>
      </CSSTransition>
    </TransitionGroup>
  </div>
});
