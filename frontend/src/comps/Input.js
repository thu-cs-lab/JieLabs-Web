import React, { useCallback } from 'react';
import cn from 'classnames';

export default React.memo(({ onChange, label, value, placeholder, className, style, ...rest }) => {
  const cb = useCallback(ev => onChange(ev.target.value), [onChange]);

  return <div className={cn("input", className)} style={style}>
    <div className="input-label">{ label }</div>
    <input placeholder={placeholder} value={value} onChange={onChange ? cb : null} {...rest} />
  </div>;
});
