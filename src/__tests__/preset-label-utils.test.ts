// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const timerPresetLabel = require('../renderer/preset-label-utils') as {
    formatTimerPresetLabel: (seconds: number) => string;
};

describe('プリセットラベルユーティリティ', (): void => {
    it('秒数をプリセット表示ラベルに整形する', (): void => {
        expect(timerPresetLabel.formatTimerPresetLabel(45)).toBe('45s');
        expect(timerPresetLabel.formatTimerPresetLabel(120)).toBe('2m');
        expect(timerPresetLabel.formatTimerPresetLabel(125)).toBe('2m5s');
    });
});
