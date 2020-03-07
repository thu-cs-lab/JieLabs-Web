import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import cn from 'classnames';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import Icon from './comps/Icon';
import Tooltip from './comps/Tooltip';
import { unstepHelp, stepHelp, endHelp, updateCode, assignTop } from './store/actions';

import src from './assets/tutorial.vhdl'; // eslint-disable-line

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
            <div className="help-box">
              <strong>沙盒</strong>
              <p>你可以在这里增删、移动模块，修改连线，修改按钮、开关等输入部件的状态，并得到反馈。</p>
            </div>
          </div>
          <div className="help-layout-half">
            <div className="help-box">
              <strong>编辑器</strong>
              <p>你可以在这里修改 RTL 代码，修改引脚映射等综合设定，并可以实时得到语法检查报告。</p>
            </div>
          </div>
        </div>
      </div>
    )
  }, {
    done: () => true,
    renderer: () => (
      <div className="help-layout">
        <div className="help-layout-toolbar">
          <div className="help-layout-row">
            <Icon>build</Icon>
            <div className="help-layout-desc">提交编译任务</div>
          </div>
          <div className="help-layout-row">
            <Icon>cloud_download</Icon>
            <div className="help-layout-desc">将最近一次编译任务生成的 Bitstream 上传至 FPGA</div>
          </div>
          <div className="help-layout-row">
            <Icon>help_outline</Icon>
            <div className="help-layout-desc">帮助 / 快捷键说明</div>
          </div>
        </div>

        <div className="help-box" style={{
          position: 'absolute',
          top: 60*4 + 100,
          left: '50vw',
          transform: 'translateX(-50%)',
        }}>
          <strong>中央工具栏</strong>
          <p>用于放置非常重要的按钮<del>和我们想不出来放到哪里的按钮</del>。</p>
          <p>灰色的按钮表示当前因为特定条件无法完成的工作，例如如果最近一次编译失败，此时上传 Bitstream 的按钮将会展示为灰色。</p>
          <p>部分禁用按钮在鼠标移过的时候会显示不能点击的原因。</p>
        </div>
      </div>
    )
  }, {
    region: 'editor-only',
    done: state => {
      if(!state.analysis) return false;
      const errorCnt = state.analysis.diagnostics.filter(e => e.severity === 'error').length;
      console.log(errorCnt);
      return errorCnt === 0;
    },
    reset: (state, dispatch) => {
      dispatch(updateCode(src));
    },
    renderer: (state) => {
      const lines = state.analysis ? state.analysis.diagnostics.filter(e => e.severity === 'error').map(e => e.pos.from_line+1) : [];
      const dedup = [];
      const set = new Set();
      for(const l of lines)
        if(!set.has(l)) {
          set.add(l);
          dedup.push(l);
        }

      if(dedup.length === 0) return (
        <div className="help-box" style={{
          width: 'calc(50vw - 80px)',
          maxWidth: 'unset',
          position: 'fixed',
          top: 40,
          left: 40,
        }}>
          <strong>杰哥教你写代码</strong>
          <p>所有的错误都已经被修复了！你可以继续前往指南的下一步了</p>
        </div>
      );

      return (
        <div className="help-box" style={{
          width: 'calc(50vw - 80px)',
          maxWidth: 'unset',
          position: 'fixed',
          top: 40,
          left: 40,
        }}>
          <strong>杰哥教你写代码</strong>
          <p>该康康怎么写代码了！</p>
          <p>在右侧的编辑器内已经填入了一些<del>喵喵在键盘上随便打出的</del>代码，但是在第 { dedup.join(', ') } 行出现了一些语法错误。</p>
          <p>鼠标经过语法错误标记的位置时，会显示语法错误的详细信息。请你尝试修复所有的语法错误，修复完成后可以进行下一步。</p>
          <p>如果你一不小心弄丢了太多的代码，记得可以用右侧的按钮进行重置。</p>
        </div>
      );
    }
  }, {
    done: state => {
      const rst = state.constraints.signals.get('rst');
      const clk = state.constraints.signals.get('clk');
      const toggle = state.constraints.signals.get('toggle');
      return rst === 1 && clk === 37 && toggle === 0;
    },
    reset: (state, dispatch) => {
      dispatch(assignTop(null));
    },
    renderer: (state) => {
      return (
        <div className="help-box" style={{
          width: 'calc(50vw - 80px)',
          maxWidth: 'unset',
          position: 'fixed',
          top: 40,
          left: 40,
        }}>
          <strong>修改综合约束</strong>
          <p>在修改代码的过程中，你可能注意到在 <code>entity top</code> 的上方忽然出现了 Set as top 字样。这是用于修改综合约束的操作。在编辑器中会出现两种这样的操作：</p>
          <ul>
            <li>Set as top: 设置顶级实体，出现在实体声明的上方</li>
            <li>Assign to pin / Assigned to xxx: 设置引脚映射，出现在顶级实体接口中，信号声明的上方</li>
          </ul>
          <p>编辑器会高亮顶级实体和所有映射，如果某一信号未被映射，或对于向量信号而言，未被完全映射，将会以黄色标出。</p>
          <p>请你将 <code>top</code> 设置为顶级实体，并将 rst, clk 和 toggle 分别映射到引脚 1, 37, 0 上。你可以通过右侧的控制区暂时隐藏指南页面。</p>
        </div>
      );
    }
  }
];

function useStep(step) {
  const state = useSelector(state => state);
  const dispatch = useDispatch();

  const config = STEPS[step];
  const done = config ? config.done(state) : false;

  const prev = useMemo(() => step === 0 ? null : () => dispatch(unstepHelp()), [step])
  const next = useMemo(() => {
    if(!done) return null;
    if(step === STEPS.length - 1) return () => dispatch(endHelp());
    return () => dispatch(stepHelp());
  }, [step, done]);
  const reset = useMemo(() => {
    if(!config?.reset) return null;
    return () => config.reset(state, dispatch);
  }, [step]);

  // Reset on step changes
  useEffect(() => {
    if(reset) reset();
  }, [reset]);

  const renderer = useCallback(() => {
    if(!config?.renderer) return null;
    return config.renderer(state);
  }, [config?.renderer, state]);

  return {
    prev,
    next,

    reset,
    region: config ? config.region : null,
    renderer,
  };
}

export default React.memo(() => {
  const dispatch = useDispatch();
  const step = useSelector(state => state.help);

  const { prev, next, reset, renderer, region } = useStep(step);

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
    <div className={cn("help-backdrop", {
      'help-backdrop-shown': open && !hidden,
      'help-backdrop-editor-only': region === 'editor-only',
    })}>
      <div className="help-backdrop-stripe"></div>
    </div>

    <div className="help-controller-cont">
      <div className="help-controller">
        <Tooltip tooltip="上一步">
          <Icon className={cn("help-controller-action", { 'help-controller-action-disabled': !prev})} onClick={prev}>skip_previous</Icon>
        </Tooltip>
        <Tooltip tooltip={next ? "下一步" : "还有条件没有达成哦!"}>
          <Icon className={cn("help-controller-action", { 'help-controller-action-disabled': !next })} onClick={next}>skip_next</Icon>
        </Tooltip>
        <Tooltip tooltip="隐藏/显示指南页面">
          <Icon className="help-controller-action" onClick={toggleHidden}>{ hidden ? 'tab' : 'tab_unselected' }</Icon>
        </Tooltip>
        <Tooltip tooltip="重置当前步骤">
          <Icon className={cn("help-controller-action", { 'help-controller-action-disabled': !reset })} onClick={reset}>settings_backup_restore</Icon>
        </Tooltip>
        <Tooltip tooltip="结束指南">
          <Icon className="help-controller-action" onClick={exit}>stop</Icon>
        </Tooltip>
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
