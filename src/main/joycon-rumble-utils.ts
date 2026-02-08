/**
 * 周波数と振幅から Joy-Con の振動データを作成する。
 * @param leftHighFreq 左高周波
 * @param leftHighAmp 左高周波振幅
 * @param leftLowFreq 左低周波
 * @param leftLowAmp 左低周波振幅
 * @param rightHighFreq 右高周波
 * @param rightHighAmp 右高周波振幅
 * @param rightLowFreq 右低周波
 * @param rightLowAmp 右低周波振幅
 * @returns 振動データ
 */
export function createRumbleData(
    leftHighFreq: number,
    leftHighAmp: number,
    leftLowFreq: number,
    leftLowAmp: number,
    rightHighFreq: number,
    rightHighAmp: number,
    rightLowFreq: number,
    rightLowAmp: number,
): number[] {
    const lhf = encodeHighFreq(leftHighFreq);
    const lha = encodeHighAmp(leftHighAmp);
    const llf = encodeLowFreq(leftLowFreq);
    const lla = encodeLowAmp(leftLowAmp);
    const rhf = encodeHighFreq(rightHighFreq);
    const rha = encodeHighAmp(rightHighAmp);
    const rlf = encodeLowFreq(rightLowFreq);
    const rla = encodeLowAmp(rightLowAmp);

    return [
        lhf & 0xff,
        (lha + ((lhf >> 8) & 0xff)) & 0xff,
        (llf + ((lla >> 8) & 0xff)) & 0xff,
        lla & 0xff,
        rhf & 0xff,
        (rha + ((rhf >> 8) & 0xff)) & 0xff,
        (rlf + ((rla >> 8) & 0xff)) & 0xff,
        rla & 0xff,
    ];
}

/**
 * 高周波数をエンコードする。
 * @param freq 周波数
 * @returns エンコード値
 */
export function encodeHighFreq(freq: number): number {
    const value = Math.round(Math.log2(freq / 10) * 32);
    return Math.max(0, Math.min(0x1ff, value));
}

/**
 * 低周波数をエンコードする。
 * @param freq 周波数
 * @returns エンコード値
 */
export function encodeLowFreq(freq: number): number {
    const value = Math.round(Math.log2(freq / 10) * 32);
    return Math.max(0, Math.min(0x1ff, value));
}

/**
 * 高周波の振幅をエンコードする。
 * @param amp 振幅
 * @returns エンコード値
 */
export function encodeHighAmp(amp: number): number {
    if (amp <= 0) {
        return 0;
    }
    const value = Math.round(Math.log2(amp * 8.7) * 32);
    return Math.max(0, Math.min(0x1ff, value));
}

/**
 * 低周波の振幅をエンコードする。
 * @param amp 振幅
 * @returns エンコード値
 */
export function encodeLowAmp(amp: number): number {
    if (amp <= 0) {
        return 0;
    }
    const value = Math.round(Math.log2(amp * 17.0) * 32);
    return Math.max(0, Math.min(0x1ff, value));
}
