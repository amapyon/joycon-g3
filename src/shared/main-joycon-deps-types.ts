import { BrowserWindow } from 'electron';
import type { CursorId } from './cursor-types';

export type JoyConManagerLike = {
    on: (eventName: string, handler: (...args: unknown[]) => void) => unknown;
};

export type PowerPointControlLike = {
    next: () => boolean;
    previous: () => boolean;
};

export type GoogleSlidesControlLike = {
    next: () => boolean;
    previous: () => boolean;
};

export type WindowManagerLike = {
    getCursorWindow: () => BrowserWindow | null;
    getTimerWindow: () => BrowserWindow | null;
    getMainWindow: () => BrowserWindow | null;
    closeCursorWindow: () => void;
};

export type ImuStateLike = {
    gyroBiasX: number;
    gyroBiasY: number;
    gyroBiasZ: number;
};

export type ImuProcessorLike = {
    update: (data: { id: CursorId; accel: { x: number; y: number; z: number }; gyro: { x: number; y: number; z: number } }) => void;
    recenter: (id: CursorId) => void;
    on: (eventName: string, handler: (...args: unknown[]) => void) => unknown;
    states: Record<CursorId, ImuStateLike>;
    isCalibrating: Record<CursorId, boolean>;
};
