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
 * 接続可能な Joy-Con のデバイスパスを探索する。
 * @returns 左右のデバイスパス
 */
export function findJoyConPaths(): JoyConPaths {
    try {
        if (!HID || typeof HID.devices !== 'function') {
            throw new Error('node-hid not available');
        }

        const devices = HID.devices();
        let joyconLPath: string | null = null;
        let joyconRPath: string | null = null;

        devices.forEach((device: HidDeviceInfo): void => {
            if (device.vendorId !== VENDOR_ID) {
                return;
            }

            if (device.productId === PRODUCT_ID_L) {
                joyconLPath = device.path || null;
                return;
            }

            if (device.productId === PRODUCT_ID_R) {
                joyconRPath = device.path || null;
            }
        });

        return { joyconLPath, joyconRPath };
    } catch {
        return { joyconLPath: null, joyconRPath: null };
    }
}
