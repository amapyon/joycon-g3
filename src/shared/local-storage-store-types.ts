/**
 * localStorage へのアクセスを集約する API。
 */
export type LocalStorageStoreApi = {
    getString: (key: string, fallback?: string) => string;
    setString: (key: string, value: string) => void;
    remove: (key: string) => void;
    getJsonValue: <T>(key: string, fallback: T) => T;
    setJsonValue: (key: string, value: unknown) => void;
};
