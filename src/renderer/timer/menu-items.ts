export type TimerMenuItem = import('../../shared/timer-renderer-types').TimerMenuItem;

type TimerMenuItemsPresetLabelApi = {
    formatTimerPresetLabel: (seconds: number) => string;
};

type TimerMenuItemsApiResolverBootstrapApi = import('../../shared/renderer-api-resolver-types').RendererApiResolverBootstrapApi;

const timerMenuItemsApiResolverUtils = ((): import('../../shared/renderer-api-resolver-types').RendererApiResolverUtilsApi => {
    const root = globalThis as typeof globalThis & {
        rendererApiResolverBootstrap?: TimerMenuItemsApiResolverBootstrapApi;
    };
    if (root.rendererApiResolverBootstrap) {
        return root.rendererApiResolverBootstrap.getRendererApiResolverUtils('../api-resolver-access');
    }
    if (typeof require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return (require('../api-resolver-utils') as TimerMenuItemsApiResolverBootstrapApi).getRendererApiResolverUtils('../api-resolver-access');
    }
    throw new Error('rendererApiResolverBootstrap API is not available');
})();

const timerMenuItemsPresetLabelApi: TimerMenuItemsPresetLabelApi = timerMenuItemsApiResolverUtils.resolveApi<TimerMenuItemsPresetLabelApi>('timerPresetLabel', './preset-label-utils');

/**
 * メニュー項目を生成する。
 * @param presets プリセット一覧
 * @returns メニュー項目
 */
export function buildMenuItems(presets: number[]): TimerMenuItem[] {
    const items: TimerMenuItem[] = presets.map((time: number) => ({
        type: 'preset',
        time,
        label: timerMenuItemsPresetLabelApi.formatTimerPresetLabel(time),
    }));

    items.push({ type: 'add-minute', label: '+1分' });
    items.push({ type: 'clock', label: 'Clock' });
    return items;
}

const root = globalThis as typeof globalThis & {
    timerMenuItems?: { buildMenuItems: (presets: number[]) => TimerMenuItem[] };
};

root.timerMenuItems = { buildMenuItems };
