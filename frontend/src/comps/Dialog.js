import React, { useCallback } from 'react';
import cn from 'classnames';

import { CSSTransition, TransitionGroup } from 'react-transition-group';

export default React.memo(({ open, onClose, className, children, render, blocker, ...rest }) => {
  const weakBlocker = useCallback(e => e.stopPropagation());

  if(!open) return <TransitionGroup />;

  const inner = render ? render() : children;

  return (
    <TransitionGroup>
      <CSSTransition
        timeout={500}
        classNames="fade"
      >
        <div className="backdrop centering" onMouseDown={onClose}>
          <div className={cn("dialog", className)} onMouseDown={blocker || weakBlocker} {...rest}>
            { inner }
          </div>
        </div>
      </CSSTransition>
    </TransitionGroup>
  );
});
