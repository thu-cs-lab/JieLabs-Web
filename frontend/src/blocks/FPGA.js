import React, { useState, useCallback } from 'react';
import cn from 'classnames';
import { List } from 'immutable';

import { Connector, SIGNAL } from './index.js';

export default function FPGA(rest) {
    const [io, setIO] = useState(List(Array(21).fill(SIGNAL.X)));
    const [clock, setClock] = useState(10_000_000); // 10M
    const [reset, setReset] = useState(SIGNAL.L);

    return <div className="block switch4" {...rest}>
        <div className="leds">
            {
                io.map((s, idx) => <div key={idx}>
                    <Connector master={false} onChange={v => {
                        setIO(io.set(idx, v))
                    }}></Connector>
                </div>)
            }
        </div>
        <div className="switches">
            <Connector master={false} onChange={v => {
                setReset(v)
            }}></Connector>
        </div>
    </div>
}
