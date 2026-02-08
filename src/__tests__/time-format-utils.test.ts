// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const timerTimeFormat = require('../renderer/time-format-utils') as {
    formatMinutesSeconds: (seconds: number) => string;
};

describe('時刻整形ユーティリティ', (): void => {
    it('秒数をM:SS形式に整形する', (): void => {
        expect(timerTimeFormat.formatMinutesSeconds(0)).toBe('0:00');
        expect(timerTimeFormat.formatMinutesSeconds(61)).toBe('1:01');
        expect(timerTimeFormat.formatMinutesSeconds(3599)).toBe('59:59');
    });
});
