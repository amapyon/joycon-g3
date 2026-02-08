type TimerMode = import('../../shared/timer-mode').TimerMode;

type TimerRendererLogicNotificationConfig = import('../../shared/timer-notification-config').TimerNotificationConfig;

type WheelAction =
    | { kind: 'opacity'; delta: number }
    | { kind: 'fontSize'; delta: number };

type TickResult = {
    remaining: number;
    shouldStop: boolean;
};

type TickAction =
    | {
        kind: 'none';
    }
    | {
        kind: 'continue';
        displaySeconds: number;
        sendSeconds: number;
    }
    | {
        kind: 'finish';
        displaySeconds: number;
        sendSeconds: number;
    };

type TimerRendererLogicApi = {
    normalizeNotifications: (
        configs: TimerRendererLogicNotificationConfig[]
    ) => TimerRendererLogicNotificationConfig[];
    resolveWheelAction: (deltaY: number, shiftKey: boolean) => WheelAction;
    resolveTickAction: (tickResult: TickResult | null, currentInitialValue: number) => TickAction;
    shouldShowSetupMenu: (mode: TimerMode) => boolean;
};

type TimerRendererWheelActionUtilsApi = {
    resolveWheelAction: (deltaY: number, shiftKey: boolean) => WheelAction;
};

const timerRendererLogicApiResolverUtils = ((): { resolveApi: <T>(globalKey: string, requirePath: string) => T } => {
    const root = (typeof window !== 'undefined' ? window : globalThis) as unknown as {
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

const timerRendererWheelActionUtilsApi: TimerRendererWheelActionUtilsApi = timerRendererLogicApiResolverUtils.resolveApi<TimerRendererWheelActionUtilsApi>('wheelActionUtils', './wheel-action-utils');

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
 * ホイール操作の反映先と増減量を判定する。
 * @param deltaY ホイール変化量
 * @param shiftKey Shift 押下状態
 * @returns 操作種別と増減量
 */
function resolveWheelAction(deltaY: number, shiftKey: boolean): WheelAction {
    return timerRendererWheelActionUtilsApi.resolveWheelAction(deltaY, shiftKey);
}

/**
 * カウントダウンのティック結果から次の表示更新アクションを決定する。
 * @param tickResult ティック結果
 * @param currentInitialValue 現在の初期値
 * @returns 表示更新アクション
 */
function resolveTickAction(tickResult: TickResult | null, currentInitialValue: number): TickAction {
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
    resolveWheelAction,
    resolveTickAction,
    shouldShowSetupMenu,
};

const timerRendererLogicRoot = (typeof window !== 'undefined' ? window : globalThis) as unknown as {
    timerRendererLogic?: TimerRendererLogicApi;
};
timerRendererLogicRoot.timerRendererLogic = timerRendererLogicApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = timerRendererLogicApi;
}
