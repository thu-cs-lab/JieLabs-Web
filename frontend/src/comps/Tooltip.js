import React from 'react';
import cn from 'classnames';

export default React.memo(({ tooltip, children, className, gap, ...rest }) => {
  return <div className="tooltip-container" {...rest}>
    <div className="tooltip-hover">
      { children }
    </div>
    <div className={cn("tooltip", { "tooltip-disabled": !tooltip, 'tooltip-gap': gap })}>{ tooltip }</div>
  </div>
});
