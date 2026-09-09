/**
 * Manages level definitions, math gates layouts, and stage progression
 */
export class LevelManager {
    static definitions = [
        [
            200,
            [
                ["+10", "+30", "+20"],
                ["+15", "+5", "+0"],
                ["+40", "+45", "+35"],
                ["+10", "+100", "+1"],
            ],
        ],
        [
            100,
            [
                ["+20", "-3", "-2"],
                ["-15", "+10", "-0"],
                ["-5", "-7", "-10"],
                ["+5", "-100", "-1"],
            ],
        ],
        [
            1000,
            [
                ["*1", "*2", "*3"],
                ["*2", "*1", "*4"],
                ["*5", "*3", "*2"],
                ["*1", "*5", "*2"],
            ],
        ],
        [
            200,
            [
                ["*2", "/2", "/3"],
                ["/2", "/3", "*1"],
                ["/3", "/2", "/1"],
                ["/2", "*2", "/3"],
            ],
        ],
        [
            200,
            [
                ["*2", "-50", "/4"],
                ["/2", "/6", "-5"],
                ["+50", "*2", "-50"],
                ["+10", "-100", "/4"],
            ],
        ],
        [
            1000,
            [
                ["+10", "*2", "-10"],
                ["/2", "*1", "+50"],
                ["+100", "*3", "-50"],
                ["-100", "/2", "+200"],
                ["*2", "+150", "*0"],
            ],
        ],
        [
            2000,
            [
                ["+50", "+25", "*2"],
                ["*2", "+100", "+10"],
                ["*3", "+300", "+50"],
                ["*2", "+500", "*3"],
                ["*2", "+1000", "+500"],
                ["/2", "*1", "-100"],
                ["*2", "+2000", "*0"],
            ],
        ],
        [
            2500,
            [
                ["+100", "*2", "+50"],
                ["*3", "+200", "/2"],
                ["*2", "+500", "-100"],
                ["*3", "+1000", "/3"],
                ["+1500", "*2", "-200"],
                ["*3", "+2000", "*0"],
            ],
        ],
    ];

    static parseToken(token) {
        const symbol = token[0];
        const value = parseFloat(token.slice(1));
        const typeMap = { "+": "add", "-": "sub", "*": "mul", "/": "div" };

        return {
            type: typeMap[symbol] || "add",
            value
        };
    }

    static getLevelCount() {
        return this.definitions.length;
    }

    static getTarget(index) {
        if (index < 0 || index >= this.definitions.length) {
            return 100;
        }

        return this.definitions[index][0];
    }

    static getStageRows(index) {
        if (index < 0 || index >= this.definitions.length) {
            return [];
        }

        const rowsData = this.definitions[index][1];

        return rowsData.map((rowTokens, rowIndex) => {
            const distance = 120 + rowIndex * 140;
            const options = rowTokens.map((token, lane) => ({
                ...this.parseToken(token),
                lane,
            }));

            return {
                distance,
                options,
            };
        });
    }

    static getFinishDistance(index) {
        const rows = this.getStageRows(index);

        if (!rows.length) {
            return 200;
        }

        return rows[rows.length - 1].distance + 100;
    }
}