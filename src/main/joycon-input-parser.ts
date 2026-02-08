import { buildLeftButtonEvents, buildRightButtonEvents, JoyConButtonStateSnapshot } from './joycon-button-utils';
import { decodeImuSample } from './joycon-imu-utils';
import { decodeRightStickAnalog, extractBatteryLevel, RightStickAnalog } from './joycon-packet-utils';

type CursorId = import('../shared/cursor-types').CursorId;

export type JoyConButtonEvent = {
    name: string;
    payload?: Record<string, unknown>;
};

export type ParsedJoyConInput = {
    batteryLevel: number;
    cursorId: CursorId;
    imu: ReturnType<typeof decodeImuSample>;
    buttonEvents: JoyConButtonEvent[];
    nextButtonState: Partial<JoyConButtonStateSnapshot>;
    analog: RightStickAnalog | null;
};

/**
 * 標準入力レポートを解析して、通知すべき情報に変換する。
 * @param data 入力レポート
 * @param isLeft 左 Joy-Con かどうか
 * @param lastButtonState 直前のボタン状態
 * @returns 解析結果
 */
export function parseStandardInputReport(
    data: Buffer,
    isLeft: boolean,
    lastButtonState: JoyConButtonStateSnapshot,
): ParsedJoyConInput {
    const batteryByte = data.readUInt8(2);
    const batteryLevel = extractBatteryLevel(batteryByte);
    const cursorId: CursorId = isLeft ? 'cursorLeft' : 'cursorRight';
    const imu = decodeImuSample(data);

    const buttonByteIndex = isLeft ? 5 : 3;
    const buttonByte = data[buttonByteIndex];
    const sharedButtonByte = data[4];

    const buttonResult = isLeft
        ? buildLeftButtonEvents(buttonByte, sharedButtonByte, cursorId, lastButtonState)
        : buildRightButtonEvents(buttonByte, sharedButtonByte, cursorId, lastButtonState);

    const analog = (!isLeft && data.length >= 12)
        ? decodeRightStickAnalog(data.readUInt8(9), data.readUInt8(10), data.readUInt8(11))
        : null;

    return {
        batteryLevel,
        cursorId,
        imu,
        buttonEvents: buttonResult.events as JoyConButtonEvent[],
        nextButtonState: buttonResult.nextState,
        analog,
    };
}
