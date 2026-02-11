((): void => {
    type TimerStyleStateApi = import('../../shared/timer-renderer-types').TimerStyleStateApi;
    type TimerStyleStateApiResolverBootstrapApi = import('../../shared/renderer-api-resolver-types').RendererApiResolverBootstrapApi;
    type TimerStyleNumberUtilsApi = {
        clamp: (value: number, min: number, max: number) => number;
    };

    const timerStyleStateApiResolverUtils = ((): import('../../shared/renderer-api-resolver-types').RendererApiResolverUtilsApi => {
        const root = globalThis as typeof globalThis & {
            rendererApiResolverBootstrap?: TimerStyleStateApiResolverBootstrapApi;
        };
        if (root.rendererApiResolverBootstrap) {
            return root.rendererApiResolverBootstrap.getRendererApiResolverUtils('../api-resolver-access');
        }
        if (typeof require !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
            return (require('../api-resolver-utils') as TimerStyleStateApiResolverBootstrapApi).getRendererApiResolverUtils('../api-resolver-access');
        }
        throw new Error('rendererApiResolverBootstrap API is not available');
    })();

    const timerStyleNumberUtilsApi = timerStyleStateApiResolverUtils.resolveApi<TimerStyleNumberUtilsApi>('numberUtils', './number-utils');

    /**
     * 数値を指定範囲に収める。
     * @param value 対象値
     * @param min 最小値
     * @param max 最大値
    * @returns 補正後の値
     */
    const clampNumber = (value: number, min: number, max: number): number => {
        return timerStyleNumberUtilsApi.clamp(value, min, max);
    };

    /**
     * フォントサイズの次の値を計算する。
     * @param current 現在値
     * @param delta 増減量
     * @param min 最小値
     * @param max 最大値
     * @returns 計算後のフォントサイズ
     */
    const calcNextFontSize = (current: number, delta: number, min: number, max: number): number => {
        return clampNumber(current + delta, min, max);
    };

    /**
     * 透明度の次の値を計算する。
     * @param current 現在値
     * @param delta 増減量
     * @param min 最小値
     * @param max 最大値
     * @returns 計算後の透明度
     */
    const calcNextOpacity = (current: number, delta: number, min: number, max: number): number => {
        return clampNumber(current + delta, min, max);
    };

    const api: TimerStyleStateApi = {
        clampNumber,
        calcNextFontSize,
        calcNextOpacity,
    };

    const root = globalThis as typeof globalThis & { timerStyleState?: TimerStyleStateApi };
    root.timerStyleState = api;
})();
