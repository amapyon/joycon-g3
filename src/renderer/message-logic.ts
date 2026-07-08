type MessageWheelActionShared = import('../shared/wheel-action-types').WheelAction;

type MessageLogicApi = {
    normalizeNumber: (value: number, fallback: number, min: number, max: number) => number;
    resolveWheelAction: (deltaY: number, shiftKey: boolean) => MessageWheelActionShared;
    isWheelTargetInZone: (target: Node | null, wheelZone: HTMLElement | null) => boolean;
    renderClockNotation: (html: string, date: Date) => string;
};

type MessageNumberUtilsApi = {
    normalizeNumber: (value: number, fallback: number, min: number, max: number) => number;
};

type MessageApiResolverBootstrapApi = import('../shared/renderer-api-resolver-types').RendererApiResolverBootstrapApi;

const messageApiResolverUtils = ((): import('../shared/renderer-api-resolver-types').RendererApiResolverUtilsApi => {
    const root = globalThis as typeof globalThis & {
        rendererApiResolverBootstrap?: MessageApiResolverBootstrapApi;
    };
    if (root.rendererApiResolverBootstrap) {
        return root.rendererApiResolverBootstrap.getRendererApiResolverUtils('./api-resolver-access');
    }
    if (typeof require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return (require('./api-resolver-utils') as MessageApiResolverBootstrapApi).getRendererApiResolverUtils('./api-resolver-access');
    }
    throw new Error('rendererApiResolverBootstrap API is not available');
})();

const messageWheelActionUtilsApi = messageApiResolverUtils.resolveApi<import('../shared/wheel-action-types').WheelActionUtilsApi>('wheelActionUtils', './wheel-action-utils');
const messageNumberUtilsApi: MessageNumberUtilsApi = messageApiResolverUtils.resolveApi<MessageNumberUtilsApi>('numberUtils', './number-utils');

/**
 * 数値を範囲内に正規化する。
 * @param value 値
 * @param fallback 既定値
 * @param min 最小値
 * @param max 最大値
 * @returns 正規化後の値
 */
function normalizeNumber(value: number, fallback: number, min: number, max: number): number {
    return messageNumberUtilsApi.normalizeNumber(value, fallback, min, max);
}

/**
 * ホイールイベントの対象がズーム操作ゾーン内か判定する。
 * @param target イベント対象
 * @param wheelZone ズーム操作ゾーン
 * @returns 対象がゾーン内なら true
 */
function isWheelTargetInZone(target: Node | null, wheelZone: HTMLElement | null): boolean {
    if (!target || !wheelZone) {
        return false;
    }
    return target === wheelZone || wheelZone.contains(target);
}

type ClockNotationOptions = {
    format: string;
    color: string;
    size: string;
};

const clockNotationPattern = /\{\{clock(?:\s+([^{}]*))?\}\}/gi;
const clockAttributePattern = /([a-zA-Z]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s]+))/g;

/**
 * HTMLとして扱う文字列をエスケープする。
 * @param value 入力値
 * @returns エスケープ済み文字列
 */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * 時計記法の属性を解析する。
 * @param rawAttributes 属性文字列
 * @returns 時計表示オプション
 */
function parseClockNotationOptions(rawAttributes: string): ClockNotationOptions {
    const options: ClockNotationOptions = {
        format: 'HH:mm:ss',
        color: '',
        size: '',
    };

    let match = clockAttributePattern.exec(rawAttributes);
    while (match) {
        const key = match[1].toLowerCase();
        const value = match[3] ?? match[4] ?? match[5] ?? '';
        if (key === 'format') {
            options.format = value || options.format;
        }
        if (key === 'color') {
            options.color = value;
        }
        if (key === 'size') {
            options.size = value;
        }
        match = clockAttributePattern.exec(rawAttributes);
    }
    clockAttributePattern.lastIndex = 0;

    return options;
}

/**
 * 時計表示の色指定として安全な値か判定する。
 * @param color 色指定
 * @returns 利用可能なら true
 */
function isSafeClockColor(color: string): boolean {
    return /^#[0-9a-fA-F]{3,8}$/.test(color) || /^[a-zA-Z]+$/.test(color);
}

/**
 * 時計表示のサイズ指定として安全な値か判定する。
 * @param size サイズ指定
 * @returns 利用可能なら true
 */
function isSafeClockSize(size: string): boolean {
    return /^\d+(?:\.\d+)?(?:px|pt|em|rem|%)?$/.test(size);
}

/**
 * 時計表示のstyle属性を生成する。
 * @param options 時計表示オプション
 * @returns style属性
 */
function buildClockStyle(options: ClockNotationOptions): string {
    const declarations: string[] = [];
    if (options.color && isSafeClockColor(options.color)) {
        declarations.push(`color: ${options.color}`);
    }
    if (options.size && isSafeClockSize(options.size)) {
        const size = /^\d+(?:\.\d+)?$/.test(options.size) ? `${options.size}px` : options.size;
        declarations.push(`font-size: ${size}`);
    }
    if (!declarations.length) {
        return '';
    }
    return ` style="${escapeHtml(declarations.join('; '))}"`;
}

/**
 * 日時フォーマットを適用する。
 * @param format フォーマット
 * @param date 表示対象の日時
 * @returns フォーマット済み文字列
 */
function formatClockDate(format: string, date: Date): string {
    const replacements: Record<string, string> = {
        YYYY: String(date.getFullYear()),
        YY: String(date.getFullYear()).slice(-2),
        MM: String(date.getMonth() + 1).padStart(2, '0'),
        M: String(date.getMonth() + 1),
        DD: String(date.getDate()).padStart(2, '0'),
        D: String(date.getDate()),
        HH: String(date.getHours()).padStart(2, '0'),
        H: String(date.getHours()),
        mm: String(date.getMinutes()).padStart(2, '0'),
        m: String(date.getMinutes()),
        ss: String(date.getSeconds()).padStart(2, '0'),
        s: String(date.getSeconds()),
    };
    return format.replace(/YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s/g, (token: string): string => replacements[token]);
}

/**
 * メッセージ内の時計記法を現在時刻の表示へ変換する。
 * @param html メッセージHTML
 * @param date 表示対象の日時
 * @returns 時計記法を変換したHTML
 */
function renderClockNotation(html: string, date: Date): string {
    return html.replace(clockNotationPattern, (_match: string, rawAttributes: string | undefined): string => {
        const options = parseClockNotationOptions(rawAttributes ?? '');
        const content = escapeHtml(formatClockDate(options.format, date));
        return `<span class="message-clock"${buildClockStyle(options)}>${content}</span>`;
    });
}

const messageLogicApi: MessageLogicApi = {
    normalizeNumber,
    resolveWheelAction: messageWheelActionUtilsApi.resolveWheelAction,
    isWheelTargetInZone,
    renderClockNotation,
};

const messageLogicRoot = globalThis as typeof globalThis & {
    messageLogic?: MessageLogicApi;
};
messageLogicRoot.messageLogic = messageLogicApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = messageLogicApi;
}
