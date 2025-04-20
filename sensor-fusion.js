// sensor-fusion.js
// IMUデータから姿勢を推定するセンサーフュージョン処理を担当するモジュール

const { performance } = require('perf_hooks'); // 高精度タイマー

// --- 定数 ---
const M_PI = Math.PI;
const RAD_TO_DEG = 180 / M_PI; // ラジアンを度に変換
const DEG_TO_RAD = M_PI / 180; // 度をラジアンに変換

// ★仮のスケールファクター (Joy-Conの仕様やデータ形式によって要調整！)★
const ACCEL_SCALE_G = 1 / 16384; // 例: 1G = 16384 LSBと仮定 -> G単位へ
const GYRO_SCALE_DPS = 2000 / 32768; // 例: 2000dps = 32768 LSBと仮定 -> deg/sec単位へ

class SensorFusionProcessor {
    constructor(alpha = 0.95) { // デフォルトのalpha値を設定
        this.states = {
            cursor1: this.createInitialState(alpha),
            cursor2: this.createInitialState(alpha)
        };
        console.log("[SensorFusion] Processor initialized.");
    }

    /** センサー状態の初期オブジェクトを作成 */
    createInitialState(alpha) {
        return {
            pitch: 0, roll: 0, yaw: 0, // 推定角度 (degree)
            pitchOffset: 0, rollOffset: 0, yawOffset: 0, // リセンター用オフセット (degree)
            lastTimestamp: 0, // 前回の処理時刻 (ms)
            alpha: alpha,     // 相補フィルター係数
            gyroBiasX: 0, gyroBiasY: 0, gyroBiasZ: 0, // ジャイロバイアス (raw LSB)
        };
    }

    /**
     * IMUデータで姿勢を更新し、最終的な角度(オフセット適用済み)を返す
     * @param {object} imuData - { id: string, accel: {x, y, z}, gyro: {x, y, z} }
     * @returns {{roll: number, pitch: number} | null} 計算された角度(度単位) または null
     */
    updateAttitude(imuData) {
        const state = this.states[imuData.id];
        if (!state) {
            console.warn(`[SensorFusion] No state found for id: ${imuData.id}`);
            return null;
        }

        const now = performance.now();
        const dt = (state.lastTimestamp > 0 && (now - state.lastTimestamp < 1000))
            ? (now - state.lastTimestamp) / 1000.0
            : 0.0166; // default dt (approx 60Hz)
        state.lastTimestamp = now;
        if (dt <= 0 || Number.isNaN(dt)) {
            console.warn(`[${imuData.id}] Invalid dt: ${dt}. Skipping calculation.`);
            return null;
        }

        // 1. バイアス除去 (生データに対して行う)
        const gx_raw_cal = imuData.gyro.x - state.gyroBiasX;
        const gy_raw_cal = imuData.gyro.y - state.gyroBiasY;
        const gz_raw_cal = imuData.gyro.z - state.gyroBiasZ;
        if ([gx_raw_cal, gy_raw_cal, gz_raw_cal].some(Number.isNaN)) { console.error(`[${imuData.id}] NaN after bias removal`); return null; }

        // 2. 物理単位への変換
        const ax = imuData.accel.x * ACCEL_SCALE_G; const ay = imuData.accel.y * ACCEL_SCALE_G; const az = imuData.accel.z * ACCEL_SCALE_G;
        const gx = gx_raw_cal * GYRO_SCALE_DPS; const gy = gy_raw_cal * GYRO_SCALE_DPS; const gz = gz_raw_cal * GYRO_SCALE_DPS;
        if ([ax, ay, az, gx, gy, gz].some(Number.isNaN)) { console.error(`[${imuData.id}] NaN after unit conversion`); return null; }

        // 3. 加速度から角度を計算 (★要検証/調整★)
        let pitchAcc = Number.isNaN(state.pitch) ? 0 : state.pitch; let rollAcc = Number.isNaN(state.roll) ? 0 : state.roll;
        const accelMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);
        if (!Number.isNaN(accelMagnitude) && accelMagnitude > 0.8 && accelMagnitude < 1.2) {
            const pitchDenom = Math.sqrt(ay * ay + az * az);
            if (!Number.isNaN(ax) && !Number.isNaN(pitchDenom) && pitchDenom > 1e-6) pitchAcc = Math.atan2(-ax, pitchDenom) * RAD_TO_DEG;
            if (!Number.isNaN(ay) && !Number.isNaN(az)) rollAcc = Math.atan2(ay, az) * RAD_TO_DEG;
            if (Number.isNaN(rollAcc)) rollAcc = Number.isNaN(state.roll) ? 0 : state.roll;
            if (Number.isNaN(pitchAcc)) pitchAcc = Number.isNaN(state.pitch) ? 0 : state.pitch;
        }
        if (Number.isNaN(rollAcc)) rollAcc = 0; if (Number.isNaN(pitchAcc)) pitchAcc = 0;

        // 4. ジャイロから角度変化を計算 (★要検証/調整: 軸割り当て★)
        const rollGyroDelta = gx * dt; const pitchGyroDelta = gy * dt; const yawGyroDelta = gz * dt;
        if ([rollGyroDelta, pitchGyroDelta, yawGyroDelta].some(Number.isNaN)) { console.error(`[${imuData.id}] NaN gyro delta`); return null; }

        // 5. 相補フィルター (★要調整: alpha値★)
        const previousPitch = Number.isNaN(state.pitch) ? state.pitchOffset : state.pitch;
        const previousRoll = Number.isNaN(state.roll) ? state.rollOffset : state.roll;
        const alpha = state.alpha;
        if ([alpha, previousPitch, pitchGyroDelta, pitchAcc, previousRoll, rollGyroDelta, rollAcc].some(Number.isNaN)) {
            console.error(`[${imuData.id}] NaN BEFORE filter calc!`); state.pitch = state.pitchOffset; state.roll = state.rollOffset;
        } else {
            state.roll = alpha * (previousRoll + rollGyroDelta) + (1 - alpha) * rollAcc;
            state.pitch = alpha * (previousPitch + pitchGyroDelta) + (1 - alpha) * pitchAcc;
            state.yaw += yawGyroDelta;
        }
        if (Number.isNaN(state.pitch) || Number.isNaN(state.roll)) { console.error(`[${imuData.id}] NaN AFTER filter! Resetting.`); state.pitch = state.pitchOffset; state.roll = state.rollOffset; }

        // 6. リセンターオフセット適用
        const finalRoll = state.roll - state.rollOffset;
        const finalPitch = state.pitch - state.pitchOffset;

        // 7. 計算結果を返す
        return { roll: finalRoll, pitch: finalPitch };
    }

    /** 姿勢の基準点をリセット (現在の角度をオフセットとする) */
    recenter(id) {
        const state = this.states[id];
        if (state) {
            console.log(`[SensorFusion] Re-centering orientation for ${id}`);
            state.pitchOffset = state.pitch;
            state.rollOffset = state.roll;
            state.yawOffset = state.yaw;
        } else {
            console.warn(`[SensorFusion] Cannot recenter: State not found for ${id}`);
        }
    }

    /** ジャイロバイアスを簡易キャリブレーション */
    calibrate(id, rawGyro) {
        const state = this.states[id];
        // rawGyro が正しいオブジェクトか確認
        if (state && rawGyro && typeof rawGyro.x === 'number' && typeof rawGyro.y === 'number' && typeof rawGyro.z === 'number') {
            console.log(`[SensorFusion] Simple calibrating gyro bias for ${id}`);
            state.gyroBiasX = rawGyro.x;
            state.gyroBiasY = rawGyro.y;
            state.gyroBiasZ = rawGyro.z;
            console.log(`  -> New Gyro Bias (Raw): X=${state.gyroBiasX}, Y=${state.gyroBiasY}, Z=${state.gyroBiasZ}`);
        } else {
            console.warn(`[SensorFusion] Cannot calibrate: State or rawGyro not valid for ${id}`, rawGyro);
        }
    }
}

// クラスのインスタンスをエクスポート (シングルトン)
module.exports = new SensorFusionProcessor();
