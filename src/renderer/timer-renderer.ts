{
type TimerMode = 'timer' | 'setup';
type TimerNotificationConfig = {
    time: number;
    filename: string;
    absolutePath: string;
    rumble?: boolean;
};
type TimerStyleStateApi = {
    calcNextFontSize: (current: number, delta: number, min: number, max: number) => number;
    calcNextOpacity: (current: number, delta: number, min: number, max: number) => number;
};
type TimerRendererElectronAPI = {
    onUpdateTimerNotifications: (callback: (configs: TimerNotificationConfig[]) => void) => void;
    sendTimerStatus: (isCounting: boolean) => void;
    sendTimerCountdownUpdate: (remainingTime: number) => void;
    sendTimerPauseStatus: (isPaused: boolean) => void;
    onChangeFontSize: (callback: (delta: number) => void) => void;
    onUpdateCountdownInitialValue: (callback: (value: number) => void) => void;
    onUpdateTimerPresets: (callback: (presets: number[]) => void) => void;
    onSetTimerMode: (callback: (mode: TimerMode) => void) => void;
    onStartCountdown: (callback: (duration: number) => void) => void;
    onJoyConButtonSrPressed: (callback: () => void) => void;
    onTimerMenuNavigate: (callback: (direction: number) => void) => void;
    onTimerMenuSelect: (callback: () => void) => void;
    onToggleTimerPause: (callback: () => void) => void;
    onAddMinuteTimer: (callback: () => void) => void;
    sendTimerNotificationTrigger: (seconds: number, shouldRumble: boolean) => void;
    onUpdateSoundPlayDelay: (callback: (delayMs: number) => void) => void;
};

type TimerStorageApi = {
    loadCountdownInitialValue: (fallback: number) => number;
    saveCountdownInitialValue: (value: number) => void;
    loadTimerFontSize: (fallback: number) => number;
    saveTimerFontSize: (value: number) => void;
    loadTimerPresets: (fallback: number[]) => number[];
    saveTimerPresets: (presets: number[]) => void;
    loadTimerOpacity: (fallback: number) => number;
    saveTimerOpacity: (opacity: number) => void;
    loadNotifications: (fallback: TimerNotificationConfig[]) => TimerNotificationConfig[];
    saveNotifications: (configs: TimerNotificationConfig[]) => void;
    loadSoundPlayDelay: () => number | null;
    saveSoundPlayDelay: (delayMs: number) => void;
};

type CountdownEngineOptions = { initialValue?: number; minSeconds?: number; maxSeconds?: number };

type CountdownEngineInstance = {
    getCurrentInitialValue: () => number;
    getCountdownValue: () => number;
    getDisplayValue: () => number;
    isActive: () => boolean;
    isCountingNow: () => boolean;
    getStatus: () => { isCounting: boolean; isPaused: boolean };
    canPause: () => boolean;
    canResume: () => boolean;
    decidePauseToggle: () => 'pause' | 'resume' | 'none';
    start: (duration: number) => number;
    stop: () => boolean;
    pause: () => boolean;
    resume: () => boolean;
    tick: () => { remaining: number; shouldStop: boolean } | null;
    addMinute: () => { nextRemaining: number; nextInitial: number };
    setInitialValue: (value: number) => number;
};

type CountdownEngineClass = { new (options?: CountdownEngineOptions): CountdownEngineInstance; formatTime: (seconds: number) => string; clampValue: (value: number, minSeconds?: number, maxSeconds?: number) => number };

type NotificationPlayerOptions = { sendRumble: (seconds: number, shouldRumble: boolean) => void; createAudio: (audioUrl: string) => HTMLAudioElement; now: () => number; initialDelayMs?: number };

type NotificationPlayerInstance = {
    setDelayMs: (delayMs: number) => number;
    getDelayMs: () => number;
    resetPlayed: () => void;
    handleTick: (configs: TimerNotificationConfig[], currentSeconds: number) => void;
};

type NotificationPlayerClass = { new (options: NotificationPlayerOptions): NotificationPlayerInstance; normalizeDelay: (delayMs: number) => number };

type MenuControllerOptions = {
    countdownMenuElement: HTMLElement | null;
    countdownMenuValueElement: HTMLElement | null;
    timerPresetsContainer: HTMLElement | null;
    formatTime: (seconds: number) => string;
    getDisplaySeconds: () => number;
    onSelectPreset: (seconds: number) => void;
    onAddMinute: () => void;
    onHideTimer: (resetText: boolean) => void;
    onShowTimer: () => void;
    onStopCountdown: () => void;
    onPresetFocus: (seconds: number) => void;
};

type MenuControllerInstance = {
    getIsVisible: () => boolean;
    setPresets: (presets: number[]) => void;
    setVisible: (visible: boolean) => void;
    toggleVisible: () => void;
    updateMenuDisplay: () => void;
    renderPresets: () => void;
    navigate: (direction: number) => void;
    selectCurrent: () => void;
};

type MenuControllerClass = { new (options: MenuControllerOptions): MenuControllerInstance };

type TimerRendererLogicApi = {
    normalizeNotifications: (configs: TimerNotificationConfig[]) => TimerNotificationConfig[];
    resolveWheelAction: (deltaY: number, shiftKey: boolean) => { kind: 'opacity' | 'fontSize'; delta: number };
    resolveTickAction: (
        tickResult: { remaining: number; shouldStop: boolean } | null,
        currentInitialValue: number
    ) => (
        | { kind: 'none' }
        | { kind: 'continue'; displaySeconds: number; sendSeconds: number }
        | { kind: 'finish'; displaySeconds: number; sendSeconds: number }
    );
    shouldShowSetupMenu: (mode: TimerMode) => boolean;
};

const electronAPI = (window as unknown as { electronAPI: TimerRendererElectronAPI }).electronAPI;
const timerStyleState = (window as unknown as { timerStyleState: TimerStyleStateApi }).timerStyleState;
const timerRendererLogic = (window as unknown as { timerRendererLogic: TimerRendererLogicApi }).timerRendererLogic;
const countdownTimerElement = document.getElementById('countdownTimer') as HTMLElement | null;
const countdownMenuElement = document.getElementById('countdownMenu') as HTMLElement | null;
const countdownMenuValueElement = document.getElementById('countdownMenuValue') as HTMLElement | null;
const timerPresetsContainer = document.getElementById('timer-presets-container') as HTMLElement | null;
const wheelZone = document.getElementById('wheel-zone') as HTMLElement | null;
const timerStorage = (window as unknown as { timerStorage: TimerStorageApi }).timerStorage;
const CountdownEngine = (window as unknown as { countdownEngine: { CountdownEngine: CountdownEngineClass } })
    .countdownEngine.CountdownEngine;
const NotificationPlayer = (window as unknown as { notificationPlayer: { NotificationPlayer: NotificationPlayerClass } })
    .notificationPlayer.NotificationPlayer;
const MenuController = (window as unknown as { menuController: { MenuController: MenuControllerClass } })
    .menuController.MenuController;
const initialCountdownValue = timerStorage.loadCountdownInitialValue(10);
const countdownEngine = new CountdownEngine({ initialValue: initialCountdownValue });
const formatTime = (seconds: number): string => CountdownEngine.formatTime(seconds);
const notificationPlayer = new NotificationPlayer({
    sendRumble: (seconds: number, shouldRumble: boolean): void => {
        electronAPI.sendTimerNotificationTrigger(seconds, shouldRumble);
    },
    createAudio: (audioUrl: string): HTMLAudioElement => new Audio(audioUrl),
    now: (): number => Date.now(),
    initialDelayMs: 200,
});
const menuController = new MenuController({
    countdownMenuElement,
    countdownMenuValueElement,
    timerPresetsContainer,
    formatTime,
    getDisplaySeconds: (): number => {
        return countdownEngine.getDisplayValue();
    },
    onSelectPreset: (seconds: number): void => {
        if (menuController.getIsVisible()) {
            menuController.setVisible(false);
        }
        startCountdown(seconds);
    },
    onAddMinute: (): void => {
        handleAddMinuteAction();
    },
    onHideTimer: (resetText: boolean): void => {
        if (!countdownTimerElement) {
            return;
        }
        countdownTimerElement.style.visibility = 'hidden';
        if (resetText) {
            countdownTimerElement.textContent = formatTime(countdownEngine.getCurrentInitialValue());
        }
    },
    onShowTimer: (): void => {
        if (!countdownTimerElement) {
            return;
        }
        countdownTimerElement.style.visibility = 'visible';
        if (!countdownInterval) {
            countdownTimerElement.style.color = '#ffffff';
        }
    },
    onStopCountdown: (): void => {
        stopCountdown();
    },
    onPresetFocus: (seconds: number): void => {
        countdownEngine.setInitialValue(seconds);
    },
});

let countdownInterval: ReturnType<typeof setInterval> | null = null;
let currentFontSize = timerStorage.loadTimerFontSize(100); // 保存値を反映
let currentPresetValues: number[] = timerStorage.loadTimerPresets([10, 60, 120, 180, 300]);
let currentOpacity = timerStorage.loadTimerOpacity(0.9); // 背景の初期透明度
let timerNotificationConfigs: TimerNotificationConfig[] = timerStorage.loadNotifications([]);

/**
 * タイマーのフォントサイズを更新する。
 * @param delta 増減量
 */
const updateTimerFontSize = (delta: number): void => {
    currentFontSize = timerStyleState.calcNextFontSize(currentFontSize, delta, 20, 500);
    
    if (countdownTimerElement) {
        countdownTimerElement.style.fontSize = `${currentFontSize}px`;
    }
    timerStorage.saveTimerFontSize(currentFontSize);
};

/**
 * カウントダウンを停止する。
 */
const stopCountdown = (): void => {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    const wasActive = countdownEngine.stop();
    notificationPlayer.resetPlayed();
    if (wasActive) {
        electronAPI.sendTimerStatus(false);
    }
    electronAPI.sendTimerPauseStatus(false);
};

/**
 * +1分の処理を実行する。
 */
const handleAddMinuteAction = (): void => {
    countdownEngine.addMinute();
    const isActive = countdownEngine.isActive();
    timerStorage.saveCountdownInitialValue(countdownEngine.getCurrentInitialValue());

    if (countdownTimerElement) {
        countdownTimerElement.textContent = formatTime(countdownEngine.getDisplayValue());
    }
    if (isActive) {
        electronAPI.sendTimerCountdownUpdate(countdownEngine.getCountdownValue());
    }
    if (menuController.getIsVisible()) {
        menuController.updateMenuDisplay();
    }
};

/**
 * カウントダウンを一時停止する。
 */
const pauseCountdown = (): void => {
    if (!countdownEngine.canPause()) {
        return;
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    if (countdownEngine.pause()) {
        if (countdownTimerElement) {
            countdownTimerElement.style.color = '#ffd966';
        }
        electronAPI.sendTimerPauseStatus(true);
    }
};

/**
 * カウントダウンを再開する。
 */
const resumeCountdown = (): void => {
    if (countdownInterval || !countdownEngine.canResume() || !countdownTimerElement) return;
    if (!countdownEngine.resume()) return;
    countdownTimerElement.style.color = '#ffffff';
    electronAPI.sendTimerPauseStatus(false);
    startCountdownInterval();
};

/**
 * 一時停止のトグル処理を実行する。
 */
const handleTogglePauseAction = (): void => {
    const decision = countdownEngine.decidePauseToggle();
    if (decision === 'pause') {
        pauseCountdown();
        return;
    }
    if (decision === 'resume') {
        resumeCountdown();
    }
};

/**
 * タイマー表示の透明度を適用する。
 * @param opacity 透明度
 */
const applyCountdownTimerOpacity = (opacity: number): void => {
    if (countdownTimerElement) {
        // ベース色は style.css の定義に合わせる
        countdownTimerElement.style.background = `rgba(100, 100, 100, ${opacity})`;
    }
};

/**
 * 透明度を更新する。
 * @param delta 増減量
 */
const updateTransparency = (delta: number): void => {
    currentOpacity = timerStyleState.calcNextOpacity(currentOpacity, delta, 0.1, 1.0);

    applyCountdownTimerOpacity(currentOpacity);
    timerStorage.saveTimerOpacity(currentOpacity);
};

/**
 * カウントダウン表示を更新する。
 * @param seconds 表示する秒数
 */
const updateCountdownDisplay = (seconds: number): void => {
    if (!countdownTimerElement) {
        return;
    }
    countdownTimerElement.textContent = formatTime(seconds);
};

/**
 * カウントダウン1ティック分の処理を行う。
 */
const processCountdownTick = (): void => {
    // カウントが一致したタイミングで通知を再生する
    const currentValue = countdownEngine.getCountdownValue();
    notificationPlayer.handleTick(timerNotificationConfigs, currentValue);

    const tickAction = timerRendererLogic.resolveTickAction(
        countdownEngine.tick(),
        countdownEngine.getCurrentInitialValue()
    );
    if (tickAction.kind === 'none') {
        return;
    }
    if (tickAction.kind === 'continue') {
        updateCountdownDisplay(tickAction.displaySeconds);
        electronAPI.sendTimerCountdownUpdate(tickAction.sendSeconds); // メインプロセスに残り時間を送信
        return;
    }
    stopCountdown();
    if (countdownTimerElement) {
        countdownTimerElement.style.color = '#888888';
    }
    updateCountdownDisplay(tickAction.displaySeconds);
    electronAPI.sendTimerCountdownUpdate(tickAction.sendSeconds); // 0 になったことを送信
};

/**
 * カウントダウンの定期実行を開始する。
 */
const startCountdownInterval = (): void => {
    countdownInterval = setInterval((): void => {
        processCountdownTick();
    }, 1000);
};


/**
 * カウントダウンを開始する。
 * @param duration 秒数
 */
const startCountdown = (duration: number): void => {
    if (!countdownTimerElement) return;

    stopCountdown();
    electronAPI.sendTimerPauseStatus(false);
    const startValue = countdownEngine.start(duration);
    
    // 再生済みの通知を記録して重複を防ぐ
    notificationPlayer.resetPlayed();

    countdownTimerElement.style.visibility = 'visible';
    countdownTimerElement.style.color = '#ffffff';
    updateCountdownDisplay(startValue);
    
    // console.log(`[TimerRenderer] Starting countdown: ${startValue}s`);
    electronAPI.sendTimerStatus(true);

    startCountdownInterval();
};

/**
 * 通知設定更新イベントを処理する。
 * @param configs 通知設定
 */
const handleUpdateTimerNotifications = (configs: TimerNotificationConfig[]): void => {
    // console.log('[TimerRenderer] Notifications updated:', configs);
    timerNotificationConfigs = timerRendererLogic.normalizeNotifications(configs);
    timerStorage.saveNotifications(configs);
};

/**
 * 通知音遅延設定更新イベントを処理する。
 * @param delayMs 遅延ミリ秒
 */
const handleUpdateSoundPlayDelay = (delayMs: number): void => {
    const normalizedDelay = notificationPlayer.setDelayMs(delayMs);
    timerStorage.saveSoundPlayDelay(normalizedDelay);
};


/**
 * フォントサイズ変更イベントを処理する。
 * @param delta 増減量
 */
const handleChangeFontSize = (delta: number): void => {
    // console.log(`[TimerRenderer] Change font size via Joy-Con: ${delta}`);
    updateTimerFontSize(delta * 2);
};

/**
 * カウントダウン初期値更新イベントを処理する。
 * @param value 初期値（秒）
 */
const handleUpdateCountdownInitialValue = (value: number): void => {
    const nextInitialValue = countdownEngine.setInitialValue(value);
    timerStorage.saveCountdownInitialValue(nextInitialValue);
    if (countdownTimerElement && !countdownEngine.isActive()) {
        countdownTimerElement.textContent = formatTime(nextInitialValue);
    }
    if (menuController.getIsVisible()) {
        menuController.updateMenuDisplay();
    }
};

/**
 * プリセット更新イベントを処理する。
 * @param presets プリセット秒数配列
 */
const handleUpdateTimerPresets = (presets: number[]): void => {
    // console.log('[TimerRenderer] Received presets update:', presets);
    currentPresetValues = presets;
    menuController.setPresets(currentPresetValues);
    timerStorage.saveTimerPresets(presets);
    if (menuController.getIsVisible()) {
        menuController.renderPresets();
    }
};

/**
 * タイマーモード更新イベントを処理する。
 * @param mode タイマーモード
 */
const handleSetTimerMode = (mode: TimerMode): void => {
    // console.log(`[TimerRenderer] Setting mode to: ${mode}`);
    if (timerRendererLogic.shouldShowSetupMenu(mode)) {
        menuController.setVisible(true);
    } else {
        menuController.setVisible(false);
    }
    // モード切替時にフォントサイズを再適用する
    if (countdownTimerElement) {
        countdownTimerElement.style.fontSize = `${currentFontSize}px`;
    }
};

/**
 * カウントダウン開始イベントを処理する。
 * @param duration 開始秒数
 */
const handleStartCountdown = (duration: number): void => {
    // console.log(`[TimerRenderer] Received start-countdown IPC: ${duration}s`);
    if (menuController.getIsVisible()) {
        menuController.setVisible(false);
    }
    startCountdown(duration);
};

/**
 * ホイール操作イベントを処理する。
 * @param e ホイールイベント
 */
const handleWheelEvent = (e: WheelEvent): void => {
    e.preventDefault(); // 既定のスクロール動作を抑止

    const action = timerRendererLogic.resolveWheelAction(e.deltaY, e.shiftKey);
    if (action.kind === 'opacity') {
        updateTransparency(action.delta);
        return;
    }
    // console.log(`[TimerRenderer] Wheel detected on zone. Delta: ${delta}, Current: ${currentFontSize}`);
    updateTimerFontSize(action.delta);
};

/**
 * Electron API のイベント購読を登録する。
 */
const registerElectronApiHandlers = (): void => {
    electronAPI.onUpdateTimerNotifications(handleUpdateTimerNotifications);
    electronAPI.onUpdateSoundPlayDelay(handleUpdateSoundPlayDelay);
    electronAPI.onChangeFontSize(handleChangeFontSize);
    electronAPI.onUpdateCountdownInitialValue(handleUpdateCountdownInitialValue);
    electronAPI.onUpdateTimerPresets(handleUpdateTimerPresets);
    electronAPI.onSetTimerMode(handleSetTimerMode);
    electronAPI.onStartCountdown(handleStartCountdown);
    electronAPI.onJoyConButtonSrPressed((): void => {
        menuController.toggleVisible();
    });
    electronAPI.onTimerMenuNavigate((direction: number): void => {
        menuController.navigate(direction);
    });
    electronAPI.onTimerMenuSelect((): void => {
        if (!menuController.getIsVisible()) {
            handleTogglePauseAction();
            return;
        }
        menuController.selectCurrent();
    });
    electronAPI.onToggleTimerPause((): void => {
        handleTogglePauseAction();
    });
    electronAPI.onAddMinuteTimer((): void => {
        handleAddMinuteAction();
    });
};

/**
 * 画面初期状態を反映する。
 */
const applyInitialState = (): void => {
    // 初期フォントサイズを反映
    if (countdownTimerElement) {
        countdownTimerElement.style.fontSize = `${currentFontSize}px`;
    }
    applyCountdownTimerOpacity(currentOpacity); // 初期値を適用

    // console.log('[TimerRenderer] Initialized.');
    const storedSoundDelay = timerStorage.loadSoundPlayDelay();
    if (storedSoundDelay !== null) {
        const parsedDelay = storedSoundDelay;
        notificationPlayer.setDelayMs(parsedDelay);
    }
    menuController.setPresets(currentPresetValues);
    menuController.renderPresets();
};

if (wheelZone) {
    wheelZone.addEventListener('wheel', (e: WheelEvent): void => {
        handleWheelEvent(e);
    }, { passive: false });
}

registerElectronApiHandlers();
applyInitialState();
}
