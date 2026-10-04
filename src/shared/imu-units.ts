// 現在の Joy-Con の加速度レンジでは、実測の静止時約4096カウントが1Gに相当する。
export const ACCEL_COUNTS_PER_G = 4096;
export const ACCEL_SCALE_G = 1 / ACCEL_COUNTS_PER_G;
