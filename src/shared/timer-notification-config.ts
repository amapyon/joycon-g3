/**
 * タイマー通知設定。
 */
export type TimerNotificationConfig = {
    time: number;
    filename: string;
    absolutePath: string;
    rumble?: boolean;
};
