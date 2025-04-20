// imu-processor.js
// IMUデータから姿勢を推定し、関連イベントを発行するモジュール

const { performance } = require('perf_hooks');
const { EventEmitter } = require('events');

// --- 定数 ---
const M_PI = Math.PI;
const RAD_TO_DEG = 180 / M_PI;
const DEG_TO_RAD = M_PI / 180;

// ★仮のスケールファクター (要調整！)★
const ACCEL_SCALE_G = 1 / 16384;
const GYRO_SCALE_DPS = 2000 / 32768;

class IMUProcessor extends EventEmitter {
    // ★ EventEmitter継承 ★
    constructor(alpha = 0.95) {
        // デフォルトのalpha値
        super(); // ★ 親クラスのコンストラクタ呼び出し ★
        this.states = {
            cursor1: this.createInitialState(alpha),
            cursor2: this.createInitialState(alpha),
        };

        // ★ 直近の生ジャイロデータを保持するオブジェクト ★
        this.lastRawGyro = {
            cursor1: { x: 0, y: 0, z: 0 },
            cursor2: { x: 0, y: 0, z: 0 },
        };

        // ★ キャリブレーション用状態を追加 ★
        this.isCalibrating = { cursor1: false, cursor2: false };
        this.calibrationData = { cursor1: { x: [], y: [], z: [] }, cursor2: { x: [], y: [], z: [] } };

        console.log('[IMUProcessor] Initialized.');
    }

    /** センサー状態の初期オブジェクトを作成 */
    createInitialState(alpha) {
        return {
            pitch: 0,
            roll: 0,
            yaw: 0, // 推定角度 (degree)
            pitchOffset: 0,
            rollOffset: 0,
            yawOffset: 0, // リセンター用オフセット (degree)
            lastTimestamp: 0, // 前回の処理時刻 (ms)
            alpha: alpha, // 相補フィルター係数
            gyroBiasX: 0,
            gyroBiasY: 0,
            gyroBiasZ: 0, // ジャイロバイアス (raw LSB)
        };
    }

    /**
     * IMUデータで姿勢を更新し、'attitude-update'イベントを発行する
     * @param {object} imuData - { id: string, accel: {x, y, z}, gyro: {x, y, z} }
     */
    update(imuData) {
        const state = this.states[imuData.id];
        if (!state) {
            console.warn(`[IMUProcessor] No state for ${imuData.id}`);
            return;
        }

        // ★直近の生ジャイロデータを保存 (キャリブレーション用)★
        this.lastRawGyro[imuData.id] = { x: imuData.gyro.x, y: imuData.gyro.y, z: imuData.gyro.z };

        const now = performance.now();
        const dt = state.lastTimestamp > 0 && now - state.lastTimestamp < 1000 ? (now - state.lastTimestamp) / 1000.0 : 0.0166; // s
        state.lastTimestamp = now;
        if (dt <= 0 || Number.isNaN(dt)) {
            console.warn(`[${imuData.id}] Invalid dt: ${dt}.`);
            return;
        }

        // ★ キャリブレーション中の処理 ★
        if (this.isCalibrating[imuData.id]) {
            // 生のジャイロデータを蓄積
            this.calibrationData[imuData.id].x.push(imuData.gyro.x);
            this.calibrationData[imuData.id].y.push(imuData.gyro.y);
            this.calibrationData[imuData.id].z.push(imuData.gyro.z);
            return; // キャリブレーション中は姿勢計算・イベント発行をスキップ
        }

        // 1. バイアス除去
        const biasX = typeof state.gyroBiasX === 'number' && !Number.isNaN(state.gyroBiasX) ? state.gyroBiasX : 0;
        const biasY = typeof state.gyroBiasY === 'number' && !Number.isNaN(state.gyroBiasY) ? state.gyroBiasY : 0;
        const biasZ = typeof state.gyroBiasZ === 'number' && !Number.isNaN(state.gyroBiasZ) ? state.gyroBiasZ : 0;
        const gx_raw_cal = imuData.gyro.x - biasX;
        const gy_raw_cal = imuData.gyro.y - biasY;
        const gz_raw_cal = imuData.gyro.z - biasZ;
        if ([gx_raw_cal, gy_raw_cal, gz_raw_cal].some(Number.isNaN)) {
            console.error(`[${imuData.id}] NaN gyro after bias removal`);
            return;
        }

        // 2. 物理単位への変換
        const ax = imuData.accel.x * ACCEL_SCALE_G;
        const ay = imuData.accel.y * ACCEL_SCALE_G;
        const az = imuData.accel.z * ACCEL_SCALE_G; // G
        const gx = gx_raw_cal * GYRO_SCALE_DPS; // Yaw Rate (deg/sec)
        const gy = gy_raw_cal * GYRO_SCALE_DPS; // Pitch Rate (deg/sec)
        const gz = gz_raw_cal * GYRO_SCALE_DPS; // Roll Rate (deg/sec)
        if ([ax, ay, az, gx, gy, gz].some(Number.isNaN)) {
            console.error(`[${imuData.id}] NaN after unit conversion`);
            return;
        }

        // 3. 加速度から角度を計算 (★要検証/調整★)
        let pitchAcc = Number.isNaN(state.pitch) ? 0 : state.pitch;
        let rollAcc = Number.isNaN(state.roll) ? 0 : state.roll;
        const accelMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);
        if (!Number.isNaN(accelMagnitude) && accelMagnitude > 0.8 && accelMagnitude < 1.2) {
            if (!Number.isNaN(ay) && !Number.isNaN(ax) && (ax !== 0 || ay !== 0)) {
                rollAcc = Math.atan2(ay, ax) * RAD_TO_DEG;
                if (Number.isNaN(rollAcc)) rollAcc = Number.isNaN(state.roll) ? 0 : state.roll;
            }
            if (!Number.isNaN(ax) && !Number.isNaN(az) && (ax !== 0 || az !== 0)) {
                pitchAcc = Math.atan2(-ax, az) * RAD_TO_DEG;
                if (Number.isNaN(pitchAcc)) pitchAcc = Number.isNaN(state.pitch) ? 0 : state.pitch;
            }
        }
        if (Number.isNaN(rollAcc)) rollAcc = 0;
        if (Number.isNaN(pitchAcc)) pitchAcc = 0;

        // 4. ジャイロから角度変化を計算 (★ユーザー確認済みの軸割り当て★)
        const rollGyroDelta = gz * dt;
        const pitchGyroDelta = gy * dt;
        const yawGyroDelta = gx * dt;
        if ([rollGyroDelta, pitchGyroDelta, yawGyroDelta].some(Number.isNaN)) {
            console.error(`[${imuData.id}] NaN gyro delta`);
            return;
        }

        // 5. 相補フィルター
        const previousPitch = Number.isNaN(state.pitch) ? state.pitchOffset : state.pitch;
        const previousRoll = Number.isNaN(state.roll) ? state.rollOffset : state.roll;
        const alpha = state.alpha;
        if ([alpha, previousPitch, pitchGyroDelta, pitchAcc, previousRoll, rollGyroDelta, rollAcc].some(Number.isNaN)) {
            console.error(`[${imuData.id}] NaN BEFORE filter calc!`);
            state.pitch = state.pitchOffset;
            state.roll = state.rollOffset;
        } else {
            state.roll = alpha * (previousRoll + rollGyroDelta) + (1 - alpha) * rollAcc;
            state.pitch = alpha * (previousPitch + pitchGyroDelta) + (1 - alpha) * pitchAcc;
            state.yaw += yawGyroDelta;
        }
        if (Number.isNaN(state.pitch) || Number.isNaN(state.roll)) {
            console.error(`[${imuData.id}] NaN AFTER filter!`);
            state.pitch = state.pitchOffset;
            state.roll = state.rollOffset;
        }

        // 6. リセンターオフセット適用
        const finalRoll = state.roll - state.rollOffset;
        const finalPitch = state.pitch - state.pitchOffset;

        // ★ 7. 計算結果をイベントで発行 ★
        this.emit('attitude-update', {
            id: imuData.id,
            roll: finalRoll,
            pitch: finalPitch,
        });
    }

    /** 姿勢の基準点をリセット (現在の角度をオフセットとする) */
    recenter(id) {
        const state = this.states[id];
        if (state) {
            console.log(`[IMUProcessor] Re-centering orientation for ${id}`);
            state.pitchOffset = state.pitch;
            state.rollOffset = state.roll;
            state.yawOffset = state.yaw;
        } else {
            console.warn(`[IMUProcessor] Cannot recenter: State not found for ${id}`);
        }
    }

    /** ★ ジャイロキャリブレーションを開始 ★ */
    startGyroCalibration(id, durationMs = 2000) {
        // デフォルト2秒間計測
        const state = this.states[id];
        if (!state || this.isCalibrating[id]) {
            console.warn(`[IMUProcessor] Calibration busy or state not found for ${id}.`);
            return;
        }
        console.log(`[IMUProcessor] Starting gyro calibration for ${id} (${durationMs}ms)...`);
        this.isCalibrating[id] = true;
        this.calibrationData[id] = { x: [], y: [], z: [] }; // データリセット
        // ★キャリブレーション開始を通知 (main.jsが受け取る)★
        this.emit('calibration-status', { id: id, status: 'started' });

        // 指定時間後にキャリブレーションを終了するタイマー
        setTimeout(() => {
            this.finishGyroCalibration(id);
        }, durationMs);
    }

    /** ★ キャリブレーションを終了しバイアスを計算・設定 ★ */
    finishGyroCalibration(id) {
        const state = this.states[id];
        const data = this.calibrationData[id];
        if (!state || !this.isCalibrating[id]) return; // 既に終了しているか対象外

        console.log(`[IMUProcessor] Finishing gyro calibration for ${id}. Samples gathered: ${data.x.length}`);
        this.isCalibrating[id] = false;

        let resultStatus = 'aborted';
        let finalBias = null;

        // 十分なサンプル数が得られたか確認
        if (data.x.length > 10) {
            // 例: 最低10サンプル
            // 平均値を計算
            const avgX = data.x.reduce((a, b) => a + b, 0) / data.x.length;
            const avgY = data.y.reduce((a, b) => a + b, 0) / data.y.length;
            const avgZ = data.z.reduce((a, b) => a + b, 0) / data.z.length;

            // 新しいバイアスを設定 (整数に丸める)
            state.gyroBiasX = Math.round(avgX);
            state.gyroBiasY = Math.round(avgY);
            state.gyroBiasZ = Math.round(avgZ);

            finalBias = { x: state.gyroBiasX, y: state.gyroBiasY, z: state.gyroBiasZ };
            resultStatus = 'complete';
            console.log(
                `[IMUProcessor] Calibration complete for ${id}. New Bias (Raw): X=${state.gyroBiasX}, Y=${state.gyroBiasY}, Z=${state.gyroBiasZ}`
            );
        } else {
            console.warn(`[IMUProcessor] Not enough samples for calibration (${data.x.length}). Calibration aborted.`);
        }

        // ★キャリブレーション完了/中止を通知★
        this.emit('calibration-status', { id: id, status: resultStatus, bias: finalBias });
    }

    /** ジャイロバイアスを簡易キャリブレーション (内部保持の最新値を使用) */
    calibrate(id) {
        const state = this.states[id];
        const rawGyro = this.lastRawGyro[id]; // ★内部で保持している最新値を使う★
        if (state && rawGyro) {
            console.log(`[IMUProcessor] Simple calibrating gyro bias for ${id}`);
            state.gyroBiasX = rawGyro.x;
            state.gyroBiasY = rawGyro.y;
            state.gyroBiasZ = rawGyro.z;
            console.log(`  -> New Gyro Bias (Raw): X=${state.gyroBiasX}, Y=${state.gyroBiasY}, Z=${state.gyroBiasZ}`);
        } else {
            console.warn(`[IMUProcessor] Cannot calibrate: State or lastRawGyro not valid for ${id}`);
        }
    }
}

// クラスのインスタンスをエクスポート (シングルトン)
module.exports = new IMUProcessor();
