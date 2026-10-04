import { appendRuntimeTrace, readRuntimeTrace, setRuntimeTraceEnabled } from '../main/pointer-runtime-trace';

describe('ポインターの実行時測定', (): void => {
    beforeEach((): void => { setRuntimeTraceEnabled(false); });
    afterEach((): void => { setRuntimeTraceEnabled(false); });

    it('無効中は測定を保存しない', (): void => {
        appendRuntimeTrace({ kind: 'device-scan', timestampMs: 1 });
        expect(readRuntimeTrace('cursorRight')).toEqual([]);
    });

    it('共通の測定は両方へ送りボタンの測定は対象だけに一度送る', (): void => {
        setRuntimeTraceEnabled(true);
        const scan = { kind: 'device-scan' as const, timestampMs: 1 };
        const button = { kind: 'button' as const, timestampMs: 2, id: 'cursorRight' as const, pressed: false };
        appendRuntimeTrace(scan);
        appendRuntimeTrace(button);
        expect(readRuntimeTrace('cursorLeft')).toEqual([scan]);
        expect(readRuntimeTrace('cursorRight')).toEqual([scan, button]);
        expect(readRuntimeTrace('cursorRight')).toEqual([]);
        expect(readRuntimeTrace('cursorLeft')).toEqual([]);
    });

    it('受信停止中でも保持件数を256件以内に制限する', (): void => {
        setRuntimeTraceEnabled(true);
        for (let index = 0; index < 300; index++) {
            appendRuntimeTrace({ kind: 'render', timestampMs: index, id: 'cursorRight' });
        }
        const events = readRuntimeTrace('cursorRight');
        expect(events).toHaveLength(256);
        expect(events[0].timestampMs).toBe(44);
    });

    it('検証モードの再開時に前回の測定を持ち越さない', (): void => {
        setRuntimeTraceEnabled(true);
        appendRuntimeTrace({ kind: 'device-scan', timestampMs: 1 });
        setRuntimeTraceEnabled(false);
        setRuntimeTraceEnabled(true);
        expect(readRuntimeTrace('cursorRight')).toEqual([]);
    });
});
