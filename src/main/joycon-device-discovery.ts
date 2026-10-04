import HID from 'node-hid';

const VENDOR_ID = 1406;
const PRODUCT_ID_L = 8198;
const PRODUCT_ID_R = 8199;

type HidDeviceInfo = {
    vendorId?: number;
    productId?: number;
    path?: string;
};

export type JoyConPaths = {
    joyconLPath: string | null;
    joyconRPath: string | null;
};

/**
 * デバイス一覧から左右の Joy-Con のパスを抽出する。
 * @param devices 列挙された HID デバイス
 * @returns 左右のデバイスパス
 */
function extractJoyConPaths(devices: HidDeviceInfo[]): JoyConPaths {
    let joyconLPath: string | null = null;
    let joyconRPath: string | null = null;
    devices.forEach((device: HidDeviceInfo): void => {
        if (device.vendorId !== VENDOR_ID) return;
        if (device.productId === PRODUCT_ID_L) joyconLPath = device.path || null;
        if (device.productId === PRODUCT_ID_R) joyconRPath = device.path || null;
    });
    return { joyconLPath, joyconRPath };
}

/**
 * メインスレッドを止めずに接続可能な Joy-Con を探索する。
 * @returns 左右のデバイスパス。探索失敗時は両方 null
 */
export async function findJoyConPaths(): Promise<JoyConPaths> {
    try {
        if (!HID || typeof HID.devicesAsync !== 'function') {
            throw new Error('node-hid not available');
        }
        return extractJoyConPaths(await HID.devicesAsync());
    } catch {
        return { joyconLPath: null, joyconRPath: null };
    }
}
