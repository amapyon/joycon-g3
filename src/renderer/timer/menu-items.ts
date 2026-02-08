export type TimerMenuItem =
    | { type: 'preset'; time: number; label: string }
    | { type: 'add-minute'; label: string };

type TimerMenuItemsPresetLabelApi = {
    formatTimerPresetLabel: (seconds: number) => string;
};

/**
 * プリセットラベルAPIを取得する。
 * @returns プリセットラベルAPI
 */
function resolveTimerMenuItemsPresetLabelApi(): TimerMenuItemsPresetLabelApi {
    const timerPresetLabelRoot = (typeof window !== 'undefined' ? window : globalThis) as unknown as {
        timerPresetLabel?: TimerMenuItemsPresetLabelApi;
    };
    if (timerPresetLabelRoot.timerPresetLabel) {
        return timerPresetLabelRoot.timerPresetLabel;
    }
    if (typeof require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return require('../preset-label-utils') as TimerMenuItemsPresetLabelApi;
    }
    throw new Error('timerPresetLabel API is not available');
}

const timerMenuItemsPresetLabelApi: TimerMenuItemsPresetLabelApi = resolveTimerMenuItemsPresetLabelApi();

/**
 * タイマーウィンドウのプリセット表示ラベルを生成する。
 * @param seconds 秒数
 * @returns 表示ラベル
 */
function formatTimerWindowPresetLabel(seconds: number): string {
    return timerMenuItemsPresetLabelApi.formatTimerPresetLabel(seconds);
}

/**
 * メニュー項目を生成する。
 * @param presets プリセット一覧
 * @returns メニュー項目
 */
export function buildMenuItems(presets: number[]): TimerMenuItem[] {
    const items: TimerMenuItem[] = presets.map((time: number) => ({
        type: 'preset',
        time,
        label: formatTimerWindowPresetLabel(time),
    }));

    items.push({ type: 'add-minute', label: '+1分' });
    return items;
}

const root = (typeof window !== 'undefined' ? window : globalThis) as unknown as {
    timerMenuItems?: { buildMenuItems: (presets: number[]) => TimerMenuItem[] };
};

root.timerMenuItems = { buildMenuItems };
