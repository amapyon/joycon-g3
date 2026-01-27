// imu-processor.ts
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

// 定数定義
const M_PI = Math.PI;
const RAD_TO_DEG = 180 / M_PI;
const DEG_TO_RAD = M_PI / 180;
const ACCEL_SCALE_G = 1 / 16384;
const GYRO_SCALE_DPS = 2000 / 32768;

// カーソルID型
type CursorId = 'cursorLeft' | 'cursorRight';

// IMUベクトル型
interface IMUVector {
    x: number;
    y: number;
    z: number;
}

// IMUデータ型
interface IMUData {
    id: CursorId;
    accel: IMUVector;
    gyro: IMUVector;
}

// IMU状態型
interface IMUState {
    pitch: number;
    roll: number;
    yaw: number;
    pitchOffset: number;
    rollOffset: number;
    yawOffset: number;
    lastTimestamp: number;
    alpha: number;
    gyroBiasX: number;
    gyroBiasY: number;
    gyroBiasZ: number;
}

/**
 * IMU データの姿勢推定とキャリブレーションを行い、イベントを発行する。
 */
export class IMUProcessor extends EventEmitter {
    states: Record<CursorId, IMUState>;
    lastRawGyro: Record<CursorId, IMUVector>;
    isCalibrating: Record<CursorId, boolean>;
    calibrationData: Record<CursorId, { x: number[]; y: number[]; z: number[] }>;

    /**
     * IMUProcessor を初期化する。
     * @param alpha コンプリメンタリフィルタの係数
     */
    constructor(alpha = 0.95) {
        super();
        // 各カーソルの初期状態を生成
        this.states = {
            cursorLeft: this.createInitialState(alpha),
            cursorRight: this.createInitialState(alpha),
        };
        // ジャイロ生データ初期化
        this.lastRawGyro = {
            cursorLeft: { x: 0, y: 0, z: 0 },
            cursorRight: { x: 0, y: 0, z: 0 },
        };
        // キャリブレーション状態初期化
        this.isCalibrating = { cursorLeft: false, cursorRight: false };
        // キャリブレーション用データ初期化
        this.calibrationData = {
            cursorLeft: { x: [], y: [], z: [] },
            cursorRight: { x: [], y: [], z: [] },
        };
        console.log('[IMUProcessor] Initialized.');
    }

    /**
     * IMU 状態の初期値を生成する。
     * @param alpha コンプリメンタリフィルタの係数
     * @returns 初期化済み IMU 状態
     */
    createInitialState(alpha: number): IMUState {
        return {
            pitch: 0,
            roll: 0,
            yaw: 0,
            pitchOffset: 0,
            rollOffset: 0,
            yawOffset: 0,
            lastTimestamp: 0,
            alpha: alpha,
            gyroBiasX: 0,
            gyroBiasY: 0,
            gyroBiasZ: 0,
        };
    }

    /**
     * IMU データを受け取り、姿勢を更新する。
     * @param imuData 受信した IMU データ
     */
    update(imuData: IMUData) {
        const state = this.states[imuData.id];
        if (!state) return;

        // 最新のジャイロ値を保存
        this.lastRawGyro[imuData.id] = { ...imuData.gyro };
        const now = performance.now();
        // 前回からの経過時間を計算
        const dt = state.lastTimestamp > 0 && now - state.lastTimestamp < 1000 ? (now - state.lastTimestamp) / 1000.0 : 0.0166;
        state.lastTimestamp = now;

        if (dt <= 0 || Number.isNaN(dt)) {
            return;
        }

        // キャリブレーション中はデータを蓄積
        if (this.isCalibrating[imuData.id]) {
            this.calibrationData[imuData.id].x.push(imuData.gyro.x);
            this.calibrationData[imuData.id].y.push(imuData.gyro.y);
            this.calibrationData[imuData.id].z.push(imuData.gyro.z);
            return;
        }

        // ジャイロバイアス補正
        const biasX = typeof state.gyroBiasX === 'number' && !Number.isNaN(state.gyroBiasX) ? state.gyroBiasX : 0;
        const biasY = typeof state.gyroBiasY === 'number' && !Number.isNaN(state.gyroBiasY) ? state.gyroBiasY : 0;
        const biasZ = typeof state.gyroBiasZ === 'number' && !Number.isNaN(state.gyroBiasZ) ? state.gyroBiasZ : 0;

        const gx_raw_cal = imuData.gyro.x - biasX;
        const gy_raw_cal = imuData.gyro.y - biasY;
        const gz_raw_cal = imuData.gyro.z - biasZ;

        if ([gx_raw_cal, gy_raw_cal, gz_raw_cal].some(Number.isNaN)) {
            return;
        }

        // 加速度・ジャイロ値をスケーリング
        const ax = imuData.accel.x * ACCEL_SCALE_G;
        const ay = imuData.accel.y * ACCEL_SCALE_G;
        const az = imuData.accel.z * ACCEL_SCALE_G;
        const gx = gx_raw_cal * GYRO_SCALE_DPS;
        const gy = gy_raw_cal * GYRO_SCALE_DPS;
        const gz = gz_raw_cal * GYRO_SCALE_DPS;
        
        if ([ax, ay, az, gx, gy, gz].some(Number.isNaN)) {
            return;
        }

        // 加速度からピッチ・ロールを計算
        let pitchAcc = Number.isNaN(state.pitch) ? 0 : state.pitch;
        let rollAcc = Number.isNaN(state.roll) ? 0 : state.roll;
        const accelMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);
        if (!Number.isNaN(accelMagnitude) && accelMagnitude > 0.8 && accelMagnitude < 1.2) {
            pitchAcc = Math.atan2(-ax, Math.sqrt(ay * ay + az * az)) * RAD_TO_DEG;
            rollAcc = Math.atan2(ay, az) * RAD_TO_DEG;
        }

        // ジャイロ積分による姿勢変化量
        const rollGyroDelta = gz * dt;
        const pitchGyroDelta = gy * dt;
        const yawGyroDelta = gx * dt;

        if ([rollGyroDelta, pitchGyroDelta, yawGyroDelta].some(Number.isNaN)) {
            return;
        }

        // 前回値取得
        const previousPitch = Number.isNaN(state.pitch) ? state.pitchOffset : state.pitch;
        const previousRoll = Number.isNaN(state.roll) ? state.rollOffset : state.roll;
        const alpha = state.alpha;

        if ([alpha, previousPitch, pitchGyroDelta, pitchAcc, previousRoll, rollGyroDelta, rollAcc].some(Number.isNaN)) {
            return;
        }

        // 姿勢推定（コンプリメンタリフィルタ）
        state.pitch = alpha * (previousPitch + pitchGyroDelta) + (1 - alpha) * pitchAcc;
        state.roll = alpha * (previousRoll + rollGyroDelta) + (1 - alpha) * rollAcc;
        state.yaw += yawGyroDelta;

        if (Number.isNaN(state.pitch) || Number.isNaN(state.roll)) {
            return;
        }

        // オフセット補正
        const finalRoll = state.roll - state.rollOffset;
        const finalPitch = state.pitch - state.pitchOffset;

        // 姿勢更新イベントを発火
        this.emit('attitude-update', {
            id: imuData.id,
            roll: finalRoll,
            pitch: finalPitch,
            yaw: state.yaw - state.yawOffset,
        });
    }

    /**
     * 現在の姿勢を基準（オフセット）として再設定する。
     * @param id 対象カーソル ID
     */
    recenter(id: CursorId) {
        const state = this.states[id];
        if (!state) return;
        state.rollOffset = state.roll;
        state.pitchOffset = state.pitch;
        state.yawOffset = state.yaw;
        console.log(`[IMUProcessor] Recenter for ${id}: rollOffset=${state.rollOffset.toFixed(2)}, pitchOffset=${state.pitchOffset.toFixed(2)}, yawOffset=${state.yawOffset.toFixed(2)}`);
    }

    /**
     * ジャイロキャリブレーションを開始する。
     * @param id 対象カーソル ID
     * @param durationMs 計測時間（ミリ秒）
     */
    startGyroCalibration(id: CursorId, durationMs = 2000) {
        if (this.isCalibrating[id]) return;
        this.isCalibrating[id] = true;
        this.calibrationData[id] = { x: [], y: [], z: [] };
        this.emit('calibration-status', { id, status: 'started' });
        setTimeout(() => {
            this.finishGyroCalibration(id);
        }, durationMs);
    }

    /**
     * ジャイロキャリブレーションを終了し、バイアスを計算する。
     * @param id 対象カーソル ID
     */
    finishGyroCalibration(id: CursorId) {
        const data = this.calibrationData[id];
        if (!data || data.x.length === 0) {
            this.isCalibrating[id] = false;
            this.emit('calibration-status', { id, status: 'failed' });
            return;
        }
        // 各軸の平均値をバイアスとして設定
        const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
        this.states[id].gyroBiasX = avg(data.x);
        this.states[id].gyroBiasY = avg(data.y);
        this.states[id].gyroBiasZ = avg(data.z);
        this.isCalibrating[id] = false;
        this.emit('calibration-status', { id, status: 'complete' });
    }

    /**
     * 現在のジャイロ値をバイアスとして即時設定する。
     * @param id 対象カーソル ID
     */
    calibrate(id: CursorId) {
        const gyro = this.lastRawGyro[id];
        this.states[id].gyroBiasX = gyro.x;
        this.states[id].gyroBiasY = gyro.y;
        this.states[id].gyroBiasZ = gyro.z;
    }
}

// シングルトンとしてエクスポート
export default new IMUProcessor();
