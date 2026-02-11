type TimerUiUtilsApi = {
    setSelectValue: (select: HTMLSelectElement, value: string) => void;
    resolveStoredCountdownInitialValue: (
        storedValue: string,
        parseCountdownInitialValue: (rawValue: string, min: number, max: number) => number | null,
        min: number,
        max: number,
    ) => number | null;
    previewSound: (
        filename: string,
        getMediaBasePath: () => Promise<string>,
        buildMediaAbsolutePath: (basePath: string, filename: string) => string,
        toFileUrl: (absolutePath: string) => string,
    ) => Promise<void>;
    applyStoredMediaDir: (
        storedDir: string,
        setMediaBasePath: (dir: string) => Promise<boolean>,
        removeStoredDir: () => void,
    ) => Promise<void>;
};

/**
 * セレクトボックスの値を安全に反映する。
 * @param select セレクトボックス
 * @param value 設定する値
 */
function setSelectValue(select: HTMLSelectElement, value: string): void {
    for (let index = 0; index < select.options.length; index += 1) {
        if (select.options[index].value === value) {
            select.selectedIndex = index;
            break;
        }
    }
}

/**
 * 保存済みカウントダウン初期値を解析する。
 * @param storedValue 保存値
 * @param parseCountdownInitialValue 解析関数
 * @param min 最小値
 * @param max 最大値
 * @returns 解析できた秒数。失敗時は null
 */
function resolveStoredCountdownInitialValue(
    storedValue: string,
    parseCountdownInitialValue: (rawValue: string, min: number, max: number) => number | null,
    min: number,
    max: number,
): number | null {
    if (!storedValue) {
        return null;
    }
    return parseCountdownInitialValue(storedValue, min, max);
}

/**
 * サウンドファイルをプレビュー再生する。
 * @param filename ファイル名
 * @param getMediaBasePath ベースパス取得関数
 * @param buildMediaAbsolutePath 絶対パス生成関数
 * @param toFileUrl file URL 変換関数
 */
async function previewSound(
    filename: string,
    getMediaBasePath: () => Promise<string>,
    buildMediaAbsolutePath: (basePath: string, filename: string) => string,
    toFileUrl: (absolutePath: string) => string,
): Promise<void> {
    if (!filename) {
        return;
    }
    const basePath = await getMediaBasePath();
    const absolutePath = buildMediaAbsolutePath(basePath, filename);
    const audioUrl = toFileUrl(absolutePath);
    try {
        const audio = new Audio(audioUrl);
        void audio.play();
    } catch {
        return;
    }
}

/**
 * 保存済みのサウンドフォルダーを反映する。
 * @param storedDir 保存済みディレクトリ
 * @param setMediaBasePath ベースパス設定関数
 * @param removeStoredDir 保存値削除関数
 */
async function applyStoredMediaDir(
    storedDir: string,
    setMediaBasePath: (dir: string) => Promise<boolean>,
    removeStoredDir: () => void,
): Promise<void> {
    if (!storedDir) {
        return;
    }
    const applied = await setMediaBasePath(storedDir);
    if (!applied) {
        removeStoredDir();
    }
}

const timerUiUtilsApi: TimerUiUtilsApi = {
    setSelectValue,
    resolveStoredCountdownInitialValue,
    previewSound,
    applyStoredMediaDir,
};

const root = globalThis as typeof globalThis & {
    timerUiUtils?: TimerUiUtilsApi;
};
root.timerUiUtils = timerUiUtilsApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = timerUiUtilsApi;
}
