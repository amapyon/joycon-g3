import { registerTimerIpcHandlers } from '../main/timer-ipc';
import { createTimerState, setTimerCounting, setTimerPaused, type TimerState } from '../main/timer-state';
import type { IpcMainEvent } from 'electron';

type Listener = (event: IpcMainEvent, ...args: unknown[]) => void;

/**
 * テスト用の IPC モックを作成する。
 * @param existingCount 既存登録数
 * @returns モック
 */
function createIpcMock(existingCount: Record<string, number> = {}): {
    on: (channel: string, listener: Listener) => void;
    listenerCount: (channel: string) => number;
    listeners: Record<string, Listener>;
} {
    const listeners: Record<string, Listener> = {};
    return {
        on: (channel: string, listener: Listener): void => {
            listeners[channel] = listener;
        },
        listenerCount: (channel: string): number => existingCount[channel] ?? 0,
        listeners,
    };
}

describe('タイマー IPC の整合', (): void => {
    it('timer-status-update が状態を更新する', (): void => {
        const ipc = createIpcMock();
        const event = {} as IpcMainEvent;
        let state: TimerState = createTimerState();

        registerTimerIpcHandlers(ipc, {
            onStatusUpdate: (isCounting: boolean): void => {
                state = setTimerCounting(state, isCounting);
            },
            onPauseUpdate: (isPaused: boolean): void => {
                state = setTimerPaused(state, isPaused);
            },
        });

        ipc.listeners['timer-status-update']?.(event, true);
        expect(state.isCounting).toBe(true);
        expect(state.isPaused).toBe(false);

        ipc.listeners['timer-status-update']?.(event, false);
        expect(state.isCounting).toBe(false);
        expect(state.isPaused).toBe(false);
    });

    it('timer-pause-update はカウント中のみ反映される', (): void => {
        const ipc = createIpcMock();
        const event = {} as IpcMainEvent;
        let state: TimerState = setTimerCounting(createTimerState(), true);

        registerTimerIpcHandlers(ipc, {
            onStatusUpdate: (isCounting: boolean): void => {
                state = setTimerCounting(state, isCounting);
            },
            onPauseUpdate: (isPaused: boolean): void => {
                state = setTimerPaused(state, isPaused);
            },
        });

        ipc.listeners['timer-pause-update']?.(event, true);
        expect(state.isPaused).toBe(true);

        state = setTimerCounting(state, false);
        ipc.listeners['timer-pause-update']?.(event, true);
        expect(state.isPaused).toBe(false);
    });

    it('既に登録済みの場合は上書きしない', (): void => {
        const ipc = createIpcMock({ 'timer-status-update': 1, 'timer-pause-update': 1 });
        const spy = jest.fn();

        registerTimerIpcHandlers(ipc, {
            onStatusUpdate: spy,
            onPauseUpdate: spy,
        });

        expect(ipc.listeners['timer-status-update']).toBeUndefined();
        expect(ipc.listeners['timer-pause-update']).toBeUndefined();
    });
});
