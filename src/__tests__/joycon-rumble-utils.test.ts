import {
    createRumbleData,
    encodeHighAmp,
    encodeHighFreq,
    encodeLowAmp,
    encodeLowFreq,
} from '../main/joycon-rumble-utils';

describe('Joy-Con振動ユーティリティ', (): void => {
    it('周波数エンコードが範囲内に丸められる', (): void => {
        expect(encodeHighFreq(1)).toBeGreaterThanOrEqual(0);
        expect(encodeHighFreq(10000)).toBeLessThanOrEqual(0x1ff);
        expect(encodeLowFreq(1)).toBeGreaterThanOrEqual(0);
        expect(encodeLowFreq(10000)).toBeLessThanOrEqual(0x1ff);
    });

    it('振幅エンコードが0以下を0として扱う', (): void => {
        expect(encodeHighAmp(0)).toBe(0);
        expect(encodeLowAmp(-1)).toBe(0);
    });

    it('振動データが8バイトで生成される', (): void => {
        const data = createRumbleData(320, 1.0, 160, 1.0, 320, 1.0, 160, 1.0);

        expect(data.length).toBe(8);
        data.forEach((value: number): void => {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(255);
        });
    });
});
