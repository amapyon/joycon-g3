export type TimerMenuItem =
    | { type: 'preset'; time: number; label: string }
    | { type: 'add-minute'; label: string };

type TimerMenuItemsPresetLabelApi = {
    formatTimerPresetLabel: (seconds: number) => string;
};

type TimerMenuItemsApiResolverAccessApi = import('../../shared/renderer-api-resolver-types').RendererApiResolverAccessApi;

const timerMenuItemsApiResolverUtils = ((): import('../../shared/renderer-api-resolver-types').RendererApiResolverUtilsApi => {
    const root = globalThis as typeof globalThis & {
        rendererApiResolverAccess?: TimerMenuItemsApiResolverAccessApi;
    };
    if (root.rendererApiResolverAccess) {
        return root.rendererApiResolverAccess.getRendererApiResolverUtils();
    }
    if (typeof require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return (require('../api-resolver-access') as TimerMenuItemsApiResolverAccessApi).getRendererApiResolverUtils();
    }
    throw new Error('rendererApiResolverAccess API is not available');
})();

const timerMenuItemsPresetLabelApi: TimerMenuItemsPresetLabelApi = timerMenuItemsApiResolverUtils.resolveApi<TimerMenuItemsPresetLabelApi>('timerPresetLabel', './preset-label-utils');

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

const root = globalThis as typeof globalThis & {
    timerMenuItems?: { buildMenuItems: (presets: number[]) => TimerMenuItem[] };
};

root.timerMenuItems = { buildMenuItems };
