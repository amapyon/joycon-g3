export type JoyConConnectState = {
    isConnected: boolean;
    isConnecting: boolean;
};

/**
 * 接続試行をスキップすべきか判定する。
 * @param path デバイスパス
 * @param state 接続状態
 * @returns スキップする場合は true
 */
export function shouldSkipConnect(path: string | null, state: JoyConConnectState): boolean {
    if (!path) {
        return true;
    }
    return state.isConnected || state.isConnecting;
}

/**
 * 自動再接続を試行すべきか判定する。
 * @param path デバイスパス
 * @param isConnected 接続済みかどうか
 * @param autoConnect 自動接続フラグ
 * @returns 試行する場合は true
 */
export function shouldAttemptAutoConnect(path: string | null, isConnected: boolean, autoConnect: boolean): boolean {
    if (isConnected) {
        return false;
    }
    return !!path && autoConnect;
}
