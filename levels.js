// levels.js
// Define os níveis do jogo

export const levels = [
    // Level 1
    [
        { lane: 0, y: -100, type: 'add', value: 10 },
        { lane: 1, y: -300, type: 'mul', value: 2 },
        { lane: 2, y: -500, type: 'sub', value: 5 },
        { lane: 0, y: -700, type: 'div', value: 2 },
        { lane: 1, y: -900, type: 'add', value: 15 },
        { lane: 2, y: -1100, type: 'mul', value: 3 },
        { lane: 1, y: -1300, type: 'sub', value: 10 },
        { lane: 0, y: -1500, type: 'div', value: 2 },
        { lane: 2, y: -1700, type: 'add', value: 5 },
        { lane: 1, y: -1900, type: 'mul', value: 2 },
        { lane: 0, y: -2100, type: 'sub', value: 5 },
        { lane: 2, y: -2300, type: 'div', value: 2 },
        { lane: 1, y: -2500, type: 'add', value: 20 },
        { lane: 0, y: -2700, type: 'mul', value: 2 },
        { lane: 2, y: -2900, type: 'sub', value: 10 },
        { lane: 1, y: -3100, type: 'finish', value: 100 }
    ],
    // Level 2
    [
        { lane: 0, y: -100, type: 'mul', value: 3 },
        { lane: 1, y: -250, type: 'add', value: 20 },
        { lane: 2, y: -400, type: 'sub', value: 10 },
        { lane: 0, y: -550, type: 'div', value: 2 },
        { lane: 1, y: -700, type: 'mul', value: 2 },
        { lane: 2, y: -850, type: 'add', value: 5 },
        { lane: 1, y: -1000, type: 'finish', value: 100 }
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
