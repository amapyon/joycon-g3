export {};
// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const timerMainLogic = require('../renderer/main/timer-logic') as {
    formatPresetLabel: (seconds: number) => string;
    formatTimeForDisplay: (seconds: number) => string;
    normalizeSoundPlayDelay: (input: number, defaultDelay: number, min: number, max: number) => number;
    parseCountdownInitialValue: (rawValue: string, min: number, max: number) => number | null;
    buildMediaAbsolutePath: (basePath: string, filename: string) => string;
    toFileUrl: (absolutePath: string) => string;
};

describe('メインタイマーロジック', (): void => {
    it('プリセットラベルを秒と分で整形する', (): void => {
        expect(timerMainLogic.formatPresetLabel(45)).toBe('45s');
        expect(timerMainLogic.formatPresetLabel(120)).toBe('2m');
        expect(timerMainLogic.formatPresetLabel(125)).toBe('2m5s');
    });

    it('表示用時刻をM:SS形式に整形する', (): void => {
        expect(timerMainLogic.formatTimeForDisplay(0)).toBe('0:00');
        expect(timerMainLogic.formatTimeForDisplay(61)).toBe('1:01');
    });

    it('サウンド遅延を範囲内に正規化する', (): void => {
        expect(timerMainLogic.normalizeSoundPlayDelay(Number.NaN, 200, 0, 5000)).toBe(200);
        expect(timerMainLogic.normalizeSoundPlayDelay(-10, 200, 0, 5000)).toBe(0);
        expect(timerMainLogic.normalizeSoundPlayDelay(9999, 200, 0, 5000)).toBe(5000);
    });

    it('カウントダウン初期値を検証して返す', (): void => {
        expect(timerMainLogic.parseCountdownInitialValue('120', 1, 3600)).toBe(120);
        expect(timerMainLogic.parseCountdownInitialValue('0', 1, 3600)).toBeNull();
        expect(timerMainLogic.parseCountdownInitialValue('abc', 1, 3600)).toBeNull();
    });

    it('メディア絶対パスを正規化して作成する', (): void => {
        expect(timerMainLogic.buildMediaAbsolutePath('C:\\\\media', 'a.mp3')).toBe('C:/media/a.mp3');
        expect(timerMainLogic.buildMediaAbsolutePath('C:/media', '')).toBe('');
    });

    it('file URL を作成する', (): void => {
        expect(timerMainLogic.toFileUrl('C:/media/a.mp3')).toBe('file://C:/media/a.mp3');
        expect(timerMainLogic.toFileUrl('file://C:/media/a.mp3')).toBe('file://C:/media/a.mp3');
        expect(timerMainLogic.toFileUrl('')).toBe('');
    });
});
