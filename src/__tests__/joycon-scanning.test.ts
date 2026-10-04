import HID from 'node-hid';
import JoyConManager from '../main/joycon';
import { readRuntimeTrace, setRuntimeTraceEnabled } from '../main/pointer-runtime-trace';

jest.mock('node-hid', (): object => ({ devices: jest.fn(), devicesAsync: jest.fn() }));

/** @returns 接続処理を行わない探索テスト用の管理クラスと接続試行の記録 */
function createManager(): { manager: JoyConManager; connect: jest.SpyInstance; battery: jest.SpyInstance } {
    const manager = new JoyConManager();
    const connect = jest.spyOn(manager, 'connectJoyCon').mockImplementation((): void => {});
    const battery = jest.spyOn(manager, 'requestBatteryStatus').mockImplementation((): void => {});
    return { manager, connect, battery };
}

/** @returns 左右の列挙結果 */
function devices(): HID.Device[] {
    return [
        { vendorId: 1406, productId: 8198, path: 'left', release: 0, interface: 0 },
        { vendorId: 1406, productId: 8199, path: 'right', release: 0, interface: 0 },
    ];
}

/** @returns 完了を任意のタイミングまで遅延できる列挙処理 */
function deferDiscovery(): { promise: Promise<HID.Device[]>; resolve: (value: HID.Device[]) => void } {
    let resolve: (value: HID.Device[]) => void = (): void => {};
    const promise = new Promise<HID.Device[]>((done: (value: HID.Device[]) => void): void => { resolve = done; });
    jest.mocked(HID.devicesAsync).mockReturnValue(promise);
    return { promise, resolve };
}

describe('Joy-Conの探索省略と非同期再接続', (): void => {
    beforeEach((): void => {
        jest.resetAllMocks();
        jest.mocked(HID.devicesAsync).mockResolvedValue(devices());
        setRuntimeTraceEnabled(false);
    });
    afterEach((): void => { setRuntimeTraceEnabled(false); jest.useRealTimers(); });

    it('両方接続済みなら列挙を省き電池情報更新は続ける', async (): Promise<void> => {
        const { manager, connect, battery } = createManager();
        manager.hidL = {} as HID.HID;
        manager.hidR = {} as HID.HID;
        setRuntimeTraceEnabled(true);
        await manager.scanDevices();
        expect(HID.devicesAsync).not.toHaveBeenCalled();
        expect(connect).not.toHaveBeenCalled();
        expect(battery.mock.calls).toEqual([[true], [false]]);
        expect(readRuntimeTrace('cursorRight')).toEqual([expect.objectContaining({ discoverySkipped: true, discoveryDurationMs: 0 })]);
    });

    it('Rだけ接続済みでLの自動接続が無効なら列挙しない', async (): Promise<void> => {
        const { manager, battery } = createManager();
        manager.hidR = {} as HID.HID;
        manager.autoConnectL = false;
        await manager.scanDevices();
        expect(HID.devicesAsync).not.toHaveBeenCalled();
        expect(battery).toHaveBeenCalledWith(false);
    });

    it('接続処理中だけなら重複して列挙しない', async (): Promise<void> => {
        const { manager } = createManager();
        manager.connectingL = true;
        manager.connectingR = true;
        await manager.scanDevices();
        expect(HID.devicesAsync).not.toHaveBeenCalled();
    });

    it('自動接続対象だけを非同期で探索して再接続する', async (): Promise<void> => {
        const { manager, connect } = createManager();
        manager.autoConnectL = false;
        await manager.scanDevices();
        expect(HID.devices).not.toHaveBeenCalled();
        expect(connect.mock.calls).toEqual([['right', false]]);
    });

    it('列挙待ちでも他のイベントを処理し定期探索を重複させない', async (): Promise<void> => {
        jest.useFakeTimers();
        const { manager, connect } = createManager();
        const pending = deferDiscovery();
        const first = manager.scanDevices();
        const second = manager.scanDevices();
        const callback = jest.fn();
        setTimeout(callback, 15);
        jest.advanceTimersByTime(15);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(connect).not.toHaveBeenCalled();
        expect(HID.devicesAsync).toHaveBeenCalledTimes(1);
        pending.resolve(devices());
        await Promise.all([first, second]);
        expect(connect).toHaveBeenCalledTimes(2);
    });

    it('探索中に無効化された自動再接続は実行しない', async (): Promise<void> => {
        const { manager, connect } = createManager();
        const pending = deferDiscovery();
        const scan = manager.scanDevices();
        manager.autoConnectL = false;
        manager.autoConnectR = false;
        pending.resolve(devices());
        await scan;
        expect(connect).not.toHaveBeenCalled();
    });

    it('探索停止後の古い結果で接続しない', async (): Promise<void> => {
        const { manager, connect } = createManager();
        const pending = deferDiscovery();
        const scan = manager.scanDevices();
        manager.stopScanning();
        pending.resolve(devices());
        await scan;
        expect(connect).not.toHaveBeenCalled();
    });

    it('手動接続は自動接続無効でも非同期で試行する', async (): Promise<void> => {
        const { manager, connect } = createManager();
        manager.autoConnectL = false;
        manager.autoConnectR = false;
        manager.connectAll();
        await manager.scanDevices();
        expect(connect.mock.calls).toEqual([['left', true], ['right', false]]);
        expect(HID.devices).not.toHaveBeenCalled();
    });

    it('列挙失敗後も次の定期探索で再試行できる', async (): Promise<void> => {
        const { manager, connect } = createManager();
        jest.mocked(HID.devicesAsync).mockRejectedValueOnce(new Error('列挙失敗'));
        await manager.scanDevices();
        expect(connect).not.toHaveBeenCalled();
        connect.mockClear();
        await manager.scanDevices();
        expect(connect.mock.calls).toEqual([['left', true], ['right', false]]);
    });

    it('定期探索中の手動接続要求を失わず終了後に処理する', async (): Promise<void> => {
        const { manager, connect } = createManager();
        manager.autoConnectL = false;
        const pending = deferDiscovery();
        const scan = manager.scanDevices();
        manager.connectAll();
        pending.resolve(devices());
        await scan;
        await manager.scanDevices();
        expect(connect).toHaveBeenCalledWith('left', true);
    });

    it('探索待ちの間に接続済みとなったデバイスへ重複接続しない', async (): Promise<void> => {
        const { manager, connect, battery } = createManager();
        const pending = deferDiscovery();
        const scan = manager.scanDevices();
        manager.hidR = {} as HID.HID;
        pending.resolve(devices());
        await scan;
        expect(connect.mock.calls).toEqual([['left', true]]);
        expect(battery).toHaveBeenCalledWith(false);
    });
});
