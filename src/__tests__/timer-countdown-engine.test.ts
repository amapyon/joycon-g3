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
            getDisplayValue: () => number;
            getStatus: () => { isCounting: boolean; isPaused: boolean };
            canPause: () => boolean;
            canResume: () => boolean;
            decidePauseToggle: () => 'pause' | 'resume' | 'none';
            stop: () => boolean;
            start: (duration: number) => number;
            pause: () => boolean;
            resume: () => boolean;
            tick: () => { remaining: number; shouldStop: boolean } | null;
            addMinute: () => { nextRemaining: number; nextInitial: number };
            setInitialValue: (value: number) => number;
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

    it('トグル判定が状態に応じて切り替わる', (): void => {
        const engine = new CountdownEngine({ initialValue: 10 });

        expect(engine.decidePauseToggle()).toBe('none');
        engine.start(10);
        expect(engine.decidePauseToggle()).toBe('pause');
        engine.pause();
        expect(engine.decidePauseToggle()).toBe('resume');
    });

    it('表示値が実行状態に応じて切り替わる', (): void => {
        const engine = new CountdownEngine({ initialValue: 20 });

        expect(engine.getDisplayValue()).toBe(20);
        engine.start(20);
        engine.tick();
        expect(engine.getDisplayValue()).toBe(19);
    });

    it('stopが状態を終了させて判定を返す', (): void => {
        const engine = new CountdownEngine({ initialValue: 5 });

        expect(engine.stop()).toBe(false);
        engine.start(5);
        expect(engine.stop()).toBe(true);
        expect(engine.getStatus()).toEqual({ isCounting: false, isPaused: false });
    });

    it('setInitialValueは停止中に残り秒数も更新する', (): void => {
        const engine = new CountdownEngine({ initialValue: 30 });

        engine.setInitialValue(40);
        expect(engine.getCurrentInitialValue()).toBe(40);
        expect(engine.getCountdownValue()).toBe(40);

        engine.start(20);
        engine.setInitialValue(50);
        expect(engine.getCurrentInitialValue()).toBe(50);
        expect(engine.getCountdownValue()).toBe(20);
    });

    it('canPauseとcanResumeが状態を反映する', (): void => {
        const engine = new CountdownEngine({ initialValue: 10 });

        expect(engine.canPause()).toBe(false);
        expect(engine.canResume()).toBe(false);

        engine.start(10);
        expect(engine.canPause()).toBe(true);
        expect(engine.canResume()).toBe(false);

        engine.pause();
        expect(engine.canPause()).toBe(false);
        expect(engine.canResume()).toBe(true);
    });
});
