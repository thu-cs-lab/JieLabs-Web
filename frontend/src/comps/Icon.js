import React from 'react';
import cn from 'classnames';

export default React.memo(({ children, className, ...rest }) => <i className={cn("material-icons", className)} {...rest}>{ children }</i>);
