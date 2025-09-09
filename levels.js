// levels.js
// Define os níveis do jogo

export const levels = [
    // Level 1
    [
        { lane: 0, y: 0,     type: 'add',    value: 10   },
        { lane: 1, y: 0,     type: 'sub',    value: 5    },
        { lane: 2, y: 0,     type: 'mul',    value: 2    },

        { lane: 0, y: -400,  type: 'mul',    value: 2    },
        { lane: 1, y: -400,  type: 'div',    value: 4    },
        { lane: 2, y: -400,  type: 'sub',    value: 5    },

        { lane: 0, y: -800,  type: 'add',    value: 10   },
        { lane: 1, y: -800,  type: 'mul',    value: 2    },
        { lane: 2, y: -800,  type: 'sub',    value: 5    },

        { lane: 0, y: -1200, type: 'add',    value: 10   },
        { lane: 1, y: -1200, type: 'mul',    value: 2    },
        { lane: 2, y: -1200, type: 'sub',    value: 5    },

        { lane: 1, y: -1400, type: 'finish', value: 800  }
    ],
    // Level 2
    [
        { lane: 0, y: 0,     type: 'mul',    value: 2    },
        { lane: 1, y: 0,     type: 'sub',    value: 50   },
        { lane: 2, y: 0,     type: 'div',    value: 4    },

        { lane: 0, y: -400,  type: 'div',    value: 2    },
        { lane: 1, y: -400,  type: 'div',    value: 6    },
        { lane: 2, y: -400,  type: 'sub',    value: 5    },

        { lane: 0, y: -800,  type: 'add',    value: 50   },
        { lane: 1, y: -800,  type: 'mul',    value: 2    },
        { lane: 2, y: -800,  type: 'sub',    value: 50   },

        { lane: 0, y: -1200, type: 'add',    value: 10   },
        { lane: 1, y: -1200, type: 'sub',    value: 100  },
        { lane: 2, y: -1200, type: 'div',    value: 4    },

        { lane: 1, y: -1400, type: 'finish', value: 200  }
    ],
    // Level 3
    [
        { lane: 0, y: 0,     type: 'add',    value: 10   },
        { lane: 1, y: 0,     type: 'mul',    value: 2    },
        { lane: 2, y: 0,     type: 'sub',    value: 10   },

        { lane: 0, y: -400,  type: 'div',    value: 2    },
        { lane: 1, y: -400,  type: 'mul',    value: 1    },
        { lane: 2, y: -400,  type: 'add',    value: 50   },

        { lane: 0, y: -800,  type: 'add',    value: 100  },
        { lane: 1, y: -800,  type: 'mul',    value: 3    },
        { lane: 2, y: -800,  type: 'sub',    value: 50   },

        { lane: 0, y: -1200, type: 'sub',    value: 100  },
        { lane: 1, y: -1200, type: 'div',    value: 2    },
        { lane: 2, y: -1200, type: 'add',    value: 200  },

        { lane: 0, y: -1600, type: 'mul',    value: 2    },
        { lane: 1, y: -1600, type: 'add',    value: 150  },
        { lane: 2, y: -1600, type: 'mul',    value: 0    },

        { lane: 1, y: -1800, type: 'finish', value: 1000 }
    ],
    // Level 4
    [
        { lane: 0, y: 0,     type: 'mul',    value: 4    },
        { lane: 1, y: 0,     type: 'div',    value: 2    },
        { lane: 2, y: 0,     type: 'add',    value: 20   },

        { lane: 0, y: -400,  type: 'sub',    value: 200  },
        { lane: 1, y: -400,  type: 'add',    value: 10   },
        { lane: 2, y: -400,  type: 'add',    value: 30   },

        { lane: 0, y: -800,  type: 'add',    value: 100  },
        { lane: 1, y: -800,  type: 'add',    value: 110  },
        { lane: 2, y: -800,  type: 'add',    value: 90   },

        { lane: 0, y: -1200, type: 'div',    value: 2    },
        { lane: 1, y: -1200, type: 'div',    value: 1    },
        { lane: 2, y: -1200, type: 'mul',    value: 2    },

        { lane: 0, y: -1600, type: 'mul',    value: 3    },
        { lane: 1, y: -1600, type: 'add',    value: 10   },
        { lane: 2, y: -1600, type: 'add',    value: 50   },

        { lane: 1, y: -1800, type: 'finish', value: 2000 }
    ],
    // Level 5
    [
        { lane: 0, y: 0,     type: 'add',    value: 30   },
        { lane: 1, y: 0,     type: 'div',    value: 2    },
        { lane: 2, y: 0,     type: 'sub',    value: 20   },

        { lane: 0, y: -400,  type: 'div',    value: 3    },
        { lane: 1, y: -400,  type: 'add',    value: 10   },
        { lane: 2, y: -400,  type: 'sub',    value: 350  },

        { lane: 0, y: -800,  type: 'sub',    value: 100  },
        { lane: 1, y: -800,  type: 'div',    value: 1    },
        { lane: 2, y: -800,  type: 'sub',    value: 90   },

        { lane: 0, y: -1200, type: 'mul',    value: 1    },
        { lane: 1, y: -1200, type: 'div',    value: 1    },
        { lane: 2, y: -1200, type: 'sub',    value: 0    },

        { lane: 0, y: -1600, type: 'mul',    value: 3    },
        { lane: 1, y: -1600, type: 'div',    value: 2   },
        { lane: 2, y: -1600, type: 'add',    value: 100   },

        { lane: 1, y: -1800, type: 'finish', value: 200 }
    ],
    // Level 6 (Gerado proceduralmente)
    Array.from({length: 1000}, (_, i) => {
        const types = ['add', 'sub', 'mul', 'div'];

        return [0, 1, 2].map(lane => {
            const y = -i * 400 - 100;
            const type = types[Math.floor(Math.random() * types.length)];
            let value = 10;

            if (type === 'add')
                value = Math.floor(Math.random() * 20 + 5);

            if (type === 'sub')
                value = Math.floor(Math.random() * 15 + 5);

            if (type === 'mul')
                value = Math.floor(Math.random() * 3 + 1);

            if (type === 'div')
                value = Math.floor(Math.random() * 10 + 1);

            return { lane, y, type, value };
        });
    }).flat(),
];
