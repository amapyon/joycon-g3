type RumbleCall = {
    seconds: number;
    shouldRumble: boolean;
};

type MockAudio = {
    play: () => Promise<void>;
    volume: number;
};

type NotificationPlayerOptions = {
    sendRumble: (seconds: number, shouldRumble: boolean) => void;
    createAudio: (audioUrl: string) => MockAudio;
    now: () => number;
    initialDelayMs?: number;
};

type NotificationPlayerInstance = {
    setDelayMs: (delayMs: number) => number;
    getDelayMs: () => number;
    resetPlayed: () => void;
    handleTick: (configs: { time: number; filename: string; absolutePath: string; rumble?: boolean }[], currentSeconds: number) => void;
};

type NotificationPlayerCtor = new (options: NotificationPlayerOptions) => NotificationPlayerInstance;

/**
 * NotificationPlayer テストで共通利用するモック群を生成する。
 * @param NotificationPlayer NotificationPlayer クラス
 * @param initialDelayMs 初期遅延
 * @returns 生成したプレイヤーと呼び出し履歴
 */
export function createNotificationPlayerHarness(
    NotificationPlayer: NotificationPlayerCtor,
    initialDelayMs: number = 0,
): {
    player: NotificationPlayerInstance;
    rumbleCalls: RumbleCall[];
} {
    const rumbleCalls: RumbleCall[] = [];
    const player = new NotificationPlayer({
        sendRumble: (seconds: number, shouldRumble: boolean): void => {
            rumbleCalls.push({ seconds, shouldRumble });
        },
        createAudio: (): MockAudio => ({
            volume: 1,
            play: async (): Promise<void> => {
                return;
            },
        }),
        now: (): number => 0,
        initialDelayMs,
    });

    return { player, rumbleCalls };
}
