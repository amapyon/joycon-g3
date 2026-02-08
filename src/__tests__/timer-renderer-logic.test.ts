export {};
// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const timerRendererLogic = require('../renderer/timer/timer-renderer-logic') as {
    normalizeNotifications: (configs: Array<{
        time: number;
        filename: string;
        absolutePath: string;
        rumble?: boolean;
    }>) => Array<{
        time: number;
        filename: string;
        absolutePath: string;
        rumble?: boolean;
    }>;
    resolveWheelAction: (deltaY: number, shiftKey: boolean) => { kind: 'opacity' | 'fontSize'; delta: number };
    resolveTickAction: (
        tickResult: { remaining: number; shouldStop: boolean } | null,
        currentInitialValue: number
    ) => { kind: 'none' | 'continue' | 'finish'; displaySeconds?: number; sendSeconds?: number };
    shouldShowSetupMenu: (mode: 'timer' | 'setup') => boolean;
};

describe('タイマーレンダラーロジック', (): void => {
    it('通知設定のrumble値を真偽値に正規化する', (): void => {
        const normalized = timerRendererLogic.normalizeNotifications([
            { time: 30, filename: 'a.mp3', absolutePath: '/a.mp3', rumble: 1 as unknown as boolean },
            { time: 10, filename: 'b.mp3', absolutePath: '/b.mp3' },
        ]);

        expect(normalized).toEqual([
            { time: 30, filename: 'a.mp3', absolutePath: '/a.mp3', rumble: true },
            { time: 10, filename: 'b.mp3', absolutePath: '/b.mp3', rumble: false },
        ]);
    });

    it('Shift押下ホイール時は透明度変更を返す', (): void => {
        expect(timerRendererLogic.resolveWheelAction(-1, true)).toEqual({ kind: 'opacity', delta: 0.05 });
        expect(timerRendererLogic.resolveWheelAction(1, true)).toEqual({ kind: 'opacity', delta: -0.05 });
    });

    it('通常ホイール時はフォントサイズ変更を返す', (): void => {
        expect(timerRendererLogic.resolveWheelAction(-1, false)).toEqual({ kind: 'fontSize', delta: 5 });
        expect(timerRendererLogic.resolveWheelAction(1, false)).toEqual({ kind: 'fontSize', delta: -5 });
    });

    it('tick結果なしなら更新なしを返す', (): void => {
        expect(timerRendererLogic.resolveTickAction(null, 120)).toEqual({ kind: 'none' });
    });

    it('継続tickなら残り時間表示更新を返す', (): void => {
        expect(timerRendererLogic.resolveTickAction({ remaining: 59, shouldStop: false }, 120)).toEqual({
            kind: 'continue',
            displaySeconds: 59,
            sendSeconds: 59,
        });
    });

    it('停止tickなら初期値表示へ戻す更新を返す', (): void => {
        expect(timerRendererLogic.resolveTickAction({ remaining: 0, shouldStop: true }, 120)).toEqual({
            kind: 'finish',
            displaySeconds: 120,
            sendSeconds: 0,
        });
    });

    it('setupモードのみメニュー表示を有効化する', (): void => {
        expect(timerRendererLogic.shouldShowSetupMenu('setup')).toBe(true);
        expect(timerRendererLogic.shouldShowSetupMenu('timer')).toBe(false);
    });
});
