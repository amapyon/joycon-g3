import winax from 'winax';

type WScriptShell = {
    AppActivate?: (title: string) => boolean;
    SendKeys?: (keys: string) => void;
    isNull?: boolean;
};

/**
 * Google スライドをキーボード操作で制御する。
 */
class GoogleSlidesControl {
    private shell: WScriptShell | null = null;
    private readonly isWindows: boolean = process.platform === 'win32';
    private readonly titleCandidates: string[] = [
        'Google Slides',
        'Google スライド',
        'Google Chrome',
        'Chrome',
        'Microsoft Edge',
        'Edge',
    ];

    /**
     * WScript.Shell に接続する。
     * @returns 接続成功かどうか
     */
    private connect(): boolean {
        if (!this.isWindows) {
            return false;
        }
        if (this.shell && !this.shell.isNull) {
            return true;
        }
        try {
            this.shell = new winax.Object('WScript.Shell') as unknown as WScriptShell;
            return !!this.shell && !this.shell.isNull;
        } catch {
            this.shell = null;
            return false;
        }
    }

    /**
     * Google スライドのウィンドウをアクティブ化する。
     * @returns アクティブ化に成功したかどうか
     */
    private activateSlidesWindow(): boolean {
        if (!this.connect() || !this.shell || !this.shell.AppActivate) {
            return false;
        }
        for (const title of this.titleCandidates) {
            try {
                if (this.shell.AppActivate(title)) {
                    return true;
                }
            } catch {
                continue;
            }
        }
        return false;
    }

    /**
     * アクティブウィンドウにキー操作を送る。
     * @param key 送信するキー
     * @returns 送信できたかどうか
     */
    private sendKeyToActiveWindow(key: string): boolean {
        if (!this.connect() || !this.shell || !this.shell.SendKeys) {
            return false;
        }
        try {
            this.shell.SendKeys(key);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Google スライドにキー操作を送る。
     * @param key 送信するキー
     * @returns 送信できたかどうか
     */
    private sendKey(key: string): boolean {
        if (this.activateSlidesWindow()) {
            return this.sendKeyToActiveWindow(key);
        }
        return this.sendKeyToActiveWindow(key);
    }

    /**
     * 次のスライドへ進める。
     * @returns 実行成功かどうか
     */
    next(): boolean {
        return this.sendKey('{RIGHT}');
    }

    /**
     * 前のスライドへ戻る。
     * @returns 実行成功かどうか
     */
    previous(): boolean {
        return this.sendKey('{LEFT}');
    }
}

const googleSlidesControlInstance = new GoogleSlidesControl();
export default googleSlidesControlInstance;
