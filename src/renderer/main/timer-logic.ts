type TimerMainLogicApi = {
    formatPresetLabel: (seconds: number) => string;
    formatTimeForDisplay: (seconds: number) => string;
    normalizeSoundPlayDelay: (input: number, defaultDelay: number, min: number, max: number) => number;
    parseCountdownInitialValue: (rawValue: string, min: number, max: number) => number | null;
    buildMediaAbsolutePath: (basePath: string, filename: string) => string;
    toFileUrl: (absolutePath: string) => string;
};

/**
 * プリセットの表示ラベルを作成する。
 * @param seconds 秒数
 * @returns 表示ラベル
 */
function formatPresetLabel(seconds: number): string {
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs === 0 ? `${mins}m` : `${mins}m${secs}s`;
}

/**
 * 秒数を表示用の文字列に整形する。
 * @param seconds 秒数
 * @returns 表示用文字列
 */
function formatTimeForDisplay(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * サウンド再生遅延を許容範囲内へ正規化する。
 * @param input 入力値
 * @param defaultDelay 既定値
 * @param min 最小値
 * @param max 最大値
 * @returns 正規化済み遅延値
 */
function normalizeSoundPlayDelay(input: number, defaultDelay: number, min: number, max: number): number {
    if (Number.isNaN(input)) {
        return defaultDelay;
    }
    return Math.min(Math.max(input, min), max);
}

/**
 * カウントダウン初期値の入力を検証する。
 * @param rawValue 入力文字列
 * @param min 最小値
 * @param max 最大値
 * @returns 妥当な値。無効な場合は null
 */
function parseCountdownInitialValue(rawValue: string, min: number, max: number): number | null {
    const parsed = parseInt(rawValue, 10);
    if (Number.isNaN(parsed) || parsed < min || parsed > max) {
        return null;
    }
    return parsed;
}

/**
 * メディアファイルの絶対パスを作成する。
 * @param basePath ベースディレクトリ
 * @param filename ファイル名
 * @returns 正規化された絶対パス
 */
function buildMediaAbsolutePath(basePath: string, filename: string): string {
    if (!filename) {
        return '';
    }
    const normalizedBasePath = basePath.replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/\/+$/, '');
    return `${normalizedBasePath}/${filename}`;
}

/**
 * 再生用の file URL を作成する。
 * @param absolutePath 絶対パス
 * @returns file URL
 */
function toFileUrl(absolutePath: string): string {
    if (!absolutePath) {
        return '';
    }
    return absolutePath.startsWith('file://') ? absolutePath : `file://${absolutePath}`;
}

const timerMainLogicApi: TimerMainLogicApi = {
    formatPresetLabel,
    formatTimeForDisplay,
    normalizeSoundPlayDelay,
    parseCountdownInitialValue,
    buildMediaAbsolutePath,
    toFileUrl,
};

const timerMainLogicRoot = (typeof window !== 'undefined' ? window : globalThis) as unknown as {
    timerMainLogic?: TimerMainLogicApi;
};
timerMainLogicRoot.timerMainLogic = timerMainLogicApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = timerMainLogicApi;
}
