import { IpcMainEvent } from 'electron';

export type TimerIpc = {
    on: (channel: string, listener: (event: IpcMainEvent, ...args: unknown[]) => void) => void;
    listenerCount: (channel: string) => number;
};

export type TimerIpcHandlers = {
    onStatusUpdate: (isCounting: boolean) => void;
    onPauseUpdate: (isPaused: boolean) => void;
};

/**
 * タイマー関連の IPC ハンドラを登録する。
 * @param ipc IPC オブジェクト
 * @param handlers ハンドラ
 */
export function registerTimerIpcHandlers(ipc: TimerIpc, handlers: TimerIpcHandlers): void {
    if (!ipc.listenerCount('timer-status-update')) {
        ipc.on('timer-status-update', (event: IpcMainEvent, ...args: unknown[]) => {
            void event;
            const isCountingUpdate = Boolean(args[0]);
            handlers.onStatusUpdate(isCountingUpdate);
        });
    }
    if (!ipc.listenerCount('timer-pause-update')) {
        ipc.on('timer-pause-update', (event: IpcMainEvent, ...args: unknown[]) => {
            void event;
            const isPausedUpdate = Boolean(args[0]);
            handlers.onPauseUpdate(isPausedUpdate);
        });
    }
}
