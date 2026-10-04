import { readFileSync } from 'fs';
import path from 'path';
import { runInNewContext } from 'vm';
import { transpileModule, ScriptTarget } from 'typescript';
import type { PointerMotionDiagnostics } from '../shared/pointer-motion-settings';
import { inspectPointerMotion } from '../main/imu-pointer';

/** 検証画面のフォームとイベントを再現する最小要素。 */
class TestControl {
    value = '';
    textContent = '';
    checked = true;
    disabled = false;
    options = [{ value: 'cursorRight' }, { value: 'cursorLeft' }];
    selectedOptions = [{ text: 'R（右）' }];
    private handlers: Record<string, (() => void)[]> = {};

    /** @param event イベント名 @param handler 登録する処理 */
    addEventListener(event: string, handler: () => void): void {
        (this.handlers[event] ??= []).push(handler);
    }

    /** @param event イベント @returns 常に true */
    dispatchEvent(event: { type: string }): boolean {
        this.handlers[event.type]?.forEach((handler: () => void): void => handler());
        return true;
    }
}

/**
 * 検証画面を描画に依存せず起動する。
 * @returns フォーム要素と受信イベントの入口
 */
function createValidationPage(): { controls: Record<string, TestControl>; receive: (data: PointerMotionDiagnostics) => void } {
    const controls: Record<string, TestControl> = {};
    let receiver: (data: PointerMotionDiagnostics) => void = (): void => {};
    const getControl = (id: string): TestControl => controls[id] ??= new TestControl();
    getControl('pointer-validation-device').value = 'cursorRight';
    getControl('pointer-validation-posture').value = '通常持ち';
    getControl('pointer-validation-action').value = '左へひねる';
    const source = readFileSync(path.join(__dirname, '../renderer/main/pointer-validation.ts'), 'utf8');
    const script = transpileModule(source, { compilerOptions: { target: ScriptTarget.ES2020 } }).outputText;
    runInNewContext(script, {
        mainWindowApiAccessor: {
            getApi: (name: string): unknown => name === 'localStorageStore'
                ? { getJsonValue: (): object => ({}), setJsonValue: (): void => {} }
                : { getMainRenderer: (): object => ({ electronAPI: { onPointerMotionDiagnostics: (callback: typeof receiver): void => { receiver = callback; } } }) },
        },
        document: { getElementById: getControl },
        window: { addEventListener: (): void => {} },
        HTMLInputElement: TestControl,
        performance: { now: (): number => Date.now() },
        Date, setInterval, clearInterval, setTimeout,
    });
    return { controls, receive: (data: PointerMotionDiagnostics): void => receiver(data) };
}

/** @returns 非表示中の小さいジャイロ成分を含む受信データ */
function createSample(): PointerMotionDiagnostics {
    return inspectPointerMotion({
        data: { id: 'cursorRight', accel: { x: 0, y: 0, z: -4096 }, gyro: { x: 50, y: 0, z: 0 } },
        cursorId: 'cursorRight', cursorVisible: false, isCalibrating: false,
        gyroBias: { x: 0, y: 0, z: 0 }, xRotationDegrees: 0,
        xRotationCompensationStrength: 1, fixedXRotationDegrees: null, screenGyro: null,
        cursorMapConfig: {}, currentPosition: { x: 10, y: 20 }, defaultPosition: { x: 10, y: 20 },
        screenSize: { width: 1920, height: 1080 }, moveSpeed: 0.05, gyroDeadzone: 120,
        deltaTimeSeconds: 1 / 60,
    });
}

describe('姿勢・操作検証モードの記録', (): void => {
    beforeEach((): void => { jest.useFakeTimers(); });
    afterEach((): void => { jest.clearAllTimers(); jest.useRealTimers(); });

    it('準備時間を除き非表示と表示のサンプルと実験ラベルをJSONへ残す', (): void => {
        const { controls, receive } = createValidationPage();
        controls['pointer-validation-start'].dispatchEvent({ type: 'click' });
        expect(controls['pointer-validation-device'].disabled).toBe(true);
        receive(createSample());
        jest.advanceTimersByTime(2000);
        receive(createSample());
        const visible = createSample();
        if (visible.sample) {
            visible.sample.cursorVisible = true;
        }
        receive(visible);
        jest.advanceTimersByTime(5000);
        const report = JSON.parse(controls['pointer-validation-result'].value);
        expect(report.labels).toEqual({ device: 'cursorRight', posture: '通常持ち', action: '左へひねる', note: '' });
        expect(report.summary.count).toBe(2);
        expect(report.summary.visibleCount).toBe(1);
        expect(report.samples[0].sample.rawGyro.x).toBe(50);
        expect(report.samples[0].sample.filteredGyroRaw.x).toBe(0);
        expect(controls['pointer-validation-device'].disabled).toBe(false);
        expect(controls['pointer-validation-copy'].disabled).toBe(false);
    });

    it('受信がない記録を成功として扱わず書き出しを無効にする', (): void => {
        const { controls } = createValidationPage();
        controls['pointer-validation-start'].dispatchEvent({ type: 'click' });
        jest.advanceTimersByTime(7000);
        expect(controls['pointer-validation-status'].textContent).toContain('データを受信できませんでした');
        expect(controls['pointer-validation-export'].disabled).toBe(true);
    });
});
