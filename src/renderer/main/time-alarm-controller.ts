{
    type TimerNotificationConfig = import('../../shared/timer-notification-config').TimerNotificationConfig;
    type MainRendererContext = import('../../shared/main-renderer-types').MainRendererContext;
    type LocalStorageStoreApi = import('../../shared/local-storage-store-types').LocalStorageStoreApi;

    type TimeAlarmSchedule = {
        fireAt: Date;
        notification: TimerNotificationConfig;
    };

    type TimeAlarmLogicApi = {
        resolveTimeAlarmSchedules: (
            now: Date,
            rawTargetTime: string,
            notifications: TimerNotificationConfig[]
        ) => TimeAlarmSchedule[];
    };

    type NotificationPlayerInstance = {
        playNotification: (config: TimerNotificationConfig) => boolean;
    };

    type TimeAlarmControllerDeps = {
        elements: MainRendererContext['elements'];
        localStorageStore: LocalStorageStoreApi;
        storageKey: string;
        timeAlarmLogic: TimeAlarmLogicApi;
        notificationPlayer: NotificationPlayerInstance;
        getNotifications: () => TimerNotificationConfig[];
        now: () => Date;
        setTimer: (callback: () => void, delayMs: number) => number;
        clearTimer: (timerId: number) => void;
    };

    type TimeAlarmControllerApi = {
        init: () => void;
        rescheduleIfEnabled: () => void;
    };

    type ScheduledTimer = {
        id: number;
    };

    /**
     * 時刻指定アラームコントローラーを作成する。
     * @param deps 初期化に必要な依存
     * @returns 時刻指定アラームコントローラー
     */
    const createTimeAlarmController = (deps: TimeAlarmControllerDeps): TimeAlarmControllerApi => {
        const {
            elements,
            localStorageStore,
            storageKey,
            timeAlarmLogic,
            notificationPlayer,
            getNotifications,
            now,
            setTimer,
            clearTimer,
        } = deps;
        const scheduledTimers: ScheduledTimer[] = [];

        /**
         * 予約済みタイマーを解除する。
         */
        const clearSchedules = (): void => {
            scheduledTimers.splice(0).forEach((timer: ScheduledTimer): void => {
                clearTimer(timer.id);
            });
        };

        /**
         * 現在の入力値と通知設定から予約を作り直す。
         */
        const reschedule = (): void => {
            clearSchedules();
            if (!elements.timeAlarmEnabledInput.checked) {
                return;
            }
            const schedules = timeAlarmLogic.resolveTimeAlarmSchedules(
                now(),
                elements.timeAlarmTargetTimeInput.value,
                getNotifications()
            );
            schedules.forEach((schedule: TimeAlarmSchedule): void => {
                const delayMs = Math.max(schedule.fireAt.getTime() - now().getTime(), 0);
                const id = setTimer((): void => {
                    const index = scheduledTimers.findIndex((timer: ScheduledTimer): boolean => timer.id === id);
                    if (index >= 0) {
                        scheduledTimers.splice(index, 1);
                    }
                    notificationPlayer.playNotification(schedule.notification);
                    if (scheduledTimers.length === 0) {
                        reschedule();
                    }
                }, delayMs);
                scheduledTimers.push({ id });
            });
        };

        /**
         * 有効な場合だけ予約を再計算する。
         */
        const rescheduleIfEnabled = (): void => {
            if (elements.timeAlarmEnabledInput.checked) {
                reschedule();
            }
        };

        /**
         * 時刻指定アラーム UI を初期化する。
         */
        const init = (): void => {
            elements.timeAlarmTargetTimeInput.value = localStorageStore.getString(storageKey, '');
            elements.timeAlarmEnabledInput.checked = false;
            clearSchedules();

            elements.timeAlarmEnabledInput.addEventListener('change', (): void => {
                if (!elements.timeAlarmEnabledInput.checked) {
                    clearSchedules();
                    return;
                }
                reschedule();
            });

            elements.timeAlarmTargetTimeInput.addEventListener('input', (): void => {
                localStorageStore.setString(storageKey, elements.timeAlarmTargetTimeInput.value);
                rescheduleIfEnabled();
            });
        };

        return {
            init,
            rescheduleIfEnabled,
        };
    };

    const root = globalThis as typeof globalThis & {
        mainTimeAlarmController?: {
            createTimeAlarmController: typeof createTimeAlarmController;
        };
    };
    root.mainTimeAlarmController = { createTimeAlarmController };
}
