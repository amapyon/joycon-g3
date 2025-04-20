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
    constructor(alpha = 0.95) {
        // デフォルトのalpha値を設定
        this.states = {
            cursor1: this.createInitialState(alpha),
            cursor2: this.createInitialState(alpha),
        };
        console.log('[SensorFusion] Processor initialized.');
    }

    /** センサー状態の初期オブジェクトを作成 */
    createInitialState(alpha) {
        return {
            pitch: 0, // 推定角度 (degree)
            roll: 0, // 推定角度 (degree)
            yaw: 0, // 推定角度 (degree)
            pitchOffset: 0, // リセンター用オフセット (degree)
            rollOffset: 0, // リセンター用オフセット (degree)
            yawOffset: 0, // リセンター用オフセット (degree)
            lastTimestamp: 0, // 前回の処理時刻 (ms)
            alpha: alpha, // 相補フィルター係数
            gyroBiasX: 0, // ジャイロバイアス (raw LSB)
            gyroBiasY: 0, // ジャイロバイアス (raw LSB)
            gyroBiasZ: 0, // ジャイロバイアス (raw LSB)
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
            console.warn(`[SF] No state for ${imuData.id}`);
            return null;
        }

        const now = performance.now();
        const dt = state.lastTimestamp > 0 && now - state.lastTimestamp < 1000 ? (now - state.lastTimestamp) / 1000.0 : 0.0166; // s
        state.lastTimestamp = now;
        if (dt <= 0 || Number.isNaN(dt)) {
            console.warn(`[${imuData.id}] Invalid dt: ${dt}.`);
            return null;
        }

        // 1. バイアス除去 (変更なし)
        const biasX = typeof state.gyroBiasX === 'number' && !Number.isNaN(state.gyroBiasX) ? state.gyroBiasX : 0;
        const biasY = typeof state.gyroBiasY === 'number' && !Number.isNaN(state.gyroBiasY) ? state.gyroBiasY : 0;
        const biasZ = typeof state.gyroBiasZ === 'number' && !Number.isNaN(state.gyroBiasZ) ? state.gyroBiasZ : 0;
        const gx_raw_cal = imuData.gyro.x - biasX;
        const gy_raw_cal = imuData.gyro.y - biasY;
        const gz_raw_cal = imuData.gyro.z - biasZ;
        if ([gx_raw_cal, gy_raw_cal, gz_raw_cal].some(Number.isNaN)) {
            console.error(`[${imuData.id}] NaN gyro after bias removal`);
            return null;
        }

        // 2. 物理単位への変換 (変更なし)
        const ax = imuData.accel.x * ACCEL_SCALE_G;
        const ay = imuData.accel.y * ACCEL_SCALE_G;
        const az = imuData.accel.z * ACCEL_SCALE_G; // G
        const gx = gx_raw_cal * GYRO_SCALE_DPS; // Yaw Rate (deg/sec)
        const gy = gy_raw_cal * GYRO_SCALE_DPS; // Pitch Rate (deg/sec)
        const gz = gz_raw_cal * GYRO_SCALE_DPS; // Roll Rate (deg/sec)
        if ([ax, ay, az, gx, gy, gz].some(Number.isNaN)) {
            console.error(`[${imuData.id}] NaN after unit conversion`);
            return null;
        }

        // --- 3. 加速度から角度を計算 (★軸定義に合わせた計算式に変更試行★) ---
        let pitchAcc = Number.isNaN(state.pitch) ? 0 : state.pitch;
        let rollAcc = Number.isNaN(state.roll) ? 0 : state.roll;
        const accelMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);
        if (!Number.isNaN(accelMagnitude) && accelMagnitude > 0.8 && accelMagnitude < 1.2) {
            // 約1Gの時だけ計算
            // 仮定: Roll(gz)はZ軸周り、Pitch(gy)はY軸周りの回転
            // Roll (Z軸周り): XY平面での傾き? atan2(ay, ax)
            // Pitch(Y軸周り): XZ平面での傾き? atan2(-ax, az) (Zが上向きの場合)
            // ※ これらの計算式がJoyConの座標系で正しいかは要検証です！
            if (!Number.isNaN(ay) && !Number.isNaN(ax) && (ax !== 0 || ay !== 0)) {
                // ゼロ除算回避
                rollAcc = Math.atan2(ay, ax) * RAD_TO_DEG;
                if (Number.isNaN(rollAcc)) {
                    // NaNなら前回値
                    rollAcc = Number.isNaN(state.roll) ? 0 : state.roll;
                }
            }
            if (!Number.isNaN(ax) && !Number.isNaN(az) && (ax !== 0 || az !== 0)) {
                pitchAcc = Math.atan2(-ax, az) * RAD_TO_DEG;
                if (Number.isNaN(pitchAcc)) {
                    // NaNなら前回値
                    pitchAcc = Number.isNaN(state.pitch) ? 0 : state.pitch;
                }
            }
        }
        if (Number.isNaN(rollAcc)) rollAcc = 0;
        if (Number.isNaN(pitchAcc)) pitchAcc = 0; // 最終NaNガード

        // --- 4. ジャイロから角度変化を計算 (★ユーザーの確認結果に合わせて軸を割り当て★) ---
        const rollGyroDelta = gz * dt; // ★左右傾き(Roll) に gz (Z軸ジャイロ) を使用★
        const pitchGyroDelta = gy * dt; // ★前後傾き(Pitch)に gy (Y軸ジャイロ) を使用★ (変更なし)
        const yawGyroDelta = gx * dt; // ★水平ひねり(Yaw) に gx (X軸ジャイロ) を使用★

        if ([rollGyroDelta, pitchGyroDelta, yawGyroDelta].some(Number.isNaN)) {
            console.error(`[${imuData.id}] NaN gyro delta`);
            return null;
        }

        // --- 5. 相補フィルター (alpha = 0.95) ---
        const previousPitch = Number.isNaN(state.pitch) ? state.pitchOffset : state.pitch;
        const previousRoll = Number.isNaN(state.roll) ? state.rollOffset : state.roll;
        const alpha = state.alpha; // 現在 0.95
        if ([alpha, previousPitch, pitchGyroDelta, pitchAcc, previousRoll, rollGyroDelta, rollAcc].some(Number.isNaN)) {
            console.error(`[${imuData.id}] NaN BEFORE filter calc!`);
            state.pitch = state.pitchOffset;
            state.roll = state.rollOffset;
        } else {
            state.roll = alpha * (previousRoll + rollGyroDelta) + (1 - alpha) * rollAcc;
            state.pitch = alpha * (previousPitch + pitchGyroDelta) + (1 - alpha) * pitchAcc;
            state.yaw += yawGyroDelta; // ヨーも更新
        }
        if (Number.isNaN(state.pitch) || Number.isNaN(state.roll)) {
            console.error(`[${imuData.id}] NaN AFTER filter!`);
            state.pitch = state.pitchOffset;
            state.roll = state.rollOffset;
        }

        // --- 6. リセンターオフセット適用 ---
        const finalRoll = state.roll - state.rollOffset;
        const finalPitch = state.pitch - state.pitchOffset;

        // --- 7. 計算結果を返す ---
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
