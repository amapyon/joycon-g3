type TimerMainLogicApi = {
    formatPresetLabel: (seconds: number) => string;
    formatTimeForDisplay: (seconds: number) => string;
    normalizeSoundPlayDelay: (input: number, defaultDelay: number, min: number, max: number) => number;
    parseCountdownInitialValue: (rawValue: string, min: number, max: number) => number | null;
    buildMediaAbsolutePath: (basePath: string, filename: string) => string;
    toFileUrl: (absolutePath: string) => string;
};

type TimerMainTimeFormatApi = {
    formatMinutesSeconds: (seconds: number) => string;
};

type TimerMainPresetLabelApi = {
    formatTimerPresetLabel: (seconds: number) => string;
};

type TimerMainNumberUtilsApi = {
    clamp: (value: number, min: number, max: number) => number;
    normalizeNumber: (value: number, fallback: number, min: number, max: number) => number;
};

type TimerMainFileUrlUtilsApi = {
    toFileUrl: (path: string) => string;
};

type TimerMainParseNumberUtilsApi = {
    parseIntOrFallback: (raw: string | null | undefined, fallback: number) => number;
    parseFloatOrFallback: (raw: string | null | undefined, fallback: number) => number;
    parseIntOrNull: (raw: string | null | undefined) => number | null;
};

const timerMainApiResolverUtils = ((): { resolveApi: <T>(globalKey: string, requirePath: string) => T } => {
    const root = globalThis as unknown as {
        rendererApiResolverUtils?: { resolveApi: <T>(globalKey: string, requirePath: string) => T };
    };
    if (root.rendererApiResolverUtils) {
        return root.rendererApiResolverUtils;
    }
    if (typeof require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return require('../api-resolver-utils') as { resolveApi: <T>(globalKey: string, requirePath: string) => T };
    }
    throw new Error('rendererApiResolverUtils API is not available');
})();

const timerMainTimeFormatApi: TimerMainTimeFormatApi = timerMainApiResolverUtils.resolveApi<TimerMainTimeFormatApi>('timerTimeFormat', './time-format-utils');
const timerMainPresetLabelApi: TimerMainPresetLabelApi = timerMainApiResolverUtils.resolveApi<TimerMainPresetLabelApi>('timerPresetLabel', './preset-label-utils');
const timerMainNumberUtilsApi: TimerMainNumberUtilsApi = timerMainApiResolverUtils.resolveApi<TimerMainNumberUtilsApi>('numberUtils', './number-utils');
const timerMainFileUrlUtilsApi: TimerMainFileUrlUtilsApi = timerMainApiResolverUtils.resolveApi<TimerMainFileUrlUtilsApi>('fileUrlUtils', './file-url-utils');
const timerMainParseNumberUtilsApi: TimerMainParseNumberUtilsApi = timerMainApiResolverUtils.resolveApi<TimerMainParseNumberUtilsApi>('parseNumberUtils', './parse-number-utils');

/**
 * プリセットの表示ラベルを作成する。
 * @param seconds 秒数
 * @returns 表示ラベル
 */
function formatPresetLabel(seconds: number): string {
    return timerMainPresetLabelApi.formatTimerPresetLabel(seconds);
}

/**
 * 秒数を表示用の文字列に整形する。
 * @param seconds 秒数
 * @returns 表示用文字列
 */
function formatTimeForDisplay(seconds: number): string {
    return timerMainTimeFormatApi.formatMinutesSeconds(seconds);
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
    return timerMainNumberUtilsApi.normalizeNumber(input, defaultDelay, min, max);
}

/**
 * カウントダウン初期値の入力を検証する。
 * @param rawValue 入力文字列
 * @param min 最小値
 * @param max 最大値
 * @returns 妥当な値。無効な場合は null
 */
function parseCountdownInitialValue(rawValue: string, min: number, max: number): number | null {
    const parsed = timerMainParseNumberUtilsApi.parseIntOrNull(rawValue);
    if (parsed === null || parsed < min || parsed > max) {
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
    return timerMainFileUrlUtilsApi.toFileUrl(absolutePath);
}

const timerMainLogicApi: TimerMainLogicApi = {
    formatPresetLabel,
    formatTimeForDisplay,
    normalizeSoundPlayDelay,
    parseCountdownInitialValue,
    buildMediaAbsolutePath,
    toFileUrl,
};

const timerMainLogicRoot = globalThis as unknown as {
    timerMainLogic?: TimerMainLogicApi;
};
timerMainLogicRoot.timerMainLogic = timerMainLogicApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = timerMainLogicApi;
}
