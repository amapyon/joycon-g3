import type { CursorId } from './cursor-types';

/**
 * Joy-Con 接続状態。
 */
export type JoyConStatus = {
    leftConnected: boolean;
    rightConnected: boolean;
};

/**
 * Joy-Con バッテリー状態。
 */
export type BatteryStatus = {
    isLeft: boolean;
    level: number;
};

/**
 * キャリブレーション状態。
 */
export type CalibrationStatus = {
    id: CursorId;
    status: string;
};
