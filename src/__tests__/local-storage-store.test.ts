// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const localStorageStore = require('../renderer/local-storage-store') as import('../shared/local-storage-store-types').LocalStorageStoreApi;

describe('localStorage共通ストア', (): void => {
    const createLocalStorageMock = (): Storage => {
        const store = new Map<string, string>();
        return {
            get length(): number {
                return store.size;
            },
            clear: (): void => {
                store.clear();
            },
            getItem: (key: string): string | null => {
                const value = store.get(key);
                return value === undefined ? null : value;
            },
            key: (index: number): string | null => {
                const keys = Array.from(store.keys());
                return keys[index] ?? null;
            },
            removeItem: (key: string): void => {
                store.delete(key);
            },
            setItem: (key: string, value: string): void => {
                store.set(key, value);
            },
        };
    };

    beforeEach((): void => {
        Object.defineProperty(globalThis, 'localStorage', {
            value: createLocalStorageMock(),
            configurable: true,
            writable: true,
        });
        localStorage.clear();
    });

    it('文字列の取得と保存ができる', (): void => {
        expect(localStorageStore.getString('missing', 'fallback')).toBe('fallback');
        localStorageStore.setString('k', 'v');
        expect(localStorageStore.getString('k', '')).toBe('v');
    });

    it('JSON値の取得と保存ができる', (): void => {
        const fallback = [{ v: 1 }];
        expect(localStorageStore.getJsonValue('missing', fallback)).toEqual(fallback);
        localStorageStore.setJsonValue('json', [{ v: 2 }]);
        expect(localStorageStore.getJsonValue('json', fallback)).toEqual([{ v: 2 }]);
    });

    it('削除ができる', (): void => {
        localStorageStore.setString('tmp', 'x');
        localStorageStore.remove('tmp');
        expect(localStorageStore.getString('tmp', 'none')).toBe('none');
    });
});
