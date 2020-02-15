import React, { useState, useCallback } from 'react';

import Icon from '../comps/Icon';

import Monaco from 'react-monaco-editor';
import Sandbox from '../Sandbox';

export default React.memo(() => {
  const [code, setCode] = useState('');
  const doUpload = useCallback(async () => {
  }, []);

  return <main className="workspace">
    <div className="left">
      <Sandbox />
    </div>
    <div className="toolbar">
      <button className="primary" onClick={doUpload}>
        <Icon>play_arrow</Icon>
      </button>

      <button>
        <Icon>help_outline</Icon>
      </button>
    </div>
    <div className="right">
      <Monaco
        options={{
          theme: 'vs-dark',
          language: 'vhdl',
        }}
        onChange={setCode}
      />
    </div>
  </main>;
});
