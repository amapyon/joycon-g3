import HID from 'node-hid';
import { findJoyConPaths } from '../main/joycon-device-discovery';

jest.mock('node-hid', (): object => ({ devices: jest.fn(), devicesAsync: jest.fn() }));

/** @param productId 製品 ID @param path デバイスパス @returns 列挙用のデバイス */
function device(productId: number, path?: string): HID.Device {
    return { vendorId: 1406, productId, path, release: 0, interface: 0 };
}

describe('Joy-Conの非同期デバイス探索', (): void => {
    beforeEach((): void => { jest.resetAllMocks(); });

    it('同期APIを使わず左右のパスを抽出する', async (): Promise<void> => {
        jest.mocked(HID.devicesAsync).mockResolvedValue([
            device(8198, 'left'), device(8199, 'right'),
            { ...device(8199, 'other'), vendorId: 1 }, device(9999, 'unsupported'),
        ]);
        await expect(findJoyConPaths()).resolves.toEqual({ joyconLPath: 'left', joyconRPath: 'right' });
        expect(HID.devices).not.toHaveBeenCalled();
        expect(HID.devicesAsync).toHaveBeenCalledTimes(1);
    });

    it('探索失敗やパス未指定は未検出として扱う', async (): Promise<void> => {
        jest.mocked(HID.devicesAsync).mockRejectedValueOnce(new Error('列挙失敗'));
        await expect(findJoyConPaths()).resolves.toEqual({ joyconLPath: null, joyconRPath: null });
        jest.mocked(HID.devicesAsync).mockResolvedValue([device(8198)]);
        await expect(findJoyConPaths()).resolves.toEqual({ joyconLPath: null, joyconRPath: null });
    });
});
