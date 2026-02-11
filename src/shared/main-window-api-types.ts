export type MainWindowApiAccessorApi = {
    getApi: <T>(key: string) => T;
    setApi: <T>(key: string, value: T) => void;
};
