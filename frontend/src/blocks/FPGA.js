import React, { useState, useCallback } from 'react';
import cn from 'classnames';
import { List } from 'immutable';

import { Connector, SIGNAL } from './index.js';

function getRow(index) {
    if (index < 15) {
        return 4 - (index % 3);
    } else {
        return 1;
    }
}

function getCol(index) {
    if (index < 15) {
        return index / 3 + 1;
    } else {
        return 5;
    }
}

function getLabel(index) {
    if (index < 8) {
        return index + 1;
    } else {
        return index + 6;
    }
}

export default function FPGA(rest) {
    const [io, setIO] = useState(List(Array(16).fill(SIGNAL.X)));
    const [clock, setClock] = useState(10_000_000); // 10M
    const [reset, setReset] = useState(SIGNAL.L);

    return <div className="block fpga" {...rest}>
        {
            io.map((s, idx) => <div key={idx} className={cn(`row${getRow(idx)}`, `col${getCol(idx)}`)}>
                {getLabel(idx)}
                <Connector master={false} onChange={v => {
                    setIO(io.set(idx, v))
                }}></Connector>
            </div>)
        }
        <div className="reset">
            RST
            <Connector master={false} onChange={v => {
                setReset(v)
            }}></Connector>
        </div>
        <div className="clock">
            CLK
            <Connector master={false} onChange={v => {
                setClock(v)
            }}></Connector>
        </div>
    </div>
}
