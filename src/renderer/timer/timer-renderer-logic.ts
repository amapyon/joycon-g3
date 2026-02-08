type TimerMode = import('../../shared/timer-mode').TimerMode;

type TimerRendererLogicNotificationConfig = import('../../shared/timer-notification-config').TimerNotificationConfig;
type TimerRendererWheelActionUtilsSharedApi = import('../../shared/wheel-action-types').WheelActionUtilsApi;
type TimerRendererTickResult = import('../../shared/timer-renderer-types').TimerRendererTickResult;
type TimerRendererTickAction = import('../../shared/timer-renderer-types').TimerRendererTickAction;
type TimerRendererLogicApi = import('../../shared/timer-renderer-types').TimerRendererLogicApi;

const timerRendererLogicApiResolverUtils = ((): { resolveApi: <T>(globalKey: string, requirePath: string) => T } => {
    const root = globalThis as typeof globalThis & {
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

const timerRendererWheelActionUtilsApi: TimerRendererWheelActionUtilsSharedApi =
    timerRendererLogicApiResolverUtils.resolveApi<TimerRendererWheelActionUtilsSharedApi>('wheelActionUtils', './wheel-action-utils');

/**
 * 通知設定の rumble 値を明示的な真偽値へ正規化する。
 * @param configs 通知設定一覧
 * @returns 正規化後の通知設定一覧
 */
function normalizeNotifications(
    configs: TimerRendererLogicNotificationConfig[]
): TimerRendererLogicNotificationConfig[] {
    return configs.map((config: TimerRendererLogicNotificationConfig) => ({
        ...config,
        rumble: !!config.rumble,
    }));
}

/**
 * カウントダウンのティック結果から次の表示更新アクションを決定する。
 * @param tickResult ティック結果
 * @param currentInitialValue 現在の初期値
 * @returns 表示更新アクション
 */
function resolveTickAction(
    tickResult: TimerRendererTickResult | null,
    currentInitialValue: number
): TimerRendererTickAction {
    if (!tickResult) {
        return { kind: 'none' };
    }
    if (!tickResult.shouldStop) {
        return {
            kind: 'continue',
            displaySeconds: tickResult.remaining,
            sendSeconds: tickResult.remaining,
        };
    }
    return {
        kind: 'finish',
        displaySeconds: currentInitialValue,
        sendSeconds: tickResult.remaining,
    };
}

/**
 * モードに応じたメニュー表示可否を返す。
 * @param mode タイマーモード
 * @returns setup モードなら true
 */
function shouldShowSetupMenu(mode: TimerMode): boolean {
    return mode === 'setup';
}

const timerRendererLogicApi: TimerRendererLogicApi = {
    normalizeNotifications,
    resolveWheelAction: timerRendererWheelActionUtilsApi.resolveWheelAction,
    resolveTickAction,
    shouldShowSetupMenu,
};

const timerRendererLogicRoot = globalThis as typeof globalThis & {
    timerRendererLogic?: TimerRendererLogicApi;
};
timerRendererLogicRoot.timerRendererLogic = timerRendererLogicApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = timerRendererLogicApi;
}
