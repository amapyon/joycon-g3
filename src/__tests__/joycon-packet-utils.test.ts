import { decodeRightStickAnalog, extractBatteryLevel } from '../main/joycon-packet-utils';

describe('Joy-Conパケットユーティリティ', (): void => {
    it('バッテリーレベルを上位3ビットから抽出する', (): void => {
        expect(extractBatteryLevel(0b11100000)).toBe(7);
        expect(extractBatteryLevel(0b10100000)).toBe(5);
        expect(extractBatteryLevel(0b00011111)).toBe(0);
    });

    it('右スティックのX/Yをデコードする', (): void => {
        const analog = decodeRightStickAnalog(0x34, 0xA2, 0x1B);

        expect(analog).toEqual({
            x: 0x234,
            y: 0x1BA,
        });
    });
});
