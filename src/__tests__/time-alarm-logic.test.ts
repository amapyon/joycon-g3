import type { TimerNotificationConfig } from '../shared/timer-notification-config';

type TimeAlarmLogicApi = {
    parseTimeAlarmTargetTime: (raw: string) => { hour: number; minute: number } | null;
    resolveTimeAlarmSchedules: (
        now: Date,
        rawTargetTime: string,
        notifications: TimerNotificationConfig[]
    ) => Array<{ fireAt: Date; notification: TimerNotificationConfig }>;
};
type TimeAlarmSchedule = { fireAt: Date; notification: TimerNotificationConfig };

// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const timeAlarmLogic = require('../renderer/main/time-alarm-logic') as TimeAlarmLogicApi;

describe('time-alarm-logic', () => {
    const createNotification = (time: number, filename: string = ''): TimerNotificationConfig => ({
        time,
        filename,
        absolutePath: '',
        rumble: false,
    });

    test('HH:mm 形式の時刻を解析する', () => {
        expect(timeAlarmLogic.parseTimeAlarmTargetTime('09:05')).toEqual({ hour: 9, minute: 5 });
    });

    test('空文字や不正な時刻は無効にする', () => {
        expect(timeAlarmLogic.parseTimeAlarmTargetTime('')).toBeNull();
        expect(timeAlarmLogic.parseTimeAlarmTargetTime('25:99')).toBeNull();
    });

    test('通知設定がない場合は予約しない', () => {
        const schedules = timeAlarmLogic.resolveTimeAlarmSchedules(new Date('2026-07-09T09:00:00'), '10:00', []);

        expect(schedules).toEqual([]);
    });

    test('指定時刻から通知秒数を引いた時刻を予約する', () => {
        const schedules = timeAlarmLogic.resolveTimeAlarmSchedules(
            new Date('2026-07-09T09:00:00'),
            '10:00',
            [createNotification(60, 'a.wav'), createNotification(10, 'b.wav')]
        );

        expect(schedules.map((schedule: TimeAlarmSchedule) => schedule.fireAt.toISOString())).toEqual([
            new Date('2026-07-09T09:59:00').toISOString(),
            new Date('2026-07-09T09:59:50').toISOString(),
        ]);
    });

    test('当日すでに過ぎた通知は予約しない', () => {
        const schedules = timeAlarmLogic.resolveTimeAlarmSchedules(
            new Date('2026-07-09T09:59:30'),
            '10:00',
            [createNotification(60), createNotification(10)]
        );

        expect(schedules.map((schedule: TimeAlarmSchedule) => schedule.notification.time)).toEqual([10]);
    });

    test('当日の通知がすべて過ぎていれば翌日分を全件予約する', () => {
        const schedules = timeAlarmLogic.resolveTimeAlarmSchedules(
            new Date('2026-07-09T10:01:00'),
            '10:00',
            [createNotification(60), createNotification(10)]
        );

        expect(schedules.map((schedule: TimeAlarmSchedule) => schedule.fireAt.toISOString())).toEqual([
            new Date('2026-07-10T09:59:00').toISOString(),
            new Date('2026-07-10T09:59:50').toISOString(),
        ]);
    });

    test('日付をまたぐ通知時刻を許可する', () => {
        const schedules = timeAlarmLogic.resolveTimeAlarmSchedules(
            new Date('2026-07-08T23:00:00'),
            '00:05',
            [createNotification(600)]
        );

        expect(schedules[0].fireAt.toISOString()).toBe(new Date('2026-07-08T23:55:00').toISOString());
    });

    test('同時刻の通知は同じ発火時刻で返す', () => {
        const schedules = timeAlarmLogic.resolveTimeAlarmSchedules(
            new Date('2026-07-09T09:00:00'),
            '10:00',
            [createNotification(30, 'a.wav'), createNotification(30, 'b.wav')]
        );

        expect(schedules[0].fireAt.getTime()).toBe(schedules[1].fireAt.getTime());
    });
});
