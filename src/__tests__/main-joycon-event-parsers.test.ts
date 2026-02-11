import {
    parseAttitudeData,
    parseBatteryStatus,
    parseCalibrationStatus,
    parseImuData,
    parseJoyConButtonStateData,
    parseJoyConCursorIdData,
    parseJoyConStatus,
    parseJoyConStickAnalogData,
} from '../main/main-joycon-event-parsers';

describe('main-joycon-event-parsers', (): void => {
    it('IMUデータを正しく解析する', (): void => {
        const parsed = parseImuData({
            id: 'cursorLeft',
            accel: { x: 1, y: 2, z: 3 },
            gyro: { x: 4, y: 5, z: 6 },
        });
        expect(parsed).toEqual({
            id: 'cursorLeft',
            accel: { x: 1, y: 2, z: 3 },
            gyro: { x: 4, y: 5, z: 6 },
        });
    });

    it('姿勢データを正しく解析する', (): void => {
        expect(parseAttitudeData({ id: 'cursorRight', roll: 1, pitch: 2, yaw: 3 })).toEqual({
            id: 'cursorRight',
            roll: 1,
            pitch: 2,
            yaw: 3,
        });
        expect(parseAttitudeData({ id: 'cursorRight', roll: 1, pitch: 2, yaw: Number.NaN })).toBeNull();
    });

    it('ボタン関連データを正しく解析する', (): void => {
        expect(parseJoyConButtonStateData({ pressed: true })).toEqual({ pressed: true });
        expect(parseJoyConCursorIdData({ id: 'cursorLeft' })).toEqual({ id: 'cursorLeft' });
        expect(parseJoyConStickAnalogData({ x: 100, y: -100 })).toEqual({ x: 100, y: -100 });
    });

    it('状態データを正しく解析する', (): void => {
        expect(parseJoyConStatus({ leftConnected: true, rightConnected: false })).toEqual({
            leftConnected: true,
            rightConnected: false,
        });
        expect(parseBatteryStatus({ isLeft: true, level: 2 })).toEqual({ isLeft: true, level: 2 });
        expect(parseCalibrationStatus({ id: 'cursorLeft', status: 'done' })).toEqual({
            id: 'cursorLeft',
            status: 'done',
        });
    });

    it('不正データは null を返す', (): void => {
        expect(parseImuData({ id: 'cursorLeft', accel: { x: 1, y: 2 }, gyro: { x: 1, y: 2, z: 3 } })).toBeNull();
        expect(parseJoyConCursorIdData({ id: 'unknown' })).toBeNull();
        expect(parseJoyConStatus({ leftConnected: true })).toBeNull();
    });
});
