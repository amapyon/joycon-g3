export {};
import { createNotificationPlayerHarness } from './test-utils/notification-player-mocks';
// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const { NotificationPlayer } = require('../renderer/timer/notification-player') as {
    NotificationPlayer: {
        new (options: {
            sendRumble: (seconds: number, shouldRumble: boolean) => void;
            createAudio: (audioUrl: string) => { play: () => Promise<void>; volume: number };
            now: () => number;
            initialDelayMs?: number;
        }): {
            setDelayMs: (delayMs: number) => number;
            getDelayMs: () => number;
            resetPlayed: () => void;
            handleTick: (configs: { time: number; filename: string; absolutePath: string; rumble?: boolean }[], currentSeconds: number) => void;
        };
        normalizeDelay: (delayMs: number) => number;
    };
};

describe('通知プレイヤー', (): void => {
    it('遅延値を正規化する', (): void => {
        expect(NotificationPlayer.normalizeDelay(Number.NaN)).toBe(200);
        expect(NotificationPlayer.normalizeDelay(-1)).toBe(0);
        expect(NotificationPlayer.normalizeDelay(9999)).toBe(5000);
    });

    it('一致した通知で振動トリガーが呼ばれる', (): void => {
        const { player, rumbleCalls } = createNotificationPlayerHarness(NotificationPlayer, 0);

        const configs = [
            { time: 5, filename: '', absolutePath: '', rumble: true },
            { time: 10, filename: '', absolutePath: '' },
        ];

        player.handleTick(configs, 5);

        expect(rumbleCalls).toEqual([{ seconds: 5, shouldRumble: true }]);
    });

    it('同じインデックスは重複再生しない', (): void => {
        const { player, rumbleCalls } = createNotificationPlayerHarness(NotificationPlayer, 0);

        const configs = [{ time: 5, filename: '', absolutePath: '', rumble: true }];

        player.handleTick(configs, 5);
        player.handleTick(configs, 5);

        expect(rumbleCalls.length).toBe(1);
    });
});
