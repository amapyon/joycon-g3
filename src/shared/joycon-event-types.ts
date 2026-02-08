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

/**
 * Joy-Con 姿勢情報。
 */
export type JoyConAttitudeData = {
    id: CursorId;
    roll: number;
    pitch: number;
    yaw?: number;
};

/**
 * Joy-Con ボタン状態ペイロード。
 */
export type JoyConButtonStateData = {
    pressed: boolean;
};

/**
 * Joy-Con ボタン押下元ペイロード。
 */
export type JoyConCursorIdData = {
    id: CursorId;
};

/**
 * Joy-Con スティックアナログ値ペイロード。
 */
export type JoyConStickAnalogData = {
    x: number;
    y: number;
};

/**
 * Joy-Con イベント共通ペイロード。
 */
export type JoyConEventData = JoyConButtonStateData | JoyConCursorIdData | JoyConStickAnalogData;

/**
 * カーソル座標更新ペイロード。
 */
export type UpdatePointerData = {
    id: CursorId;
    x: number;
    y: number;
};
