import winax from 'winax';
import { execFileSync } from 'child_process';

type WScriptShell = {
    AppActivate?: (title: string | number) => boolean;
    SendKeys?: (keys: string) => void;
    isNull?: boolean;
};

type GoogleSlidesWindowInfo = {
    Id?: number;
    ProcessName?: string;
    MainWindowTitle?: string;
};

type ValidGoogleSlidesWindowInfo = {
    Id: number;
    MainWindowTitle: string;
};

/**
 * Google スライドをキーボード操作で制御する。
 */
class GoogleSlidesControl {
    private shell: WScriptShell | null = null;
    private readonly isWindows: boolean = process.platform === 'win32';
    private targetProcessId?: number;
    private targetWindowTitle?: string;
    private readonly titleCandidates: string[] = [
        'Google Slides',
        'Google スライド',
        'Google Chrome',
        'Chrome',
        'Microsoft Edge',
        'Edge',
    ];

    /**
     * PowerShell の JSON 出力を配列として読み込む。
     * @param raw JSON 文字列
     * @returns Google スライド候補の配列
     */
    private parseWindowInfoList(raw: string): GoogleSlidesWindowInfo[] {
        if (!raw.trim()) {
            return [];
        }
        const parsed = JSON.parse(raw) as GoogleSlidesWindowInfo | GoogleSlidesWindowInfo[];
        return Array.isArray(parsed) ? parsed : [parsed];
    }

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
        if (typeof this.targetProcessId === 'number') {
            try {
                if (this.shell.AppActivate(this.targetProcessId)) {
                    return true;
                }
            } catch {
                // 対象プロセスが閉じている場合はタイトルで再試行する。
            }
        }
        if (this.targetWindowTitle) {
            try {
                if (this.shell.AppActivate(this.targetWindowTitle)) {
                    return true;
                }
            } catch {
                // 固定タイトルで失敗した場合は候補タイトルで再試行する。
            }
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
     * 起動中の Google スライド候補を取得する。
     * @returns Google スライド候補の一覧
     */
    getOpenPresentations(): Array<{ id: string; name: string; isRunning: boolean; type: 'google-slides' }> {
        if (!this.isWindows) {
            return [];
        }
        try {
            const script = [
                '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;',
                '$OutputEncoding = [System.Text.Encoding]::UTF8;',
                '$items = Get-Process | Where-Object {',
                '    $_.MainWindowTitle -and',
                '    $_.ProcessName -match "^(chrome|msedge)$" -and',
                '    $_.MainWindowTitle -match "Google (Slides|スライド)"',
                '} | Select-Object Id,ProcessName,MainWindowTitle;',
                '$items | ConvertTo-Json -Compress',
            ].join(' ');
            const raw = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
                encoding: 'utf8',
                windowsHide: true,
            });
            return this.parseWindowInfoList(raw)
                .filter((item: GoogleSlidesWindowInfo): item is ValidGoogleSlidesWindowInfo => {
                    return typeof item.Id === 'number' && typeof item.MainWindowTitle === 'string' && item.MainWindowTitle.length > 0;
                })
                .map((item: ValidGoogleSlidesWindowInfo) => ({
                    id: String(item.Id),
                    name: item.MainWindowTitle,
                    isRunning: true,
                    type: 'google-slides',
                }));
        } catch {
            return [];
        }
    }

    /**
     * 操作対象の Google スライドを設定する。
     * @param identifier プロセス ID
     */
    setTarget(identifier: string): void {
        const processId = Number.parseInt(identifier, 10);
        this.targetProcessId = Number.isFinite(processId) ? processId : undefined;
        const target = this.getOpenPresentations().find(
            (presentation: { id: string; name: string; isRunning: boolean; type: 'google-slides' }): boolean => presentation.id === identifier,
        );
        this.targetWindowTitle = target?.name;
        this.activateSlidesWindow();
    }

    /**
     * 操作対象の Google スライドが設定されているかを返す。
     * @returns 設定済みの場合は true
     */
    hasTarget(): boolean {
        return typeof this.targetProcessId === 'number' || !!this.targetWindowTitle;
    }

    /**
     * 操作対象の Google スライド設定を解除する。
     */
    clearTarget(): void {
        this.targetProcessId = undefined;
        this.targetWindowTitle = undefined;
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
