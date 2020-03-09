import React, { useMemo } from 'react';
import cn from 'classnames';

function getClass(row, type) {
  if(type === 'constraints') {
    const isComment = row.match(/^\s*#/);
    if(isComment) return 'highlighter-comment';
    else return null;
  } else {
    if(row.match(/^\s*Error/)) return 'highlighter-error';
    if(row.match(/^\s*Warning/)) return 'highlighter-warning';
    return null;
  }
}

export default React.memo(({ className, source, type }) => {
  const rows = useMemo(() => {
    const lines = source.split('\n');

    return lines.map((line, idx) => ({
      line: idx === lines.length - 1 ? line : line + '\n',
      class: getClass(line, type),
    }));
  }, [source, type]);

  return <pre className={cn("highlighter", className)}>
    { rows.map((e, idx) => <code key={idx} className={e.class}>{e.line}</code>) }
  </pre>
});
