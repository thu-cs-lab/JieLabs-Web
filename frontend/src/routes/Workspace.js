import React, { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';
import cn from 'classnames';

import Input from '../comps/Input';
import Icon from '../comps/Icon';

import Monaco from 'react-monaco-editor';

export default React.memo(() => {
  return <main>
    <Monaco
      options={{
        theme: 'vs-dark',
      }}
    />
  </main>;
});
