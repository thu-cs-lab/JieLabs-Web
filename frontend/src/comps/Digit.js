import React from 'react';
import cn from 'classnames';

import { SIGNAL } from '../blocks';

export default React.memo(({ values, className, ...rest }) => {
  const segs = [];

  for(let i = 0; i< 7; ++i)
    segs.push(<div key={i} className={cn("digit-seg", { 'digit-seg-lit': values.get(i) === SIGNAL.H })}></div>);

  return (
    <div className={cn("digit", className)} {...rest}>
      <div className="digit-inner">
        { segs }
      </div>
    </div>
  );
});
