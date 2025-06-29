// imu-processor.ts
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

const M_PI = Math.PI;
const RAD_TO_DEG = 180 / M_PI;
const DEG_TO_RAD = M_PI / 180;
const ACCEL_SCALE_G = 1 / 16384;
const GYRO_SCALE_DPS = 2000 / 32768;

type CursorId = 'cursor1' | 'cursor2';

interface IMUVector {
    x: number;
    y: number;
    z: number;
}

interface IMUData {
    id: CursorId;
    accel: IMUVector;
    gyro: IMUVector;
}

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

class IMUProcessor extends EventEmitter {
    states: Record<CursorId, IMUState>;
    lastRawGyro: Record<CursorId, IMUVector>;
    isCalibrating: Record<CursorId, boolean>;
    calibrationData: Record<CursorId, { x: number[]; y: number[]; z: number[] }>;

    constructor(alpha = 0.95) {
        super();
        this.states = {
            cursor1: this.createInitialState(alpha),
            cursor2: this.createInitialState(alpha),
        };
        this.lastRawGyro = {
            cursor1: { x: 0, y: 0, z: 0 },
            cursor2: { x: 0, y: 0, z: 0 },
        };
        this.isCalibrating = { cursor1: false, cursor2: false };
        this.calibrationData = {
            cursor1: { x: [], y: [], z: [] },
            cursor2: { x: [], y: [], z: [] },
        };
        console.log('[IMUProcessor] Initialized.');
    }

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

    update(imuData: IMUData) {
        const state = this.states[imuData.id];
        if (!state) return;
        this.lastRawGyro[imuData.id] = { ...imuData.gyro };
        const now = performance.now();
        const dt = state.lastTimestamp > 0 && now - state.lastTimestamp < 1000 ? (now - state.lastTimestamp) / 1000.0 : 0.0166;
        state.lastTimestamp = now;
        if (dt <= 0 || Number.isNaN(dt)) return;
        if (this.isCalibrating[imuData.id]) {
            this.calibrationData[imuData.id].x.push(imuData.gyro.x);
            this.calibrationData[imuData.id].y.push(imuData.gyro.y);
            this.calibrationData[imuData.id].z.push(imuData.gyro.z);
            return;
        }
        const biasX = typeof state.gyroBiasX === 'number' && !Number.isNaN(state.gyroBiasX) ? state.gyroBiasX : 0;
        const biasY = typeof state.gyroBiasY === 'number' && !Number.isNaN(state.gyroBiasY) ? state.gyroBiasY : 0;
        const biasZ = typeof state.gyroBiasZ === 'number' && !Number.isNaN(state.gyroBiasZ) ? state.gyroBiasZ : 0;
        const gx_raw_cal = imuData.gyro.x - biasX;
        const gy_raw_cal = imuData.gyro.y - biasY;
        const gz_raw_cal = imuData.gyro.z - biasZ;
        if ([gx_raw_cal, gy_raw_cal, gz_raw_cal].some(Number.isNaN)) return;
        const ax = imuData.accel.x * ACCEL_SCALE_G;
        const ay = imuData.accel.y * ACCEL_SCALE_G;
        const az = imuData.accel.z * ACCEL_SCALE_G;
        const gx = gx_raw_cal * GYRO_SCALE_DPS;
        const gy = gy_raw_cal * GYRO_SCALE_DPS;
        const gz = gz_raw_cal * GYRO_SCALE_DPS;
        if ([ax, ay, az, gx, gy, gz].some(Number.isNaN)) return;
        let pitchAcc = Number.isNaN(state.pitch) ? 0 : state.pitch;
        let rollAcc = Number.isNaN(state.roll) ? 0 : state.roll;
        const accelMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);
        if (!Number.isNaN(accelMagnitude) && accelMagnitude > 0.8 && accelMagnitude < 1.2) {
            pitchAcc = Math.atan2(-ax, Math.sqrt(ay * ay + az * az)) * RAD_TO_DEG;
            rollAcc = Math.atan2(ay, az) * RAD_TO_DEG;
        }
        const rollGyroDelta = gz * dt;
        const pitchGyroDelta = gy * dt;
        const yawGyroDelta = gx * dt;
        if ([rollGyroDelta, pitchGyroDelta, yawGyroDelta].some(Number.isNaN)) return;
        const previousPitch = Number.isNaN(state.pitch) ? state.pitchOffset : state.pitch;
        const previousRoll = Number.isNaN(state.roll) ? state.rollOffset : state.roll;
        const alpha = state.alpha;
        if ([alpha, previousPitch, pitchGyroDelta, pitchAcc, previousRoll, rollGyroDelta, rollAcc].some(Number.isNaN)) return;
        state.pitch = alpha * (previousPitch + pitchGyroDelta) + (1 - alpha) * pitchAcc;
        state.roll = alpha * (previousRoll + rollGyroDelta) + (1 - alpha) * rollAcc;
        state.yaw += yawGyroDelta;
        if (Number.isNaN(state.pitch) || Number.isNaN(state.roll)) return;
        const finalRoll = state.roll - state.rollOffset;
        const finalPitch = state.pitch - state.pitchOffset;
        this.emit('attitude-update', {
            id: imuData.id,
            roll: finalRoll,
            pitch: finalPitch,
            yaw: state.yaw - state.yawOffset,
        });
    }

    recenter(id: CursorId) {
        const state = this.states[id];
        if (!state) return;
        state.rollOffset = state.roll;
        state.pitchOffset = state.pitch;
        state.yawOffset = state.yaw;
    }

    startGyroCalibration(id: CursorId, durationMs = 2000) {
        if (this.isCalibrating[id]) return;
        this.isCalibrating[id] = true;
        this.calibrationData[id] = { x: [], y: [], z: [] };
        this.emit('calibration-status', { id, status: 'started' });
        setTimeout(() => {
            this.finishGyroCalibration(id);
        }, durationMs);
    }

    finishGyroCalibration(id: CursorId) {
        const data = this.calibrationData[id];
        if (!data || data.x.length === 0) {
            this.isCalibrating[id] = false;
            this.emit('calibration-status', { id, status: 'failed' });
            return;
        }
        const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
        this.states[id].gyroBiasX = avg(data.x);
        this.states[id].gyroBiasY = avg(data.y);
        this.states[id].gyroBiasZ = avg(data.z);
        this.isCalibrating[id] = false;
        this.emit('calibration-status', { id, status: 'complete' });
    }

    calibrate(id: CursorId) {
        const gyro = this.lastRawGyro[id];
        this.states[id].gyroBiasX = gyro.x;
        this.states[id].gyroBiasY = gyro.y;
        this.states[id].gyroBiasZ = gyro.z;
    }
}

export default new IMUProcessor();
