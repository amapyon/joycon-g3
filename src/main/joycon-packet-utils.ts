export type RightStickAnalog = {
    x: number;
    y: number;
};

/**
 * バッテリーバイトからレベルを抽出する。
 * @param batteryByte バッテリーバイト
 * @returns バッテリーレベル（0-7）
 */
export function extractBatteryLevel(batteryByte: number): number {
    return (batteryByte & 0xe0) >> 5;
}

/**
 * 右 Joy-Con のスティック値をデコードする。
 * @param b9 パケット 9 バイト目
 * @param b10 パケット 10 バイト目
 * @param b11 パケット 11 バイト目
 * @returns デコード済みスティック値
 */
export function decodeRightStickAnalog(b9: number, b10: number, b11: number): RightStickAnalog {
    return {
        x: b9 | ((b10 & 0x0f) << 8),
        y: (b10 >> 4) | (b11 << 4),
    };
}
