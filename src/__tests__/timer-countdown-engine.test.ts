export {};
// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const { CountdownEngine } = require('../renderer/timer/countdown-engine') as {
    CountdownEngine: {
        new (options?: {
            initialValue?: number;
            minSeconds?: number;
            maxSeconds?: number;
        }): {
            getCurrentInitialValue: () => number;
            getCountdownValue: () => number;
            getStatus: () => { isCounting: boolean; isPaused: boolean };
            start: (duration: number) => number;
            pause: () => boolean;
            resume: () => boolean;
            tick: () => { remaining: number; shouldStop: boolean } | null;
            addMinute: () => { nextRemaining: number; nextInitial: number };
        };
        formatTime: (seconds: number) => string;
        clampValue: (value: number) => number;
    };
};

describe('カウントダウンエンジン', (): void => {
    it('開始時に初期値と残り時間が同期される', (): void => {
        const engine = new CountdownEngine({ initialValue: 10 });

        const startedValue = engine.start(25);

        expect(startedValue).toBe(25);
        expect(engine.getCountdownValue()).toBe(25);
        expect(engine.getCurrentInitialValue()).toBe(25);
        expect(engine.getStatus()).toEqual({ isCounting: true, isPaused: false });
    });

    it('一時停止と再開で状態が切り替わる', (): void => {
        const engine = new CountdownEngine();

        engine.start(10);
        const paused = engine.pause();
        const pausedStatus = engine.getStatus();

        expect(paused).toBe(true);
        expect(pausedStatus).toEqual({ isCounting: false, isPaused: true });

        const resumed = engine.resume();
        const resumedStatus = engine.getStatus();

        expect(resumed).toBe(true);
        expect(resumedStatus).toEqual({ isCounting: true, isPaused: false });
    });

    it('tickが残り時間と停止判定を返す', (): void => {
        const engine = new CountdownEngine({ initialValue: 2 });

        engine.start(2);

        const first = engine.tick();
        const second = engine.tick();
        const third = engine.tick();

        expect(first).toEqual({ remaining: 1, shouldStop: false });
        expect(second).toEqual({ remaining: 0, shouldStop: false });
        expect(third).toEqual({ remaining: 0, shouldStop: true });
    });

    it('カウント中の+1分は残り時間に反映される', (): void => {
        const engine = new CountdownEngine({ initialValue: 120 });

        engine.start(120);
        const result = engine.addMinute();

        expect(result.nextRemaining).toBe(180);
        expect(result.nextInitial).toBe(120);
    });

    it('停止中の+1分は初期値に反映される', (): void => {
        const engine = new CountdownEngine({ initialValue: 120 });

        const result = engine.addMinute();

        expect(result.nextRemaining).toBe(120);
        expect(result.nextInitial).toBe(180);
    });

    it('formatTimeがM:SS形式で返る', (): void => {
        expect(CountdownEngine.formatTime(61)).toBe('1:01');
        expect(CountdownEngine.formatTime(0)).toBe('0:00');
    });

    it('clampValueが範囲内に丸める', (): void => {
        expect(CountdownEngine.clampValue(0)).toBe(1);
        expect(CountdownEngine.clampValue(3601)).toBe(3600);
    });
});
