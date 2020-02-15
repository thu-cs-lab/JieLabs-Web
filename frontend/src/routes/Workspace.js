import React, { useState, useCallback } from 'react';
import { get, post, putS3 } from '../util';

import Icon from '../comps/Icon';

import Monaco from 'react-monaco-editor';
import Sandbox from '../Sandbox';

export default React.memo(() => {
  const [code, setCode] = useState('');
  const doUpload = useCallback(async () => {
    try {
      const data = await get('/api/file/upload');
      const uuid = data.uuid;
      const url = data.url;

      console.log(data);
      // TODO: tar
      await putS3(url, code);
      const result = await post('/api/task/build', {source: uuid});
      console.log(result);
      let id = null;
      id = setInterval(async () => {
        const info = await get(`/api/task/get/${result}`);
        console.log(info);
        if (info.status) {
          clearInterval(id);
        }
      }, 1000);
    } catch(e) {
      console.error(e);
    }
  }, [code]);

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
