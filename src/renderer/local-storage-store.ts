{
type LocalStorageStoreApi = import('../shared/local-storage-store-types').LocalStorageStoreApi;

/**
 * localStorage の文字列値を取得する。
 * @param key キー
 * @param fallback 取得失敗時の既定値
 * @returns 取得値
 */
const getString = (key: string, fallback: string = ''): string => {
    const value = localStorage.getItem(key);
    if (value === null) {
        return fallback;
    }
    return value;
};

/**
 * localStorage へ文字列値を保存する。
 * @param key キー
 * @param value 値
 */
const setString = (key: string, value: string): void => {
    localStorage.setItem(key, value);
};

/**
 * localStorage の値を削除する。
 * @param key キー
 */
const remove = (key: string): void => {
    localStorage.removeItem(key);
};

/**
 * localStorage の JSON 値を取得する。
 * @param key キー
 * @param fallback 取得失敗時の既定値
 * @returns 取得値
 */
const getJsonValue = <T>(key: string, fallback: T): T => {
    const raw = localStorage.getItem(key);
    if (!raw) {
        return fallback;
    }
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
};

/**
 * localStorage へ JSON 値を保存する。
 * @param key キー
 * @param value 値
 */
const setJsonValue = (key: string, value: unknown): void => {
    localStorage.setItem(key, JSON.stringify(value));
};

const localStorageStoreApi: LocalStorageStoreApi = {
    getString,
    setString,
    remove,
    getJsonValue,
    setJsonValue,
};

const localStorageStoreRoot = globalThis as typeof globalThis & {
    localStorageStore?: LocalStorageStoreApi;
};
localStorageStoreRoot.localStorageStore = localStorageStoreApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = localStorageStoreApi;
}
}
