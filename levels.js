// levels.js
// Define os níveis do jogo

export const levels = [
    // Level 1
    [
        { lane: 0, y: 0,     type: 'add',    value: 10  },
        { lane: 1, y: 0,     type: 'sub',    value: 5   },
        { lane: 2, y: 0,     type: 'mul',    value: 2   },
        { lane: 0, y: -400,  type: 'mul',    value: 2   },
        { lane: 1, y: -400,  type: 'div',    value: 4   },
        { lane: 2, y: -400,  type: 'sub',    value: 5   },
        { lane: 0, y: -800,  type: 'add',    value: 10  },
        { lane: 1, y: -800,  type: 'mul',    value: 2   },
        { lane: 2, y: -800,  type: 'sub',    value: 5   },
        { lane: 0, y: -1200, type: 'add',    value: 10  },
        { lane: 1, y: -1200, type: 'mul',    value: 2   },
        { lane: 2, y: -1200, type: 'sub',    value: 5   },
        { lane: 1, y: -1300, type: 'finish', value: 800 }
    ],
    // Level 2
    [
        { lane: 0, y: 0,     type: 'mul',    value: 2   },
        { lane: 1, y: 0,     type: 'sub',    value: 50  },
        { lane: 2, y: 0,     type: 'div',    value: 4   },
        { lane: 0, y: -400,  type: 'div',    value: 2   },
        { lane: 1, y: -400,  type: 'div',    value: 6   },
        { lane: 2, y: -400,  type: 'sub',    value: 5   },
        { lane: 0, y: -800,  type: 'add',    value: 50  },
        { lane: 1, y: -800,  type: 'mul',    value: 2   },
        { lane: 2, y: -800,  type: 'sub',    value: 50  },
        { lane: 0, y: -1200, type: 'add',    value: 10  },
        { lane: 1, y: -1200, type: 'sub',    value: 100 },
        { lane: 2, y: -1200, type: 'div',    value: 4   },
        { lane: 1, y: -1300, type: 'finish', value: 200 }
    ],
    // Level 3 (procedural)
    Array.from({length: 100},(_,i)=>{
        const lane = Math.floor(Math.random() * 3);
        const y = -i * 200 - 100;
        const types = ['add', 'sub', 'mul', 'div'];
        const type = types[Math.floor(Math.random() * types.length)];
        let value = 10;

        if (type === 'add')
            value = Math.floor(Math.random() * 20 + 5);

        if (type === 'sub')
            value = Math.floor(Math.random() * 15 + 5);

        if (type === 'mul')
            value = [2, 3][Math.floor(Math.random() * 2)];

        if (type === 'div')
            value = 2;

        return { lane, y, type, value };
    })
];
