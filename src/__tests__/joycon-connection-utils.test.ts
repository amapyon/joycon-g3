import { shouldAttemptAutoConnect, shouldSkipConnect } from '../main/joycon-connection-utils';

describe('Joy-Con接続ユーティリティ', (): void => {
    it('パス未指定または接続中/接続済みなら接続試行をスキップする', (): void => {
        expect(shouldSkipConnect(null, { isConnected: false, isConnecting: false })).toBe(true);
        expect(shouldSkipConnect('path', { isConnected: true, isConnecting: false })).toBe(true);
        expect(shouldSkipConnect('path', { isConnected: false, isConnecting: true })).toBe(true);
    });

    it('パスがあり未接続かつ未接続処理中なら接続試行を許可する', (): void => {
        expect(shouldSkipConnect('path', { isConnected: false, isConnecting: false })).toBe(false);
    });

    it('自動再接続条件を判定する', (): void => {
        expect(shouldAttemptAutoConnect('path', false, true)).toBe(true);
        expect(shouldAttemptAutoConnect(null, false, true)).toBe(false);
        expect(shouldAttemptAutoConnect('path', false, false)).toBe(false);
        expect(shouldAttemptAutoConnect('path', true, true)).toBe(false);
    });
});
