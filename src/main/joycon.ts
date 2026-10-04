// joycon.ts
// Joy-Conの接続、初期化、データ解析を行い、イベントを発行するモジュール

import HID from 'node-hid';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { appendRuntimeTrace } from './pointer-runtime-trace';
import { shouldAttemptAutoConnect, shouldSkipConnect } from './joycon-connection-utils';
import { createInitialButtonState, ButtonState } from './joycon-state';
import { findJoyConPaths } from './joycon-device-discovery';
import { parseStandardInputReport, JoyConButtonEvent } from './joycon-input-parser';
import { RUMBLE_OFF_DATA, STRONG_RUMBLE_DATA } from './joycon-rumble-presets';
import { canParseStandardInputReport, classifyJoyConReport } from './joycon-report-utils';

const DEFAULT_SCAN_INTERVAL = 5000; // デバイススキャン間隔 (ミリ秒)

/**
 * Joy-Con の接続・初期化・入力解析を管理し、イベントを発行する。
 */
export default class JoyConManager extends EventEmitter {
    hidL: HID.HID | null = null;
    hidR: HID.HID | null = null;
    globalPacketNumberL = 0;
    globalPacketNumberR = 0;
    lastButtonStateL: ButtonState;
    lastButtonStateR: ButtonState;
    scanIntervalMs: number;
    scanTimer: NodeJS.Timeout | null = null;
    rumbleTimer: NodeJS.Timeout | null = null;
    connectingL = false;
    connectingR = false;
    autoConnectL = true;
    autoConnectR = true;
    private scanPromise: Promise<void> | null = null;
    private scanGeneration = 0;

    /**
     * Joy-Con 管理クラスを生成する。
     * @param scanIntervalMs デバイススキャン間隔（ミリ秒）
     */
    constructor(scanIntervalMs: number = DEFAULT_SCAN_INTERVAL) {
        super();
        this.lastButtonStateL = createInitialButtonState();
        this.lastButtonStateR = createInitialButtonState();
        this.scanIntervalMs = scanIntervalMs;
    }

    /**
     * 現在の接続状態を取得する。
     * @returns 左右の接続状態
     */
    getConnectionStatus(): { leftConnected: boolean; rightConnected: boolean } {
        return { leftConnected: !!this.hidL, rightConnected: !!this.hidR };
    }


    /**
     * コマンドを Joy-Con に送信する。
     * @param hidDevice 対象の HID デバイス
     * @param commandBytes 送信コマンド配列
     * @param isLeft 左 Joy-Con かどうか
     * @returns 送信成功かどうか
     */
    sendCommand(hidDevice: HID.HID | null, commandBytes: number[], isLeft: boolean): boolean {
        if (!hidDevice) return false;
        try {
            hidDevice.write(commandBytes);
            if (isLeft) {
                this.globalPacketNumberL = (this.globalPacketNumberL + 1) & 0x0f;
            } else {
                this.globalPacketNumberR = (this.globalPacketNumberR + 1) & 0x0f;
            }
            return true;
        } catch (e) {
            // console.error(`SendCommand Error (${isLeft ? 'L' : 'R'}):`, e);
            this.closeJoyCon(isLeft);
            return false;
        }
    }

    /**
     * Joy-Con を初期化する。
     * @param hidDevice 対象の HID デバイス
     * @param isLeft 左 Joy-Con かどうか
     * @returns 初期化成功かどうか
     */
    async initializeJoyCon(hidDevice: HID.HID, isLeft: boolean): Promise<boolean> {
        const packetNumber = (): number => (isLeft ? this.globalPacketNumberL : this.globalPacketNumberR);
        const delay = (ms: number): Promise<void> => new Promise((resolve: () => void) => setTimeout(resolve, ms));
        // console.log(`Initializing ${isLeft ? 'L' : 'R'} Joy-Con...`);
        try {
            // 振動を有効化する
            const enableRumbleCommand = [0x01, 0x00, ...RUMBLE_OFF_DATA, 0x48, 0x01];
            const commands: number[][] = [
                [0x01, 0, 0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40, 0x03, 0x30],
                [0x01, 0, 0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40, 0x40, 0x01],
                [0x01, 0, 0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40, 0x30, isLeft ? 0x01 : 0x02],
                enableRumbleCommand,
            ];
            for (const cmd of commands) {
                const currentPacketNumber = packetNumber();
                cmd[1] = currentPacketNumber;
                if (!this.sendCommand(hidDevice, cmd, isLeft)) {
                    throw new Error(`Cmd failed: 0x${cmd[10].toString(16)}`);
                }
                await delay(100);
            }
            // console.log(`Initialization ${isLeft ? 'L' : 'R'} OK.`);
            return true;
        } catch (error) {
            // console.error(`Initialization Error (${isLeft ? 'L' : 'R'}):`, error);
            return false;
        }
    }

    /**
     * HID デバイスを安全に閉じる。
     * @param hidDevice 対象の HID デバイス
     */
    closeHidDevice(hidDevice: HID.HID | null): void {
        if (hidDevice) {
            try {
                hidDevice.removeAllListeners('data');
                hidDevice.removeAllListeners('error');
                hidDevice.close();
                // console.log('HID device closed.');
            } catch (e) {
                // console.error('Close HID Error:', e);
                void e;
            }
        }
    }

    /**
     * 振動パターンを再生する。
     * @param steps 振動パターン
     */
    playRumblePattern(steps: { on: boolean; durationMs: number }[]): void {
        if (!this.hidL && !this.hidR) {
            return;
        }
        this.stopRumblePattern();
        let index = 0;
        const runStep = (): void => {
            if (index >= steps.length) {
                this.setRumble(false);
                return;
            }
            const step = steps[index];
            this.setRumble(step.on);
            this.rumbleTimer = setTimeout(() => {
                index += 1;
                runStep();
            }, step.durationMs);
        };
        runStep();
    }

    /**
     * 振動パターンを停止する。
     */
    stopRumblePattern(): void {
        if (this.rumbleTimer) {
            clearTimeout(this.rumbleTimer);
            this.rumbleTimer = null;
        }
        this.setRumble(false);
    }

    /**
     * 振動の ON/OFF を送信する。
     * @param enabled 振動を有効にするかどうか
     */
    private setRumble(enabled: boolean): void {
        const data = enabled ? STRONG_RUMBLE_DATA : RUMBLE_OFF_DATA;
        this.sendRumbleCommand(this.hidL, data, true);
        this.sendRumbleCommand(this.hidR, data, false);
    }

    /**
     * 振動コマンドを送信する。
     * @param hidDevice 対象の HID デバイス
     * @param rumbleData 振動データ
     * @param isLeft 左 Joy-Con かどうか
     */
    private sendRumbleCommand(hidDevice: HID.HID | null, rumbleData: number[], isLeft: boolean): void {
        if (!hidDevice) return;
        const packetNumber = isLeft ? this.globalPacketNumberL : this.globalPacketNumberR;
        const command = [0x10, packetNumber, ...rumbleData];
        if (!this.sendCommand(hidDevice, command, isLeft)) {
            this.closeJoyCon(isLeft);
        }
    }

    /**
     * 指定された Joy-Con 接続を閉じる。
     * @param isLeft 左 Joy-Con かどうか
     */
    closeJoyCon(isLeft: boolean): void {
        const targetHid = isLeft ? this.hidL : this.hidR;
        const wasConnected = !!targetHid;
        if (targetHid) {
            // console.log(`Closing ${isLeft ? 'L' : 'R'} Joy-Con...`);
            this.closeHidDevice(targetHid);
        }
        if (isLeft) {
            this.hidL = null;
            this.lastButtonStateL = createInitialButtonState();
            this.connectingL = false;
        } else {
            this.hidR = null;
            this.lastButtonStateR = createInitialButtonState();
            this.connectingR = false;
        }
        if (wasConnected) {
            // console.log(`Joy-Con ${isLeft ? 'L' : 'R'} disconnected.`);
            this.emit('status-update', { leftConnected: !!this.hidL, rightConnected: !!this.hidR });
        }
    }

    /**
     * 全ての Joy-Con 接続を閉じ、スキャンも停止する。
     */
    closeAll(): void {
        this.stopScanning(); this.closeJoyCon(true); this.closeJoyCon(false);
    }

    /**
     * 接続処理中フラグを更新する。
     * @param isLeft 左 Joy-Con かどうか
     * @param connecting 接続処理中かどうか
     */
    private setConnectingState(isLeft: boolean, connecting: boolean): void {
        if (isLeft) { this.connectingL = connecting; return; }
        this.connectingR = connecting;
    }

    /**
     * 接続済みデバイスを保持して状態更新を通知する。
     * @param hidDevice 接続済み HID デバイス
     * @param isLeft 左 Joy-Con かどうか
     */
    private attachConnectedDevice(hidDevice: HID.HID, isLeft: boolean): void {
        if (isLeft) this.hidL = hidDevice;
        else this.hidR = hidDevice;
        this.emit('status-update', { leftConnected: !!this.hidL, rightConnected: !!this.hidR });
    }

    /**
     * 接続失敗時のクリーンアップを実行する。
     * @param hidDevice 対象 HID デバイス
     * @param isLeft 左 Joy-Con かどうか
     */
    private cleanupFailedConnection(hidDevice: HID.HID | null, isLeft: boolean): void {
        this.closeHidDevice(hidDevice);
        this.closeJoyCon(isLeft);
    }

    /**
     * Joy-Con に接続し初期化する。
     * @param path デバイスパス
     * @param isLeft 左 Joy-Con かどうか
     */
    connectJoyCon(path: string | null, isLeft: boolean): void {
        const state = isLeft
            ? { isConnected: !!this.hidL, isConnecting: this.connectingL }
            : { isConnected: !!this.hidR, isConnecting: this.connectingR };
        if (shouldSkipConnect(path, state)) {
            return;
        }
        if (path === null) {
            return;
        }
        let hidDevice: HID.HID | null = null;
        try {
            this.setConnectingState(isLeft, true);
            // console.log(`Connecting to ${isLeft ? 'L' : 'R'} Joy-Con: ${path}`);
            hidDevice = new HID.HID(path);
            // console.log(`Connected (${isLeft ? 'L' : 'R'}). Initializing...`);

            let isDeviceClosed = false;
            const closedHandler = (): void => {
                isDeviceClosed = true;
            };
            hidDevice.once('close', closedHandler);
            this.initializeJoyCon(hidDevice, isLeft)
                .then((success: boolean) => {
                    hidDevice?.removeListener('close', closedHandler);
                    if (success && hidDevice && !isDeviceClosed) {
                        hidDevice.on('data', (data: Buffer) => {
                            this.parseJoyConData(hidDevice as HID.HID, data, isLeft);
                        });
                        // console.log(`Listener attached (${isLeft ? 'L' : 'R'}).`);
                        this.attachConnectedDevice(hidDevice, isLeft);
                    } else {
                        // console.error(`Init failed or device closed during init (${isLeft ? 'L' : 'R'}).`);
                        this.cleanupFailedConnection(hidDevice, isLeft);
                    }
                })
                .catch((initError: unknown) => {
                    hidDevice?.removeListener('close', closedHandler);
                    // console.error(`Async Init Error (${isLeft ? 'L' : 'R'}):`, initError);
                    void initError;
                    this.cleanupFailedConnection(hidDevice, isLeft);
                })
                .finally(() => {
                    // console.log(`Connect attempt finished for ${isLeft ? 'L' : 'R'}.`);
                    this.setConnectingState(isLeft, false);
                });
            hidDevice.on('error', (err: Error) => {
                hidDevice?.removeListener('close', closedHandler);
                // console.error(`HID Error (${path}, ${isLeft ? 'L' : 'R'}):`, err.message);
                if (/(read|write|find|found|open|close)/i.test(err.message)) {
                    // console.log(`Assuming disconnection due to error for ${isLeft ? 'L' : 'R'}`);
                    this.closeJoyCon(isLeft);
                }
                this.setConnectingState(isLeft, false);
            });
        } catch (err: unknown) {
            // const message = err instanceof Error ? err.message : String(err);
            // console.error(`Connection failed (${path}):`, message);
            void err;
            this.closeHidDevice(hidDevice);
            this.setConnectingState(isLeft, false);
        }
    }

    /**
     * 全ての Joy-Con に接続を試行する。
     */
    connectAll(): void {
        void this.scheduleScan(true);
    }


    /**
     * Joy-Con のバッテリー状態を要求する。
     * @param isLeft 左 Joy-Con かどうか
     */
    requestBatteryStatus(isLeft: boolean): void {
        const hidDevice = isLeft ? this.hidL : this.hidR;
        if (hidDevice) {
            // console.log(`[JoyConManager] Requesting battery status for ${isLeft ? 'L' : 'R'} Joy-Con...`);
            const packetNumber = isLeft ? this.globalPacketNumberL : this.globalPacketNumberR;
            // Subcommand 0x50: Request Device Info, which includes battery data in its response (0x21 report type)
            const command = [0x01, packetNumber, 0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40, 0x50];
            this.sendCommand(hidDevice, command, isLeft);
        }
    }

    /**
     * 再接続が必要な場合だけ非同期に探索し、電池情報を更新する。
     * @returns 探索と接続試行開始までの完了通知
     */
    scanDevices(): Promise<void> {
        return this.scheduleScan(false);
    }

    /**
     * 探索の重複を防ぎ、探索中の手動接続要求は終了後に再評価する。
     * @param force 自動接続設定に関係なく手動接続を試行するか
     * @returns 処理の完了通知
     */
    private scheduleScan(force: boolean): Promise<void> {
        if (this.scanPromise) {
            const generation = this.scanGeneration;
            return force ? this.scanPromise.then((): Promise<void> | void => {
                if (generation === this.scanGeneration) return this.scheduleScan(true);
            }) : this.scanPromise;
        }
        this.scanPromise = this.performScan(force, this.scanGeneration).finally((): void => {
            this.scanPromise = null;
        });
        return this.scanPromise;
    }

    /**
     * 非同期探索の結果を最新の接続状態・自動接続設定に照らして適用する。
     * @param force 手動接続要求か
     * @param generation 停止による古い探索結果の無効化番号
     * @returns 電池情報更新と接続試行開始までの完了通知
     */
    private async performScan(force: boolean, generation: number): Promise<void> {
        const timestampMs = Date.now();
        const scanStarted = performance.now();
        const needsLeft = !this.hidL && !this.connectingL && (force || this.autoConnectL);
        const needsRight = !this.hidR && !this.connectingR && (force || this.autoConnectR);
        const discoverySkipped = !needsLeft && !needsRight;
        const paths = discoverySkipped ? { joyconLPath: null, joyconRPath: null } : await findJoyConPaths();
        const discoveryDurationMs = discoverySkipped ? 0 : performance.now() - scanStarted;
        if (generation !== this.scanGeneration) return;
        let batteryDurationMs = 0;

        // Handle Left Joy-Con
        if (this.hidL) {
            // console.log('[Debug] Left Joy-Con is connected. Requesting battery status.');
            const batteryStarted = performance.now();
            this.requestBatteryStatus(true);
            batteryDurationMs += performance.now() - batteryStarted;
        } else if (needsLeft && shouldAttemptAutoConnect(paths.joyconLPath, false, force || this.autoConnectL)) {
            // console.log('[Debug] Found disconnected Left Joy-Con. Attempting to connect.');
            this.connectJoyCon(paths.joyconLPath, true);
        }

        // Handle Right Joy-Con
        if (this.hidR) {
            // console.log('[Debug] Right Joy-Con is connected. Requesting battery status.');
            const batteryStarted = performance.now();
            this.requestBatteryStatus(false);
            batteryDurationMs += performance.now() - batteryStarted;
        } else if (needsRight && shouldAttemptAutoConnect(paths.joyconRPath, false, force || this.autoConnectR)) {
            // console.log('[Debug] Found disconnected Right Joy-Con. Attempting to connect.');
            this.connectJoyCon(paths.joyconRPath, false);
        }
        const durationMs = performance.now() - scanStarted;
        appendRuntimeTrace({ kind: 'device-scan', timestampMs, durationMs, discoveryDurationMs, batteryDurationMs, discoverySkipped });
    }

    /**
     * Joy-Con の電源を切るコマンドを送信して切断する。
     * @param isLeft 左 Joy-Con かどうか
     */
    shutdownJoyCon(isLeft: boolean): void {
        const hidDevice = isLeft ? this.hidL : this.hidR;
        if (hidDevice) {
            // console.log(`[JoyConManager] Shutting down and powering off ${isLeft ? 'L' : 'R'} Joy-Con...`);
            const packetNumber = isLeft ? this.globalPacketNumberL : this.globalPacketNumberR;
            // Subcommand 0x06: Set ship mode (power off)
            const command = [0x01, packetNumber, 0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40, 0x06];
            this.sendCommand(hidDevice, command, isLeft);
            
            // Wait slightly for command to send then close
            setTimeout(() => {
                this.closeJoyCon(isLeft);
            }, 200);
        }
        
        // Disable auto-reconnect until manual re-enable
        if (isLeft) this.autoConnectL = false;
        else this.autoConnectR = false;
    }

    /**
     * デバイススキャンを開始する（初回接続を含む）。
     */
    startScanningAndConnect(): void {
        if (this.scanTimer) {
            // console.log('Device scanner already running.');
            return;
        }
        // console.log(`Starting device scan and initial connection (Interval: ${this.scanIntervalMs}ms)`);
        this.connectAll();
        this.scanTimer = setInterval(() => {
            void this.scanDevices();
        }, this.scanIntervalMs);
    }

    /**
     * デバイススキャンを停止する。
     */
    stopScanning(): void {
        this.scanGeneration++;
        if (this.scanTimer) {
            // console.log('Stopping device scan.');
            clearInterval(this.scanTimer); this.scanTimer = null;
        }
    }

    /**
     * 受信データを解析し、IMUデータ（加速度・ジャイロ）とボタンイベントを発行する。
     * @param hidDevice 受信元の HID デバイス
     * @param data 受信データ
     * @param isLeft 左 Joy-Con かどうか
     */
    parseJoyConData(hidDevice: HID.HID, data: Buffer, isLeft: boolean): void {
        void hidDevice;
        const reportId = data[0];
        const reportKind = classifyJoyConReport(reportId);

        if (reportKind === 'subcommand-reply') {
            // console.log(`[Debug] Received 0x21 report from ${isLeft ? 'L' : 'R'}:`, data);
            void data;
            // 0x21 reports are subcommand replies, currently not used for battery
            return;
        }

        if (!canParseStandardInputReport(reportId, data.length)) {
            return;
        }

        try {
            const lastButtonState = isLeft ? this.lastButtonStateL : this.lastButtonStateR;
            const parsed = parseStandardInputReport(data, isLeft, lastButtonState);

            this.emit('battery-status-update', { isLeft, level: parsed.batteryLevel });
            this.emit('imu-data', {
                id: parsed.cursorId,
                accel: parsed.imu.accel,
                gyro: parsed.imu.gyro,
            });

            parsed.buttonEvents.forEach((event: JoyConButtonEvent): void => {
                // if (event.name === 'r-stick-pressed') {
                //     console.log(`[JoyConManager] Emitting r-stick-pressed for ${parsed.cursorId}`);
                // }
                if (event.payload === undefined) {
                    this.emit(event.name);
                    return;
                }
                this.emit(event.name, event.payload);
            });

            Object.assign(lastButtonState, parsed.nextButtonState);

            if (parsed.analog) {
                this.emit('r-stick-analog', parsed.analog);
            }
        } catch (e) {
            // console.error(`[${isLeft ? 'L' : 'R'}] Parse Error:`, e);
            void e;
        }
    }
}
