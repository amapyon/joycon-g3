((): void => {
    type MainWindowApiAccessorApi = import('../../shared/main-window-api-types').MainWindowApiAccessorApi;

    type GlobalApiRegistry = typeof globalThis & Record<string, unknown>;

    /**
     * グローバルに登録された API を取得する。
     * @param key API 名
     * @returns 取得した API
     */
    const getApi = <T>(key: string): T => {
        const root = globalThis as GlobalApiRegistry;
        const api = root[key];
        if (typeof api === 'undefined') {
            throw new Error(`${key} is not available`);
        }
        return api as T;
    };

    /**
     * グローバルへ API を登録する。
     * @param key API 名
     * @param value API 本体
     * @returns なし
     */
    const setApi = <T>(key: string, value: T): void => {
        const root = globalThis as GlobalApiRegistry;
        root[key] = value as unknown;
    };

    const mainWindowApiAccessor: MainWindowApiAccessorApi = {
        getApi,
        setApi,
    };

    const root = globalThis as typeof globalThis & {
        mainWindowApiAccessor?: MainWindowApiAccessorApi;
    };
    root.mainWindowApiAccessor = mainWindowApiAccessor;
})();
