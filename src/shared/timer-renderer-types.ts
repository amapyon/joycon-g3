import type { TimerMode } from './timer-mode';
import type { TimerNotificationConfig } from './timer-notification-config';
import type { WheelAction } from './wheel-action-types';

/**
 * タイマーメニュー項目。
 */
export type TimerMenuItem =
    | { type: 'preset'; time: number; label: string }
    | { type: 'add-minute'; label: string }
    | { type: 'clock'; label: string };

/**
 * タイマー表示状態の計算API。
 */
export type TimerStyleStateApi = {
    clampNumber: (value: number, min: number, max: number) => number;
    calcNextFontSize: (current: number, delta: number, min: number, max: number) => number;
    calcNextOpacity: (current: number, delta: number, min: number, max: number) => number;
};

/**
 * タイマー設定の保存API。
 */
export type TimerStorageApi = {
    loadCountdownInitialValue: (fallback: number) => number;
    saveCountdownInitialValue: (value: number) => void;
    loadTimerFontSize: (fallback: number) => number;
    saveTimerFontSize: (value: number) => void;
    loadTimerPresets: (fallback: number[]) => number[];
    saveTimerPresets: (presets: number[]) => void;
    loadTimerOpacity: (fallback: number) => number;
    saveTimerOpacity: (opacity: number) => void;
    loadNotifications: (fallback: TimerNotificationConfig[]) => TimerNotificationConfig[];
    saveNotifications: (configs: TimerNotificationConfig[]) => void;
    loadSoundPlayDelay: () => number | null;
    saveSoundPlayDelay: (delayMs: number) => void;
};

/**
 * ティック処理の結果。
 */
export type TimerRendererTickResult = {
    remaining: number;
    shouldStop: boolean;
};

/**
 * ティック結果に基づく表示更新アクション。
 */
export type TimerRendererTickAction =
    | { kind: 'none' }
    | { kind: 'continue'; displaySeconds: number; sendSeconds: number }
    | { kind: 'finish'; displaySeconds: number; sendSeconds: number };

/**
 * タイマーレンダラー判定ロジックAPI。
 */
export type TimerRendererLogicApi = {
    normalizeNotifications: (configs: TimerNotificationConfig[]) => TimerNotificationConfig[];
    resolveWheelAction: (deltaY: number, shiftKey: boolean) => WheelAction;
    resolveTickAction: (
        tickResult: TimerRendererTickResult | null,
        currentInitialValue: number
    ) => TimerRendererTickAction;
    shouldShowSetupMenu: (mode: TimerMode) => boolean;
};
