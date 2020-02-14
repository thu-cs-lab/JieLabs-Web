import React from 'react';

import { Connector, SIGNAL } from './index.js';

export default function Switch4() {
  return <div className="block">
    <Connector output={SIGNAL.H}></Connector>
  </div>
}
