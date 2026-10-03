// imu-processor.ts
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

// 定数定義
const M_PI = Math.PI;
const RAD_TO_DEG = 180 / M_PI;
const ACCEL_SCALE_G = 1 / 16384;
const GYRO_SCALE_DPS = 2000 / 32768;
const DEG_TO_RAD = Math.PI / 180;
const GRAVITY_MAGNITUDE_TOLERANCE = 0.05;
const STATIONARY_GYRO_THRESHOLD_DPS = 5;
const POINTER_GRAVITY_CORRECTION_TIME_SECONDS = 0.25;
const POINTER_ACCEL_CONFIDENCE_RANGE_G = 0.2;

// カーソルID型
type CursorId = import('../shared/cursor-types').CursorId;

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
    lastDeltaTime: number;
    alpha: number;
    gyroBiasX: number;
    gyroBiasY: number;
    gyroBiasZ: number;
    xRotation: number;
    hasXRotation: boolean;
    pointerGravity: IMUVector;
    hasPointerGravity: boolean;
    pointerRightAxis: IMUVector;
    pointerGyroY: number;
    pointerGyroZ: number;
}

type ScaledMotion = {
    ax: number;
    ay: number;
    az: number;
    gx: number;
    gy: number;
    gz: number;
};

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
    constructor(alpha: number = 0.95) {
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
        // console.log('[IMUProcessor] Initialized.');
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
            lastDeltaTime: 1 / 60,
            alpha: alpha,
            gyroBiasX: 0,
            gyroBiasY: 0,
            gyroBiasZ: 0,
            xRotation: 0,
            hasXRotation: false,
            pointerGravity: { x: 0, y: 0, z: 1 },
            hasPointerGravity: false,
            pointerRightAxis: { x: 0, y: 1, z: 0 },
            pointerGyroY: 0,
            pointerGyroZ: 0,
        };
    }

    /**
     * 前回更新時刻からの経過秒を計算する。
     * @param state 対象 IMU 状態
     * @param now 現在時刻
     * @returns 経過秒
     */
    private computeDeltaTime(state: IMUState, now: number): number {
        return state.lastTimestamp > 0 && now - state.lastTimestamp < 1000 ? (now - state.lastTimestamp) / 1000.0 : 0.0166;
    }

    /**
     * キャリブレーション中データを蓄積する。
     * @param imuData IMU データ
     */
    private appendCalibrationData(imuData: IMUData): void {
        this.calibrationData[imuData.id].x.push(imuData.gyro.x);
        this.calibrationData[imuData.id].y.push(imuData.gyro.y);
        this.calibrationData[imuData.id].z.push(imuData.gyro.z);
    }

    /**
     * ジャイロバイアスを取得する。
     * @param state IMU 状態
     * @returns バイアス値
     */
    private getGyroBias(state: IMUState): IMUVector {
        return {
            x: typeof state.gyroBiasX === 'number' && !Number.isNaN(state.gyroBiasX) ? state.gyroBiasX : 0,
            y: typeof state.gyroBiasY === 'number' && !Number.isNaN(state.gyroBiasY) ? state.gyroBiasY : 0,
            z: typeof state.gyroBiasZ === 'number' && !Number.isNaN(state.gyroBiasZ) ? state.gyroBiasZ : 0,
        };
    }

    /**
     * ベクトルの長さを計算する。
     * @param value 対象ベクトル
     * @returns ベクトルの長さ
     */
    private vectorMagnitude(value: IMUVector): number {
        return Math.sqrt(value.x * value.x + value.y * value.y + value.z * value.z);
    }

    /**
     * ベクトルを正規化する。
     * @param value 対象ベクトル
     * @returns 正規化済みベクトル。正規化できない場合は null
     */
    private normalizeVector(value: IMUVector): IMUVector | null {
        const magnitude = this.vectorMagnitude(value);
        if (!Number.isFinite(magnitude) || magnitude <= Number.EPSILON) {
            return null;
        }
        return { x: value.x / magnitude, y: value.y / magnitude, z: value.z / magnitude };
    }

    /**
     * ベクトルの外積を計算する。
     * @param left 左辺ベクトル
     * @param right 右辺ベクトル
     * @returns 外積
     */
    private crossVector(left: IMUVector, right: IMUVector): IMUVector {
        return {
            x: left.y * right.z - left.z * right.y,
            y: left.z * right.x - left.x * right.z,
            z: left.x * right.y - left.y * right.x,
        };
    }

    /**
     * ベクトルの内積を計算する。
     * @param left 左辺ベクトル
     * @param right 右辺ベクトル
     * @returns 内積
     */
    private dotVector(left: IMUVector, right: IMUVector): number {
        return left.x * right.x + left.y * right.y + left.z * right.z;
    }

    /**
     * 左右 Joy-Con のセンサー座標を共通の本体座標へ揃える。
     * @param value 変換前ベクトル
     * @param id Joy-Con に対応するカーソル ID
     * @returns 共通座標へ変換したベクトル
     */
    private alignPointerVector(value: IMUVector, id: CursorId): IMUVector {
        return id === 'cursorLeft'
            ? { ...value }
            : { x: value.x, y: -value.y, z: -value.z };
    }

    /**
     * ジャイロから本体座標上の重力方向を予測する。
     * @param gravity 現在の重力方向
     * @param angularVelocity ジャイロ角速度（rad/s）
     * @param dt 前回更新からの経過秒
     * @returns 予測後の重力方向
     */
    private predictPointerGravity(gravity: IMUVector, angularVelocity: IMUVector, dt: number): IMUVector {
        const rotation = this.crossVector(angularVelocity, gravity);
        return this.normalizeVector({
            x: gravity.x - rotation.x * dt,
            y: gravity.y - rotation.y * dt,
            z: gravity.z - rotation.z * dt,
        }) ?? gravity;
    }

    /**
     * ジャイロ予測と加速度を融合して重力方向を更新する。
     * @param state 更新対象の IMU 状態
     * @param measuredGravity 加速度から得た重力方向
     * @param accelerationMagnitude 加速度の大きさ（G）
     * @param angularVelocity ジャイロ角速度（rad/s）
     * @param dt 前回更新からの経過秒
     */
    private updatePointerGravity(
        state: IMUState,
        measuredGravity: IMUVector | null,
        accelerationMagnitude: number,
        angularVelocity: IMUVector,
        dt: number,
    ): void {
        if (!state.hasPointerGravity && measuredGravity) {
            state.pointerGravity = measuredGravity;
            state.hasPointerGravity = true;
            return;
        }
        if (!state.hasPointerGravity) {
            return;
        }

        const predictedGravity = this.predictPointerGravity(state.pointerGravity, angularVelocity, dt);
        if (!measuredGravity) {
            state.pointerGravity = predictedGravity;
            return;
        }
        const confidence = Math.max(
            0,
            1 - Math.abs(accelerationMagnitude - 1) / POINTER_ACCEL_CONFIDENCE_RANGE_G,
        );
        const correction = (1 - Math.exp(-dt / POINTER_GRAVITY_CORRECTION_TIME_SECONDS)) * confidence;
        state.pointerGravity = this.normalizeVector({
            x: predictedGravity.x + (measuredGravity.x - predictedGravity.x) * correction,
            y: predictedGravity.y + (measuredGravity.y - predictedGravity.y) * correction,
            z: predictedGravity.z + (measuredGravity.z - predictedGravity.z) * correction,
        }) ?? predictedGravity;
    }

    /**
     * 重力方向から画面基準軸を作り、ジャイロをポインター移動軸へ射影する。
     * @param state 更新対象の IMU 状態
     * @param motion スケーリング済みモーション
     * @param dt 前回更新からの経過秒
     * @param id Joy-Con に対応するカーソル ID
     */
    private updatePointerGravityFrame(state: IMUState, motion: ScaledMotion, dt: number, id: CursorId): void {
        const acceleration = this.alignPointerVector({ x: motion.ax, y: motion.ay, z: motion.az }, id);
        const alignedGyro = this.alignPointerVector({ x: motion.gx, y: motion.gy, z: motion.gz }, id);
        const angularVelocity = {
            x: alignedGyro.x * DEG_TO_RAD,
            y: alignedGyro.y * DEG_TO_RAD,
            z: alignedGyro.z * DEG_TO_RAD,
        };
        this.updatePointerGravity(
            state,
            this.normalizeVector(acceleration),
            this.vectorMagnitude(acceleration),
            angularVelocity,
            dt,
        );
        if (!state.hasPointerGravity) {
            return;
        }

        const rightAxis = this.normalizeVector(
            this.crossVector(state.pointerGravity, { x: 1, y: 0, z: 0 }),
        );
        if (rightAxis) {
            state.pointerRightAxis = rightAxis;
        }
        const sideSign = id === 'cursorLeft' ? 1 : -1;
        state.pointerGyroZ = this.dotVector(alignedGyro, state.pointerGravity) * sideSign / GYRO_SCALE_DPS;
        state.pointerGyroY = this.dotVector(alignedGyro, state.pointerRightAxis) * sideSign / GYRO_SCALE_DPS;
    }

    /**
     * 生データをスケーリングして利用値を生成する。
     * @param imuData IMU データ
     * @param bias ジャイロバイアス
     * @returns 変換済み値（不正値時は null）
     */
    private scaleMotion(imuData: IMUData, bias: IMUVector): ScaledMotion | null {
        const gxRawCal = imuData.gyro.x - bias.x;
        const gyRawCal = imuData.gyro.y - bias.y;
        const gzRawCal = imuData.gyro.z - bias.z;
        if ([gxRawCal, gyRawCal, gzRawCal].some(Number.isNaN)) {
            return null;
        }

        const scaled: ScaledMotion = {
            ax: imuData.accel.x * ACCEL_SCALE_G,
            ay: imuData.accel.y * ACCEL_SCALE_G,
            az: imuData.accel.z * ACCEL_SCALE_G,
            gx: gxRawCal * GYRO_SCALE_DPS,
            gy: gyRawCal * GYRO_SCALE_DPS,
            gz: gzRawCal * GYRO_SCALE_DPS,
        };
        return [scaled.ax, scaled.ay, scaled.az, scaled.gx, scaled.gy, scaled.gz].some(Number.isNaN) ? null : scaled;
    }

    /**
     * 加速度由来の姿勢角を計算する。
     * @param state IMU 状態
     * @param motion 変換済みモーション
     * @returns 加速度由来ピッチ・ロール
     */
    private computeAccelAngles(state: IMUState, motion: ScaledMotion): { pitchAcc: number; rollAcc: number } {
        let pitchAcc = Number.isNaN(state.pitch) ? 0 : state.pitch;
        let rollAcc = Number.isNaN(state.roll) ? 0 : state.roll;
        const accelMagnitude = Math.sqrt(motion.ax * motion.ax + motion.ay * motion.ay + motion.az * motion.az);
        if (!Number.isNaN(accelMagnitude) && accelMagnitude > 0.8 && accelMagnitude < 1.2) {
            pitchAcc = Math.atan2(-motion.ax, Math.sqrt(motion.ay * motion.ay + motion.az * motion.az)) * RAD_TO_DEG;
            rollAcc = Math.atan2(motion.ay, motion.az) * RAD_TO_DEG;
        }
        return { pitchAcc, rollAcc };
    }

    /**
     * 重力加速度から X 軸まわりの保持角度を求める。
     * @param motion スケーリング済みのモーション値
     * @param id Joy-Con に対応するカーソル ID
     * @returns X 軸まわりの角度。並進加速度が大きい場合は null
     */
    private computeXAxisRotationFromAccel(motion: ScaledMotion, id: CursorId): number | null {
        const accelMagnitude = Math.sqrt(motion.ax * motion.ax + motion.ay * motion.ay + motion.az * motion.az);
        const gyroMagnitude = Math.sqrt(motion.gx * motion.gx + motion.gy * motion.gy + motion.gz * motion.gz);
        const isGravityStable = Number.isFinite(accelMagnitude)
            && Math.abs(accelMagnitude - 1) <= GRAVITY_MAGNITUDE_TOLERANCE;
        const isRotationStable = Number.isFinite(gyroMagnitude)
            && gyroMagnitude <= STATIONARY_GYRO_THRESHOLD_DPS;
        if (!isGravityStable || !isRotationStable) {
            return null;
        }
        const rawRotation = Math.atan2(motion.ay, motion.az) * RAD_TO_DEG;
        const neutralRotation = id === 'cursorRight' ? 180 : 0;
        return this.normalizeDegrees(rawRotation - neutralRotation);
    }

    /**
     * ジャイロと重力方向を融合し、X 軸まわりの保持角度を更新する。
     * @param state 更新対象の IMU 状態
     * @param motion スケーリング済みのモーション値
     * @param dt 前回更新からの経過秒
     * @param id Joy-Con に対応するカーソル ID
     */
    private updateXAxisRotation(state: IMUState, motion: ScaledMotion, dt: number, id: CursorId): void {
        const accelRotation = this.computeXAxisRotationFromAccel(motion, id);
        if (!state.hasXRotation && accelRotation !== null) {
            state.xRotation = accelRotation;
            state.hasXRotation = true;
            return;
        }

        const predictedRotation = this.normalizeDegrees(state.xRotation + motion.gx * dt);
        if (accelRotation === null) {
            state.xRotation = predictedRotation;
            return;
        }

        const correction = this.normalizeDegrees(accelRotation - predictedRotation);
        state.xRotation = this.normalizeDegrees(predictedRotation + (1 - state.alpha) * correction);
        state.hasXRotation = true;
    }

    /**
     * 角度を -180 度以上 180 度未満へ正規化する。
     * @param degrees 正規化する角度
     * @returns 正規化後の角度
     */
    private normalizeDegrees(degrees: number): number {
        return ((degrees + 180) % 360 + 360) % 360 - 180;
    }

    /**
     * 姿勢を更新して最終値を返す。
     * @param state IMU 状態
     * @param motion 変換済みモーション
     * @param dt 経過秒
     * @param angles 加速度由来角度
     * @returns 最終姿勢（不正値時は null）
     */
    private updateOrientation(
        state: IMUState,
        motion: ScaledMotion,
        dt: number,
        angles: { pitchAcc: number; rollAcc: number },
    ): { roll: number; pitch: number; yaw: number } | null {
        const rollGyroDelta = motion.gz * dt;
        const pitchGyroDelta = motion.gy * dt;
        const yawGyroDelta = motion.gx * dt;
        if ([rollGyroDelta, pitchGyroDelta, yawGyroDelta].some(Number.isNaN)) {
            return null;
        }

        const previousPitch = Number.isNaN(state.pitch) ? state.pitchOffset : state.pitch;
        const previousRoll = Number.isNaN(state.roll) ? state.rollOffset : state.roll;
        const alpha = state.alpha;
        if ([alpha, previousPitch, pitchGyroDelta, angles.pitchAcc, previousRoll, rollGyroDelta, angles.rollAcc].some(Number.isNaN)) {
            return null;
        }

        state.pitch = alpha * (previousPitch + pitchGyroDelta) + (1 - alpha) * angles.pitchAcc;
        state.roll = alpha * (previousRoll + rollGyroDelta) + (1 - alpha) * angles.rollAcc;
        state.yaw += yawGyroDelta;
        if (Number.isNaN(state.pitch) || Number.isNaN(state.roll)) {
            return null;
        }

        return {
            roll: state.roll - state.rollOffset,
            pitch: state.pitch - state.pitchOffset,
            yaw: state.yaw - state.yawOffset,
        };
    }

    /**
     * IMU データを受け取り、姿勢を更新する。
     * @param imuData 受信した IMU データ
     */
    update(imuData: IMUData): void {
        const state = this.states[imuData.id];
        if (!state) return;

        // 最新のジャイロ値を保存
        this.lastRawGyro[imuData.id] = { ...imuData.gyro };
        const now = performance.now();
        // 前回からの経過時間を計算
        const dt = this.computeDeltaTime(state, now);
        state.lastTimestamp = now;
        state.lastDeltaTime = dt;

        if (dt <= 0 || Number.isNaN(dt)) {
            return;
        }

        // キャリブレーション中はデータを蓄積
        if (this.isCalibrating[imuData.id]) {
            this.appendCalibrationData(imuData);
            return;
        }

        const motion = this.scaleMotion(imuData, this.getGyroBias(state));
        if (!motion) {
            return;
        }

        const angles = this.computeAccelAngles(state, motion);
        this.updateXAxisRotation(state, motion, dt, imuData.id);
        this.updatePointerGravityFrame(state, motion, dt, imuData.id);
        const next = this.updateOrientation(state, motion, dt, angles);
        if (!next) {
            return;
        }

        // 姿勢更新イベントを発火
        this.emit('attitude-update', {
            id: imuData.id,
            roll: next.roll,
            pitch: next.pitch,
            yaw: next.yaw,
        });
    }

    /**
     * 現在の姿勢を基準（オフセット）として再設定する。
     * @param id 対象カーソル ID
     */
    recenter(id: CursorId): void {
        const state = this.states[id];
        if (!state) return;
        state.rollOffset = state.roll;
        state.pitchOffset = state.pitch;
        state.yawOffset = state.yaw;
        // console.log(`[IMUProcessor] Recenter for ${id}: rollOffset=${state.rollOffset.toFixed(2)}, pitchOffset=${state.pitchOffset.toFixed(2)}, yawOffset=${state.yawOffset.toFixed(2)}`);
    }

    /**
     * ジャイロキャリブレーションを開始する。
     * @param id 対象カーソル ID
     * @param durationMs 計測時間（ミリ秒）
     */
    startGyroCalibration(id: CursorId, durationMs: number = 2000): void {
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
    finishGyroCalibration(id: CursorId): void {
        const data = this.calibrationData[id];
        if (!data || data.x.length === 0) {
            this.isCalibrating[id] = false;
            this.emit('calibration-status', { id, status: 'failed' });
            return;
        }
        // 各軸の平均値をバイアスとして設定
        const avg = (arr: number[]): number => arr.reduce((a: number, b: number) => a + b, 0) / arr.length;
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
    calibrate(id: CursorId): void {
        const gyro = this.lastRawGyro[id];
        this.states[id].gyroBiasX = gyro.x;
        this.states[id].gyroBiasY = gyro.y;
        this.states[id].gyroBiasZ = gyro.z;
    }
}

// シングルトンとしてエクスポート
export default new IMUProcessor();
