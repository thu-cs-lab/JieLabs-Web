import React, { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';
import cn from 'classnames';

import Input from '../comps/Input';
import Icon from '../comps/Icon';

import Monaco from 'react-monaco-editor';
import Sandbox from '../sandbox';

export default React.memo(() => {
  return <main className="workspace">
    <div className="right">
      <Sandbox />
    </div>
    <div className="toolbar">
      <button className="primary">
        <Icon>play_arrow</Icon>
      </button>

      <button>
        <Icon>help_outline</Icon>
      </button>
    </div>
    <div className="left">
      <Monaco
        options={{
          theme: 'vs-dark',
          language: 'vhdl',
        }}
      />
    </div>
  </main>;
});
