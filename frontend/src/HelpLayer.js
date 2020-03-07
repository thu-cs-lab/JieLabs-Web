import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import cn from 'classnames';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import Icon from './comps/Icon';
import Tooltip from './comps/Tooltip';
import { BOARD_STATUS, unstepHelp, stepHelp, endHelp, updateCode, updateTop, deleteBlock, pushBlock } from './store/actions';

import { DEFAULT_FIELD } from './config';

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
              指南的<span className="help-hl">控制面板</span>在页面右侧。你可以使用这些按钮来控制指南的进行。
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
              <p>你可以在这里增删、移动<span className="help-hl">模块</span>，修改<span className="help-hl">连线</span>，修改按钮、开关等<span className="help-hl">输入部件的状态</span>，并得到<span className="help-hl">输出部件的反馈</span>。</p>
            </div>
          </div>
          <div className="help-layout-half">
            <div className="help-box">
              <strong>编辑器</strong>
              <p>你可以在这里修改 <span className="help-hl">RTL 代码</span>，修改<span className="help-hl">引脚映射等综合设定</span>，并可以实时得到<span className="help-hl">语法检查报告</span>。</p>
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
          <p>所有的错误都已经被修复了！你可以<span className="help-hl">继续前往指南的下一步</span>了</p>
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
          <p>在右侧的编辑器内已经填入了一些<del>喵喵在键盘上随便打出的</del>代码，但是在<span className="help-hl">第 { dedup.join(', ') } 行</span>出现了一些语法错误。</p>
          <p>鼠标经过语法错误标记的位置时，会显示语法错误的详细信息。请你尝试<span className="help-hl">修复所有的语法错误</span>，修复完成后可以进行下一步。</p>
          <p>如果你一不小心弄丢了太多的代码，记得可以用右侧的按钮进行重置。</p>
        </div>
      );
    }
  }, {
    region: 'editor-only',
    done: state => {
      const rst = state.constraints.signals.get('rst');
      const clk = state.constraints.signals.get('clk');
      const toggle = state.constraints.signals.get('toggle');
      return rst === 1 && clk === 37 && toggle === 0;
    },
    reset: (state, dispatch) => {
      dispatch(updateTop(null));
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
          <p>请你将 <span className="help-hl">top</span> 设置为顶级实体，并将 <span className="help-hl">rst</span>, <span className="help-hl">clk</span> 和 <span className="help-hl">toggle</span> 分别映射到引脚 <span className="help-hl">1</span>, <span className="help-hl">37</span>, <span className="help-hl">0</span> 上。</p>
        </div>
      );
    }
  }, {
    done: (state) => {
      const latestStatus = state.builds.list.get(0)?.status;
      return latestStatus === 'Compilation Success';
    },
    renderer: () => (
      <div className="help-layout">
        <div className="help-layout-toolbar">
          <div className="help-layout-row">
            <Icon>build</Icon>
            <div className="help-layout-desc">点这里<del>发给杰哥优化</del>提交编译</div>
          </div>
        </div>

        <div className="help-layout-build">
          编译状态
        </div>

        <div className="help-box" style={{
          position: 'absolute',
          top: 60*2 + 100,
          left: '50vw',
          transform: 'translateX(-50%)',
        }}>
          <strong>提交编译！</strong>
          <p>当顶级实体及其所有的信号都被映射之后，就可以提交编译了！</p>
          <p>点击中央工具栏中的<span className="help-hl">编译按钮</span>提交之后，编译状态会更新为新提交的状态。等待提交状态从代表进行中的蓝色方块变成代表成功的<span className="help-hl">绿色对钩</span>之后，就可以进入下一步了。</p>
          <p>你可以通过右侧的控制区暂时隐藏指南页面。</p>
          <hr />
          <p>在进入下一步前，可以试试将鼠标放置在编译状态上，JieLabs 将会展开一个列表，显示你的所有过往提交。在这个列表中你也可以上传过往提交生成的 Bitstream，以及查看编译信息和代码。</p>
        </div>
      </div>
    )
  }, {
    region: 'sandbox-only',
    done: state => {
      if(state.board.status !== BOARD_STATUS.CONNECTED) return false;
      if(state.activeBuild === null) return false;
      return true;
    },
    renderer: () => {
      return (
        <div className="help-box" style={{
          width: 'calc(50vw - 80px)',
          maxWidth: 'unset',
          position: 'fixed',
          top: 40,
          right: 40,
        }}>
          <strong>连接 / 烧写 FPGA</strong>
          <p>Bitstream 已经就绪，现在可以将注意放在沙盒上了。</p>
          <p>作为编程工作的收尾，我们可以通过以下流程将 Bitstream 烧写到 FPGA 上：</p>
          <ul>
            <li>如果 FPGA 模块显示还没有分配 FPGA，可以通过<span className="help-hl">点击 FPGA 模块</span>进行申请。</li>
            <li>分配完成后，位于编译按钮下方的<span className="help-hl">上传 Bitstream 按钮</span>激活，点击即可开始烧写。</li>
          </ul>
          <p>完成烧写后可以进行下一步。</p>
        </div>
      );
    },
  }, {
    region: 'sandbox-only',
    reset: (state, dispatch) => {
      const size = state.field.size;
      for(let i = 0; i < size; ++i) dispatch(deleteBlock(0));
      for(const spec of DEFAULT_FIELD) dispatch(pushBlock(spec));
    },
    done: state => {
      const field = state.field;
      const hasFPGA = !!field.find(e => e.type === 'FPGA');
      const hasClock = !!field.find(e => e.type === 'Clock');
      const hasSwitch4 = !!field.find(e => e.type === 'Switch4');

      return field.size === 3 && hasFPGA && hasClock && hasSwitch4;
    },
    renderer: () => {
      return (
        <div className="help-box" style={{
          width: 'calc(50vw - 80px)',
          maxWidth: 'unset',
          position: 'fixed',
          top: 40,
          right: 40,
        }}>
          <strong>亮，都可以亮</strong>
          <p>现在 FPGA 内已经烧进我们编写的逻辑了。接下来需要将 FPGA 的引脚和外部模块连接，以便控制、观察 FPGA 的输入输出。</p>
          <p>沙盒内预先安排了一些模块，从左到右，从上到下，分别是</p>
          <ul>
            <li>FPGA 模块</li>
            <li>带译码数码管</li>
            <li>无译码数码管</li>
            <li>LED+开关，上方为 LED，下方为开关</li>
            <li>时钟模块，上方为时钟发生器引脚，下方为两个按钮，可以作为 Reset 或者手动时钟。</li>
          </ul>

          <p>右键沙盒内的任意位置可以添加新模块，既有的模块的删除按钮也可以通过将鼠标放置于模块上展现。请<span className="help-hl">将两个数码管模块删除</span>，我们暂时用不到它们。</p>
        </div>
      );
    },
  }, {
    region: 'sandbox-only',
    done: () => true,
    renderer: () => {
      return (
        <div className="help-box" style={{
          width: 'calc(50vw - 80px)',
          maxWidth: 'unset',
          position: 'fixed',
          top: 40,
          right: 40,
        }}>
          <strong>亮，都可以亮 (续)</strong>
          <p>点击接线柱可以开始连线，在连线的过程中，被连接的接线柱会被显示为蓝色，鼠标经过其他接线柱或者其他线时，将会将其高亮为黄色。点击被高亮为黄色的接线柱或线，可以进行连线。</p>
          <p>尝试将其中<span className="help-hl">一个 LED 连接至 FPGA 0 号引脚</span>，<span className="help-hl">4M 时钟发生器至 37 号引脚</span>，以及<span className="help-hl">一个按钮至 1 号引脚</span>。<span className="help-hl">点击复位按钮</span>，你应该能看到 LED 开始以 1s 为间隔开始闪烁。</p>
          <p>点击蓝色接线柱或者沙盒中任意空地可以取消连线。我们没办法检查这一任务的完成与否，但是这就是指南的最后一步了！</p>
          <p>通过左下角的沙箱工具栏或者 Ctrl-F 快捷键，你可以修改连线颜色，以及在模块和连线层之间切换。在连线层中你可以删除连线，或者断开特定的接线柱。尝试连接其他频率的时钟，或者将输出同时连接到多个 LED 上。当你认为自己对沙箱机制的理解已经够用了的话，可以前往下一步。</p>
          <hr />
          <p>你可能注意到 FPGA 的 37 号引脚和时钟发生器的接线柱颜色和其他接线柱不同。蓝色的接线柱是标记这里的信号和时钟信号有关。对于 FPGA 而言，只有 37 号引脚可以接入高频时钟。连线在以下情况中会失败</p>
          <ul>
            <li>如果时钟发生器连接至除了 FPGA 37 号引脚以外的地方，将会失败</li>
            <li>如果一个接线柱已经通过网络和即将连线的线或者接线柱相连。</li>
          </ul>
        </div>
      );
    },
  }, {
    done: () => true,
    renderer: () => {
      return (
      <div className="help-welcome">
        <div className="help-box">
          <div className="brand"><strong>Jie</strong>Labs</div>
          <p>指南到此结束了！在中央工具栏中有<span className="help-hl">帮助按钮</span>，你可以通过它找到快捷键 Cheatsheet，还能重新启动这一指南。</p>
          <p>祝你在数字电路的海洋中能够一帆风顺，不会翻船！</p>
        </div>
      </div>
    );
    },
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
      'help-backdrop-sandbox-only': region === 'sandbox-only',
    })}>
      <div className="help-backdrop-stripe"></div>
    </div>

    <div className="help-controller-cont">
      <div className="help-controller">
        <Tooltip tooltip="隐藏/显示指南页面">
          <Icon className="help-action" onClick={toggleHidden}>{ hidden ? 'tab' : 'tab_unselected' }</Icon>
        </Tooltip>
        <Tooltip tooltip="上一步">
          <Icon className={cn("help-action", { 'help-action-disabled': !prev})} onClick={prev}>skip_previous</Icon>
        </Tooltip>
        <div className={cn("help-action-primary", {
          'help-action-primary-disabled': !next,
        })}>
          <Tooltip tooltip={next ? "下一步" : "还有条件没有达成哦!"}>
            <Icon className={cn("help-action", {
              'help-action-disabled': !next
            })} onClick={next}>skip_next</Icon>
          </Tooltip>
        </div>
        <Tooltip tooltip="重置当前步骤">
          <Icon className={cn("help-action", { 'help-action-disabled': !reset })} onClick={reset}>settings_backup_restore</Icon>
        </Tooltip>
        <Tooltip tooltip="结束指南">
          <Icon className="help-action" onClick={exit}>stop</Icon>
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
