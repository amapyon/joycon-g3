/**
 * 周波数と振幅から Joy-Con の振動データを作成する。
 * @param input 左右それぞれの高周波/低周波設定
 * @returns 振動データ
 */
type RumbleChannel = {
    highFreq: number;
    highAmp: number;
    lowFreq: number;
    lowAmp: number;
};

type CreateRumbleDataInput = {
    left: RumbleChannel;
    right: RumbleChannel;
};

export function createRumbleData(input: CreateRumbleDataInput): number[] {
    const lhf = encodeHighFreq(input.left.highFreq);
    const lha = encodeHighAmp(input.left.highAmp);
    const llf = encodeLowFreq(input.left.lowFreq);
    const lla = encodeLowAmp(input.left.lowAmp);
    const rhf = encodeHighFreq(input.right.highFreq);
    const rha = encodeHighAmp(input.right.highAmp);
    const rlf = encodeLowFreq(input.right.lowFreq);
    const rla = encodeLowAmp(input.right.lowAmp);

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
