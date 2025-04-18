// joycon.js
// Joy-Conの接続、初期化、データ解析を行い、イベントを発行するモジュール
// ★イベント名をシンプルなものに統一★

const HID = require('node-hid');
const { EventEmitter } = require('events'); // Node.js 標準のイベントモジュール

const VENDOR_ID = 1406;
const PRODUCT_ID_L = 8198;
const PRODUCT_ID_R = 8199;
const DEFAULT_SCAN_INTERVAL = 5000; // デバイススキャン間隔 (ミリ秒)

class JoyConManager extends EventEmitter {
    constructor(scanIntervalMs = DEFAULT_SCAN_INTERVAL) {
        super();
        this.hidL = null; this.hidR = null;
        this.globalPacketNumberL = 0; this.globalPacketNumberR = 0;
        this.lastButtonStateL = this.resetButtonState();
        this.lastButtonStateR = this.resetButtonState();
        this.scanIntervalMs = scanIntervalMs;
        this.scanTimer = null;
        this.connectingL = false; this.connectingR = false;
    }

    /** ボタン状態を初期化 */
    resetButtonState() {
        return { slPressed: false, downPressed: false, leftPressed: false, rightPressed: false, xPressed: false, aPressed: false, yPressed: false };
    }

    /** Joy-Conデバイスのパスを検索 */
    findJoyCons() {
        try {
            if (!HID || typeof HID.devices !== 'function') { throw new Error("node-hid not available"); }
            const devices = HID.devices(); let joyconLPath = null; let joyconRPath = null;
            devices.forEach(device => { if (device.vendorId === VENDOR_ID) { if (device.productId === PRODUCT_ID_L) joyconLPath = device.path; else if (device.productId === PRODUCT_ID_R) joyconRPath = device.path; } });
            return { joyconLPath, joyconRPath };
        } catch (error) { console.error("Error finding HID devices:", error); return { joyconLPath: null, joyconRPath: null }; }
    }

    /** コマンドをJoy-Conに送信 */
    sendCommand(hidDevice, commandBytes, isLeft) {
        if (!hidDevice) return false;
        try {
            hidDevice.write(commandBytes);
            if (isLeft) this.globalPacketNumberL = (this.globalPacketNumberL + 1) & 0x0f; else this.globalPacketNumberR = (this.globalPacketNumberR + 1) & 0x0f;
            return true;
        } catch (e) { console.error(`SendCommand Error (${isLeft ? 'L' : 'R'}):`, e); this.closeJoyCon(isLeft); return false; }
    }

    /** Joy-Conを初期化 */
    async initializeJoyCon(hidDevice, isLeft) {
        const packetNumber = () => isLeft ? this.globalPacketNumberL : this.globalPacketNumberR;
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        console.log(`Initializing ${isLeft ? 'L' : 'R'} Joy-Con...`);
        try {
            const commands = [ /* ... 初期化コマンド ... */
                [0x01, 0, 0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40, 0x03, 0x30],
                [0x01, 0, 0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40, 0x40, 0x01],
                [0x01, 0, 0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40, 0x30, isLeft ? 0x01 : 0x02]
            ];
            for (const cmd of commands) { const currentPacketNumber = packetNumber(); cmd[1] = currentPacketNumber; if (!this.sendCommand(hidDevice, cmd, isLeft)) throw new Error(`Cmd failed: 0x${cmd[10].toString(16)}`); await delay(100); }
            console.log(`Initialization ${isLeft ? 'L' : 'R'} OK.`); return true;
        } catch (error) { console.error(`Initialization Error (${isLeft ? 'L' : 'R'}):`, error); return false; }
    }

    /** HIDデバイスを安全に閉じる */
    closeHidDevice(hidDevice) { if (hidDevice) { try { hidDevice.removeAllListeners('data'); hidDevice.removeAllListeners('error'); hidDevice.close(); console.log("HID device closed."); } catch (e) { console.error("Close HID Error:", e); } } }

    /** 指定されたJoy-Con接続を閉じる */
    closeJoyCon(isLeft) {
        const targetHid = isLeft ? this.hidL : this.hidR;
        const wasConnected = !!targetHid;
        if (targetHid) { console.log(`Closing ${isLeft ? 'L' : 'R'} Joy-Con...`); this.closeHidDevice(targetHid); }
        if (isLeft) { this.hidL = null; this.lastButtonStateL = this.resetButtonState(); this.connectingL = false; }
        else { this.hidR = null; this.lastButtonStateR = this.resetButtonState(); this.connectingR = false; }
        if (wasConnected) { console.log(`Joy-Con ${isLeft ? 'L' : 'R'} disconnected.`); this.emit('status-update', { leftConnected: !!this.hidL, rightConnected: !!this.hidR }); } // ★イベント名: status-update★
    }

     /** 全てのJoy-Con接続を閉じ、スキャンも停止する */
    closeAll() { this.stopScanning(); this.closeJoyCon(true); this.closeJoyCon(false); }

    /** Joy-Conに接続し初期化 */
    connectJoyCon(path, isLeft) {
        if (!path) return;
        if ((isLeft && (this.hidL || this.connectingL)) || (!isLeft && (this.hidR || this.connectingR))) { return; }
        let hidDevice = null;
        try {
            if (isLeft) this.connectingL = true; else this.connectingR = true;
            console.log(`Connecting to ${isLeft ? 'L' : 'R'} Joy-Con: ${path}`);
            hidDevice = new HID.HID(path);
            console.log(`Connected (${isLeft ? 'L' : 'R'}). Initializing...`);
            let isDeviceClosed = false; const closedHandler = () => { isDeviceClosed = true; }; hidDevice.once('close', closedHandler);
            this.initializeJoyCon(hidDevice, isLeft).then(success => {
                hidDevice?.removeListener('close', closedHandler);
                if (success && hidDevice && !isDeviceClosed) {
                    hidDevice.on('data', (data) => { this.parseJoyConData(hidDevice, data, isLeft); });
                    console.log(`Listener attached (${isLeft ? 'L' : 'R'}).`);
                    if (isLeft) this.hidL = hidDevice; else this.hidR = hidDevice;
                    this.emit('status-update', { leftConnected: !!this.hidL, rightConnected: !!this.hidR }); // ★イベント名: status-update★
                } else {
                    console.error(`Init failed or device closed during init (${isLeft ? 'L' : 'R'}).`);
                    this.closeHidDevice(hidDevice); this.closeJoyCon(isLeft);
                }
            }).catch(initError => {
                 hidDevice?.removeListener('close', closedHandler); console.error(`Async Init Error (${isLeft ? 'L' : 'R'}):`, initError);
                 this.closeHidDevice(hidDevice); this.closeJoyCon(isLeft);
            }).finally(() => {
                 console.log(`Connect attempt finished for ${isLeft ? 'L' : 'R'}.`); if (isLeft) this.connectingL = false; else this.connectingR = false;
            });
            hidDevice.on('error', (err) => {
                hidDevice?.removeListener('close', closedHandler); console.error(`HID Error (${path}, ${isLeft ? 'L' : 'R'}):`, err.message);
                if (/(read|write|find|found|open|close)/i.test(err.message)) { console.log(`Assuming disconnection due to error for ${isLeft ? 'L' : 'R'}`); this.closeJoyCon(isLeft); }
                if (isLeft) this.connectingL = false; else this.connectingR = false;
            });
        } catch (err) { console.error(`Connection failed (${path}):`, err.message); this.closeHidDevice(hidDevice); if (isLeft) this.connectingL = false; else this.connectingR = false; }
    }

    /** 全てのJoy-Conに接続試行 */
    connectAll() { console.log("Attempting to connect all available Joy-Cons..."); const { joyconLPath, joyconRPath } = this.findJoyCons(); this.connectJoyCon(joyconLPath, true); this.connectJoyCon(joyconRPath, false); }

    /** 定期的にデバイスをスキャンして未接続のJoy-Conに接続試行 */
    scanDevices() { const { joyconLPath, joyconRPath } = this.findJoyCons(); if (joyconLPath) this.connectJoyCon(joyconLPath, true); if (joyconRPath) this.connectJoyCon(joyconRPath, false); }

    /** デバイススキャンを開始 (初回接続含む) */
    startScanningAndConnect() { if (this.scanTimer) { console.log("Device scanner already running."); return; } console.log(`Starting device scan and initial connection (Interval: ${this.scanIntervalMs}ms)`); this.connectAll(); this.scanTimer = setInterval(() => { this.scanDevices(); }, this.scanIntervalMs); }

    /** デバイススキャンを停止 */
    stopScanning() { if (this.scanTimer) { console.log("Stopping device scan."); clearInterval(this.scanTimer); this.scanTimer = null; } }

    /** 受信データを解析し、イベントを発行 (★イベント名をシンプルに★) */
    parseJoyConData(hidDevice, data, isLeft) {
        const reportId = data[0];
        if (reportId === 0x30 && data.length >= 25) { // 標準フルレポート想定
             try {
                 // ジャイロデータ
                 const gyroX = data.readInt16LE(19); const gyroY = data.readInt16LE(21); const gyroZ = data.readInt16LE(23);
                 const cursorId = isLeft ? 'cursor1' : 'cursor2';
                 this.emit('gyro', { id: cursorId, x: gyroX, y: gyroY, z: gyroZ }); // ★イベント名: gyro★

                 // ボタンデータ
                 const SL_BUTTON_MASK = 0x20;
                 let buttonByteIndex = isLeft ? 5 : 3;
                 let lastButtonState = isLeft ? this.lastButtonStateL : this.lastButtonStateR;

                 if (data.length > buttonByteIndex) {
                     const buttonByte = data[buttonByteIndex];

                     // SL ボタン (押下瞬間イベント)
                     const currentSlPressed = (buttonByte & SL_BUTTON_MASK) !== 0;
                     if (currentSlPressed && !lastButtonState.slPressed) { this.emit('button-sl', { id: cursorId }); } // ★イベント名: button-sl★
                     lastButtonState.slPressed = currentSlPressed;

                     if (isLeft) { // 左 Joy-Con
                         const DOWN_BUTTON_MASK = 0x01; const LEFT_BUTTON_MASK = 0x08; const RIGHT_BUTTON_MASK = 0x04;
                         const currentDownPressed = (buttonByte & DOWN_BUTTON_MASK) !== 0;
                         const currentLeftPressed = (buttonByte & LEFT_BUTTON_MASK) !== 0;
                         const currentRightPressed = (buttonByte & RIGHT_BUTTON_MASK) !== 0;

                         this.emit('button-down', { pressed: currentDownPressed }); // ★イベント名: button-down★
                         if (currentDownPressed && !lastButtonState.downPressed) { this.emit('button-down-pressed', { id: cursorId }); } // ★イベント名: button-down-pressed★
                         if (currentLeftPressed && !lastButtonState.leftPressed) { this.emit('ppt-next'); } // PPT操作イベント
                         if (currentRightPressed && !lastButtonState.rightPressed) { this.emit('ppt-prev'); } // PPT操作イベント

                         lastButtonState.downPressed = currentDownPressed; lastButtonState.leftPressed = currentLeftPressed; lastButtonState.rightPressed = currentRightPressed;
                     } else { // 右 Joy-Con
                         const X_BUTTON_MASK = 0x02; const A_BUTTON_MASK = 0x08; const Y_BUTTON_MASK = 0x01;
                         const currentXPressed = (buttonByte & X_BUTTON_MASK) !== 0;
                         const currentAPressed = (buttonByte & A_BUTTON_MASK) !== 0;
                         const currentYPressed = (buttonByte & Y_BUTTON_MASK) !== 0;

                         this.emit('button-x', { pressed: currentXPressed }); // ★イベント名: button-x★
                         if (currentXPressed && !lastButtonState.xPressed) { this.emit('button-x-pressed', { id: cursorId }); } // ★イベント名: button-x-pressed★
                         if (currentAPressed && !lastButtonState.aPressed) { this.emit('ppt-next'); } // PPT操作イベント
                         if (currentYPressed && !lastButtonState.yPressed) { this.emit('ppt-prev'); } // PPT操作イベント

                         lastButtonState.xPressed = currentXPressed; lastButtonState.aPressed = currentAPressed; lastButtonState.yPressed = currentYPressed;
                     }
                 }
             } catch (e) { console.error(`[${isLeft ? 'L' : 'R'}] Parse Error:`, e); }
        }
    }
}

// クラスをエクスポート
module.exports = JoyConManager;
