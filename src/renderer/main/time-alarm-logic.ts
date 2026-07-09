{
    type TimerNotificationConfig = import('../../shared/timer-notification-config').TimerNotificationConfig;

    type TimeAlarmTargetTime = {
        hour: number;
        minute: number;
    };

    type TimeAlarmSchedule = {
        fireAt: Date;
        notification: TimerNotificationConfig;
    };

    type TimeAlarmLogicApi = {
        parseTimeAlarmTargetTime: (raw: string) => TimeAlarmTargetTime | null;
        resolveTimeAlarmSchedules: (
            now: Date,
            rawTargetTime: string,
            notifications: TimerNotificationConfig[]
        ) => TimeAlarmSchedule[];
    };

    const millisecondsPerDay = 24 * 60 * 60 * 1000;

    /**
     * 時刻指定アラームの時刻入力を解析する。
     * @param raw 入力値
     * @returns 解析結果。不正な場合は null
     */
    const parseTimeAlarmTargetTime = (raw: string): TimeAlarmTargetTime | null => {
        const match = /^(\d{2}):(\d{2})$/.exec(raw.trim());
        if (!match) {
            return null;
        }
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return null;
        }
        return { hour, minute };
    };

    /**
     * 指定日の対象時刻を作成する。
     * @param baseDate 基準日
     * @param targetTime 対象時刻
     * @returns 対象日時
     */
    const createTargetDate = (baseDate: Date, targetTime: TimeAlarmTargetTime): Date => {
        const targetDate = new Date(baseDate.getTime());
        targetDate.setHours(targetTime.hour, targetTime.minute, 0, 0);
        return targetDate;
    };

    /**
     * 対象日時と通知設定から発火予定を作成する。
     * @param targetDate 対象日時
     * @param notifications 通知設定一覧
     * @returns 発火予定一覧
     */
    const createSchedules = (targetDate: Date, notifications: TimerNotificationConfig[]): TimeAlarmSchedule[] => {
        return notifications.map((notification: TimerNotificationConfig): TimeAlarmSchedule => ({
            fireAt: new Date(targetDate.getTime() - notification.time * 1000),
            notification,
        }));
    };

    /**
     * 時刻指定アラームの発火予定を解決する。
     * @param now 現在日時
     * @param rawTargetTime 指定時刻
     * @param notifications 通知設定一覧
     * @returns 発火予定一覧
     */
    const resolveTimeAlarmSchedules = (
        now: Date,
        rawTargetTime: string,
        notifications: TimerNotificationConfig[]
    ): TimeAlarmSchedule[] => {
        const targetTime = parseTimeAlarmTargetTime(rawTargetTime);
        if (!targetTime || notifications.length === 0) {
            return [];
        }

        const todayTarget = createTargetDate(now, targetTime);
        const todaySchedules = createSchedules(todayTarget, notifications)
            .filter((schedule: TimeAlarmSchedule): boolean => schedule.fireAt.getTime() > now.getTime());
        if (todaySchedules.length > 0) {
            return todaySchedules;
        }

        const tomorrowTarget = new Date(todayTarget.getTime() + millisecondsPerDay);
        return createSchedules(tomorrowTarget, notifications);
    };

    const api: TimeAlarmLogicApi = {
        parseTimeAlarmTargetTime,
        resolveTimeAlarmSchedules,
    };

    const root = globalThis as typeof globalThis & {
        timeAlarmLogic?: TimeAlarmLogicApi;
    };
    root.timeAlarmLogic = api;

    if (typeof module !== 'undefined' && module && module.exports) {
        module.exports = api;
    }
}
