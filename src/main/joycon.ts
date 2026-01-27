// joycon.ts
// Joy-Conの接続、初期化、データ解析を行い、イベントを発行するモジュール
// ★イベント名をシンプルなものに統一★

import HID from 'node-hid';
import { EventEmitter } from 'events';

const VENDOR_ID = 1406;
const PRODUCT_ID_L = 8198;
const PRODUCT_ID_R = 8199;
const DEFAULT_SCAN_INTERVAL = 5000; // デバイススキャン間隔 (ミリ秒)

interface ButtonState {
    slPressed: boolean;
    srPressed: boolean;
    downPressed: boolean;
    leftPressed: boolean;
    rightPressed: boolean;
    xPressed: boolean;
    aPressed: boolean;
    yPressed: boolean;
    plusPressed: boolean; // Added for '+' button
    minusPressed: boolean; // Added for '-' button
    rStickPressed: boolean; // Added for Right Joy-Con Stick Press
    homePressed: boolean;
}

interface JoyConPaths {
    joyconLPath: string | null;
    joyconRPath: string | null;
}

export default class JoyConManager extends EventEmitter {
    hidL: HID.HID | null = null;
    hidR: HID.HID | null = null;
    globalPacketNumberL = 0;
    globalPacketNumberR = 0;
    lastButtonStateL: ButtonState;
    lastButtonStateR: ButtonState;
    scanIntervalMs: number;
    scanTimer: NodeJS.Timeout | null = null;
    connectingL = false;
    connectingR = false;
    autoConnectL = true; // Added
    autoConnectR = true; // Added

    constructor(scanIntervalMs: number = DEFAULT_SCAN_INTERVAL) {
        super();
        this.lastButtonStateL = this.resetButtonState();
        this.lastButtonStateR = this.resetButtonState();
        this.scanIntervalMs = scanIntervalMs;
    }

    /** ボタン状態を初期化 */
    resetButtonState(): ButtonState {
        return {
            slPressed: false,
            srPressed: false,
            downPressed: false,
            leftPressed: false,
            rightPressed: false,
            xPressed: false,
            aPressed: false,
            yPressed: false,
            plusPressed: false, // Added for '+' button
            minusPressed: false, // Added for '-' button
            rStickPressed: false, // Added for Right Joy-Con Stick Press
            homePressed: false,
        };
    }

    /** 現在の接続状態を取得 */
    getConnectionStatus() {
        return {
            leftConnected: !!this.hidL,
            rightConnected: !!this.hidR,
        };
    }

    /** Joy-Conデバイスのパスを検索 */
    findJoyCons(): JoyConPaths {
        try {
            if (!HID || typeof HID.devices !== 'function') {
                throw new Error('node-hid not available');
            }
            const devices = HID.devices();
            let joyconLPath: string | null = null;
            let joyconRPath: string | null = null;
            devices.forEach((device: any) => {
                if (device.vendorId === VENDOR_ID) {
                    if (device.productId === PRODUCT_ID_L) {
                        joyconLPath = device.path;
                    } else if (device.productId === PRODUCT_ID_R) {
                        joyconRPath = device.path;
                    }
                }
            });
            return { joyconLPath, joyconRPath };
        } catch (error) {
            console.error('Error finding HID devices:', error);
            return { joyconLPath: null, joyconRPath: null };
        }
    }

    /** コマンドをJoy-Conに送信 */
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
            console.error(`SendCommand Error (${isLeft ? 'L' : 'R'}):`, e);
            this.closeJoyCon(isLeft);
            return false;
        }
    }

    /** Joy-Conを初期化 */
    async initializeJoyCon(hidDevice: HID.HID, isLeft: boolean): Promise<boolean> {
        const packetNumber = () => (isLeft ? this.globalPacketNumberL : this.globalPacketNumberR);
        const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        console.log(`Initializing ${isLeft ? 'L' : 'R'} Joy-Con...`);
        try {
            const commands: number[][] = [
                [0x01, 0, 0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40, 0x03, 0x30],
                [0x01, 0, 0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40, 0x40, 0x01],
                [0x01, 0, 0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40, 0x30, isLeft ? 0x01 : 0x02],
            ];
            for (const cmd of commands) {
                const currentPacketNumber = packetNumber();
                cmd[1] = currentPacketNumber;
                if (!this.sendCommand(hidDevice, cmd, isLeft)) {
                    throw new Error(`Cmd failed: 0x${cmd[10].toString(16)}`);
                }
                await delay(100);
            }
            console.log(`Initialization ${isLeft ? 'L' : 'R'} OK.`);
            return true;
        } catch (error) {
            console.error(`Initialization Error (${isLeft ? 'L' : 'R'}):`, error);
            return false;
        }
    }

    /** HIDデバイスを安全に閉じる */
    closeHidDevice(hidDevice: HID.HID | null): void {
        if (hidDevice) {
            try {
                hidDevice.removeAllListeners('data');
                hidDevice.removeAllListeners('error');
                hidDevice.close();
                console.log('HID device closed.');
            } catch (e) {
                console.error('Close HID Error:', e);
            }
        }
    }

    /** 指定されたJoy-Con接続を閉じる */
    closeJoyCon(isLeft: boolean): void {
        const targetHid = isLeft ? this.hidL : this.hidR;
        const wasConnected = !!targetHid;
        if (targetHid) {
            console.log(`Closing ${isLeft ? 'L' : 'R'} Joy-Con...`);
            this.closeHidDevice(targetHid);
        }
        if (isLeft) {
            this.hidL = null;
            this.lastButtonStateL = this.resetButtonState();
            this.connectingL = false;
        } else {
            this.hidR = null;
            this.lastButtonStateR = this.resetButtonState();
            this.connectingR = false;
        }
        if (wasConnected) {
            console.log(`Joy-Con ${isLeft ? 'L' : 'R'} disconnected.`);
            this.emit('status-update', { leftConnected: !!this.hidL, rightConnected: !!this.hidR });
        }
    }

    /** 全てのJoy-Con接続を閉じ、スキャンも停止する */
    closeAll(): void {
        this.stopScanning();
        this.closeJoyCon(true);
        this.closeJoyCon(false);
    }

    /** Joy-Conに接続し初期化 */
    connectJoyCon(path: string | null, isLeft: boolean): void {
        if (!path) return;
        if ((isLeft && (this.hidL || this.connectingL)) || (!isLeft && (this.hidR || this.connectingR))) {
            return;
        }
        let hidDevice: HID.HID | null = null;
        try {
            if (isLeft) {
                this.connectingL = true;
            } else {
                this.connectingR = true;
            }
            console.log(`Connecting to ${isLeft ? 'L' : 'R'} Joy-Con: ${path}`);
            hidDevice = new HID.HID(path);
            console.log(`Connected (${isLeft ? 'L' : 'R'}). Initializing...`);

            let isDeviceClosed = false;
            const closedHandler = () => {
                isDeviceClosed = true;
            };
            hidDevice.once('close', closedHandler);
            this.initializeJoyCon(hidDevice, isLeft)
                .then((success) => {
                    hidDevice?.removeListener('close', closedHandler);
                    if (success && hidDevice && !isDeviceClosed) {
                        hidDevice.on('data', (data: Buffer) => {
                            this.parseJoyConData(hidDevice as HID.HID, data, isLeft);
                        });
                        console.log(`Listener attached (${isLeft ? 'L' : 'R'}).`);
                        if (isLeft) {
                            this.hidL = hidDevice;
                        } else {
                            this.hidR = hidDevice;
                        }
                        this.emit('status-update', { leftConnected: !!this.hidL, rightConnected: !!this.hidR });
                    } else {
                        console.error(`Init failed or device closed during init (${isLeft ? 'L' : 'R'}).`);
                        this.closeHidDevice(hidDevice);
                        this.closeJoyCon(isLeft);
                    }
                })
                .catch((initError) => {
                    hidDevice?.removeListener('close', closedHandler);
                    console.error(`Async Init Error (${isLeft ? 'L' : 'R'}):`, initError);
                    this.closeHidDevice(hidDevice);
                    this.closeJoyCon(isLeft);
                })
                .finally(() => {
                    console.log(`Connect attempt finished for ${isLeft ? 'L' : 'R'}.`);
                    if (isLeft) {
                        this.connectingL = false;
                    } else {
                        this.connectingR = false;
                    }
                });
            hidDevice.on('error', (err: Error) => {
                hidDevice?.removeListener('close', closedHandler);
                console.error(`HID Error (${path}, ${isLeft ? 'L' : 'R'}):`, err.message);
                if (/(read|write|find|found|open|close)/i.test(err.message)) {
                    console.log(`Assuming disconnection due to error for ${isLeft ? 'L' : 'R'}`);
                    this.closeJoyCon(isLeft);
                }
                if (isLeft) {
                    this.connectingL = false;
                } else {
                    this.connectingR = false;
                }
            });
        } catch (err: any) {
            console.error(`Connection failed (${path}):`, err.message);
            this.closeHidDevice(hidDevice);
            if (isLeft) {
                this.connectingL = false;
            } else {
                this.connectingR = false;
            }
        }
    }

    /** 全てのJoy-Conに接続試行 */
    connectAll(): void {
        console.log('Attempting to connect all available Joy-Cons...');
        const { joyconLPath, joyconRPath } = this.findJoyCons();
        this.connectJoyCon(joyconLPath, true);
        this.connectJoyCon(joyconRPath, false);
    }


    /** Joy-Conのバッテリー状態を要求 */
    requestBatteryStatus(isLeft: boolean): void {
        const hidDevice = isLeft ? this.hidL : this.hidR;
        if (hidDevice) {
            console.log(`[JoyConManager] Requesting battery status for ${isLeft ? 'L' : 'R'} Joy-Con...`);
            const packetNumber = isLeft ? this.globalPacketNumberL : this.globalPacketNumberR;
            // Subcommand 0x50: Request Device Info, which includes battery data in its response (0x21 report type)
            const command = [0x01, packetNumber, 0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40, 0x50];
            this.sendCommand(hidDevice, command, isLeft);
        }
    }

    /** 定期的にデバイスをスキャンして未接続のJoy-Conに接続試行 */
    scanDevices(): void {
        console.log('[Debug] scanDevices() called.');
        const { joyconLPath, joyconRPath } = this.findJoyCons();

        // Handle Left Joy-Con
        if (this.hidL) {
            console.log('[Debug] Left Joy-Con is connected. Requesting battery status.');
            this.requestBatteryStatus(true);
        } else if (joyconLPath && this.autoConnectL) { // Check autoConnectL
            console.log('[Debug] Found disconnected Left Joy-Con. Attempting to connect.');
            this.connectJoyCon(joyconLPath, true);
        }

        // Handle Right Joy-Con
        if (this.hidR) {
            console.log('[Debug] Right Joy-Con is connected. Requesting battery status.');
            this.requestBatteryStatus(false);
        } else if (joyconRPath && this.autoConnectR) { // Check autoConnectR
            console.log('[Debug] Found disconnected Right Joy-Con. Attempting to connect.');
            this.connectJoyCon(joyconRPath, false);
        }
    }

    /** Joy-Conの電源を切るコマンドを送信して切断 */
    shutdownJoyCon(isLeft: boolean): void {
        const hidDevice = isLeft ? this.hidL : this.hidR;
        if (hidDevice) {
            console.log(`[JoyConManager] Shutting down and powering off ${isLeft ? 'L' : 'R'} Joy-Con...`);
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

    /** デバイススキャンを開始 (初回接続含む) */
    startScanningAndConnect(): void {
        if (this.scanTimer) {
            console.log('Device scanner already running.');
            return;
        }
        console.log(`Starting device scan and initial connection (Interval: ${this.scanIntervalMs}ms)`);
        this.connectAll();
        this.scanTimer = setInterval(() => {
            this.scanDevices();
        }, this.scanIntervalMs);
    }

    /** デバイススキャンを停止 */
    stopScanning(): void {
        if (this.scanTimer) {
            console.log('Stopping device scan.');
            clearInterval(this.scanTimer);
            this.scanTimer = null;
        }
    }

    /** 受信データを解析し、★IMUデータ(加速度+ジャイロ)★とボタンイベントを発行 */
    parseJoyConData(hidDevice: HID.HID, data: Buffer, isLeft: boolean): void {
        const reportId = data[0];

        if (reportId === 0x21) {
            console.log(`[Debug] Received 0x21 report from ${isLeft ? 'L' : 'R'}:`, data);
            // 0x21 reports are subcommand replies, currently not used for battery
        } else if (reportId === 0x30 && data.length >= 25) {
            try {
                // Extract battery status from byte 2
                const batteryByte = data.readUInt8(2);
                const level = (batteryByte & 0xe0) >> 5; // Bits 7-5: battery level (0-4)
                
                // Emit battery status update
                this.emit('battery-status-update', { isLeft, level });
                
                const cursorId = isLeft ? 'cursorLeft' : 'cursorRight';
                const accelOffsetX = 13;
                const accelOffsetY = 15;
                const accelOffsetZ = 17;
                const gyroOffsetX = 19;
                const gyroOffsetY = 21;
                const gyroOffsetZ = 23;

                const accelX = data.readInt16LE(accelOffsetX);
                const accelY = data.readInt16LE(accelOffsetY);
                const accelZ = data.readInt16LE(accelOffsetZ);
                const gyroX = data.readInt16LE(gyroOffsetX);
                const gyroY = data.readInt16LE(gyroOffsetY);
                const gyroZ = data.readInt16LE(gyroOffsetZ);

                this.emit('imu-data', {
                    id: cursorId,
                    accel: { x: accelX, y: accelY, z: accelZ },
                    gyro: { x: gyroX, y: gyroY, z: gyroZ },
                });

                let buttonByteIndex = isLeft ? 5 : 3;
                let lastButtonState = isLeft ? this.lastButtonStateL : this.lastButtonStateR;

                if (data.length > buttonByteIndex) {
                    const buttonByte = data[buttonByteIndex];
                    const sharedButtonByte = data[4]; // Read data[4] for shared buttons

                    if (isLeft) {
                        const DOWN_BUTTON_MASK = 0x01;
                        const LEFT_BUTTON_MASK = 0x08;
                        const RIGHT_BUTTON_MASK = 0x04;
                        const SR_BUTTON_MASK = 0x10;
                        const MINUS_BUTTON_MASK = 0x01;
                        const currentDownPressed = (buttonByte & DOWN_BUTTON_MASK) !== 0;
                        const currentLeftPressed = (buttonByte & LEFT_BUTTON_MASK) !== 0;
                        const currentRightPressed = (buttonByte & RIGHT_BUTTON_MASK) !== 0;
                        const currentSrPressed = (buttonByte & SR_BUTTON_MASK) !== 0;
                        const currentMinusPressed = (sharedButtonByte & MINUS_BUTTON_MASK) !== 0;

                        this.emit('button-down', { pressed: currentDownPressed });
                        if (currentDownPressed && !lastButtonState.downPressed) {
                            this.emit('button-down-pressed', { id: cursorId });
                        }
                        if (currentLeftPressed && !lastButtonState.leftPressed) {
                            this.emit('ppt-next');
                        }
                        if (currentRightPressed && !lastButtonState.rightPressed) {
                            this.emit('ppt-prev');
                        }
                        this.emit('button-sr', { pressed: currentSrPressed });
                        if (currentSrPressed && !lastButtonState.srPressed) {
                            this.emit('button-sr-pressed', { id: cursorId });
                        }
                        this.emit('button-minus', { pressed: currentMinusPressed });
                        if (currentMinusPressed && !lastButtonState.minusPressed) {
                            this.emit('button-minus-pressed', { id: cursorId });
                        }

                        lastButtonState.downPressed = currentDownPressed;
                        lastButtonState.leftPressed = currentLeftPressed;
                        lastButtonState.rightPressed = currentRightPressed;
                        lastButtonState.srPressed = currentSrPressed;
                        lastButtonState.minusPressed = currentMinusPressed;
                    } else {
                        const X_BUTTON_MASK = 0x02;
                        const A_BUTTON_MASK = 0x08;
                        const Y_BUTTON_MASK = 0x01;
                        const PLUS_BUTTON_MASK = 0x02; // From input_report.ts, StandardButtonType, second byte
                        const MINUS_BUTTON_MASK = 0x01; // From input_report.ts, StandardButtonType, second byte
                        const R_STICK_BUTTON_MASK = 0x04; // From input_report.ts, StandardButtonType, second byte
                        const SR_BUTTON_MASK = 0x10;
                        const HOME_BUTTON_MASK = 0x10;

                        const currentXPressed = (buttonByte & X_BUTTON_MASK) !== 0;
                        const currentAPressed = (buttonByte & A_BUTTON_MASK) !== 0;
                        const currentYPressed = (buttonByte & Y_BUTTON_MASK) !== 0;
                        const currentPlusPressed = (sharedButtonByte & PLUS_BUTTON_MASK) !== 0; // Use sharedButtonByte (data[4])
                        const currentMinusPressed = (sharedButtonByte & MINUS_BUTTON_MASK) !== 0; // Use sharedButtonByte (data[4])
                        const currentRStickPressed = (sharedButtonByte & R_STICK_BUTTON_MASK) !== 0; // Use sharedButtonByte (data[4])
                        const currentSrPressed = (buttonByte & SR_BUTTON_MASK) !== 0;
                        const currentHomePressed = (sharedButtonByte & HOME_BUTTON_MASK) !== 0;

                        this.emit('button-x', { pressed: currentXPressed });
                        if (currentXPressed && !lastButtonState.xPressed) {
                            this.emit('button-x-pressed', { id: cursorId });
                        }
                        if (currentAPressed && !lastButtonState.aPressed) {
                            this.emit('ppt-next');
                        }
                        if (currentYPressed && !lastButtonState.yPressed) {
                            this.emit('ppt-prev');
                        }
                        // Emit events for '+' button
                        this.emit('button-plus', { pressed: currentPlusPressed });
                        if (currentPlusPressed && !lastButtonState.plusPressed) {
                            this.emit('button-plus-pressed', { id: cursorId });
                        }
                        // Emit events for '-' button
                        this.emit('button-minus', { pressed: currentMinusPressed });
                        if (currentMinusPressed && !lastButtonState.minusPressed) {
                            this.emit('button-minus-pressed', { id: cursorId });
                        }
                        // Emit events for SR button
                        this.emit('button-sr', { pressed: currentSrPressed });
                        if (currentSrPressed && !lastButtonState.srPressed) {
                            this.emit('button-sr-pressed', { id: cursorId });
                        }
                        // Emit events for R-stick press
                        this.emit('r-stick', { pressed: currentRStickPressed });
                        if (currentRStickPressed && !lastButtonState.rStickPressed) {
                            console.log(`[JoyConManager] Emitting r-stick-pressed for ${cursorId}`);
                            this.emit('r-stick-pressed', { id: cursorId });
                        }
                        // Emit events for Home button
                        this.emit('button-home', { pressed: currentHomePressed });
                        if (currentHomePressed && !lastButtonState.homePressed) {
                            this.emit('button-home-pressed', { id: cursorId });
                        }

                        lastButtonState.xPressed = currentXPressed;
                        lastButtonState.aPressed = currentAPressed;
                        lastButtonState.yPressed = currentYPressed;
                        lastButtonState.plusPressed = currentPlusPressed; // Update last state
                        lastButtonState.minusPressed = currentMinusPressed; // Update last state
                        lastButtonState.srPressed = currentSrPressed; // Update last state
                        lastButtonState.rStickPressed = currentRStickPressed; // Update last state
                        lastButtonState.homePressed = currentHomePressed; // Update last state
                    }
                }
                // --- Joystick Analog Data ---
                // Right Joy-Con stick data
                if (!isLeft && data.length >= 12) {
                    const b9 = data.readUInt8(9);
                    const b10 = data.readUInt8(10);
                    const b11 = data.readUInt8(11);
                    
                    const stickX = b9 | ((b10 & 0x0f) << 8);
                    const stickY = (b10 >> 4) | (b11 << 4);
                    
                    this.emit('r-stick-analog', { x: stickX, y: stickY });
                }
            } catch (e) {
                console.error(`[${isLeft ? 'L' : 'R'}] Parse Error:`, e);
            }
        }
    }
}
