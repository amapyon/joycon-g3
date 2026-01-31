((): void => {
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

type TimerMenuItem =
    | { type: 'preset'; time: number; label: string }
    | { type: 'add-minute'; label: string };

type CountdownEngineOptions = {
    initialValue?: number;
    minSeconds?: number;
    maxSeconds?: number;
};

type CountdownEngineInstance = {
    getCurrentInitialValue: () => number;
    getCountdownValue: () => number;
    isActive: () => boolean;
    getStatus: () => { isCounting: boolean; isPaused: boolean };
    start: (duration: number) => number;
    stop: () => void;
    pause: () => boolean;
    resume: () => boolean;
    tick: () => { remaining: number; shouldStop: boolean } | null;
    addMinute: () => { nextRemaining: number; nextInitial: number };
    setInitialValue: (value: number) => number;
};

type CountdownEngineClass = {
    new (options?: CountdownEngineOptions): CountdownEngineInstance;
    formatTime: (seconds: number) => string;
    clampValue: (value: number, minSeconds?: number, maxSeconds?: number) => number;
};

type NotificationPlayerOptions = {
    sendRumble: (seconds: number, shouldRumble: boolean) => void;
    createAudio: (audioUrl: string) => HTMLAudioElement;
    now: () => number;
    initialDelayMs?: number;
};

type NotificationPlayerInstance = {
    setDelayMs: (delayMs: number) => number;
    getDelayMs: () => number;
    resetPlayed: () => void;
    handleTick: (configs: TimerNotificationConfig[], currentSeconds: number) => void;
};

type NotificationPlayerClass = {
    new (options: NotificationPlayerOptions): NotificationPlayerInstance;
    normalizeDelay: (delayMs: number) => number;
};

/**
 * カウントダウンメニュー表示切替時の挙動を決定する。
 * @param visible 表示するかどうか
 * @returns 反映する挙動
 */
function decideCountdownMenuVisibility(visible: boolean): {
    menuVisible: boolean;
    timerVisible: boolean;
    updateMenuDisplay: boolean;
    renderPresets: boolean;
    stopCountdown: boolean;
    resetTimerText: boolean;
} {
    if (visible) {
        return {
            menuVisible: true,
            timerVisible: false,
            updateMenuDisplay: true,
            renderPresets: true,
            stopCountdown: false,
            resetTimerText: false,
        };
    }

    return {
        menuVisible: false,
        timerVisible: true,
        updateMenuDisplay: false,
        renderPresets: false,
        stopCountdown: false,
        resetTimerText: false,
    };
}

const electronAPI = (window as unknown as { electronAPI: TimerRendererElectronAPI }).electronAPI;
const timerStyleState = (window as unknown as { timerStyleState: TimerStyleStateApi }).timerStyleState;
const countdownTimerElement = document.getElementById('countdownTimer') as HTMLElement | null;
const countdownMenuElement = document.getElementById('countdownMenu') as HTMLElement | null;
const countdownMenuValueElement = document.getElementById('countdownMenuValue') as HTMLElement | null;
const timerPresetsContainer = document.getElementById('timer-presets-container') as HTMLElement | null;
const wheelZone = document.getElementById('wheel-zone') as HTMLElement | null;
const storedCountdownInitialValue = localStorage.getItem('countdownInitialValue');
const storedTimerFontSize = localStorage.getItem('timerFontSize');
const storedTimerPresets = localStorage.getItem('timerPresets');
const storedOpacity = localStorage.getItem('timerWindowOpacity');
const storedNotifications = localStorage.getItem('timerNotifications');
const CountdownEngine = (window as unknown as { countdownEngine: { CountdownEngine: CountdownEngineClass } })
    .countdownEngine.CountdownEngine;
const NotificationPlayer = (window as unknown as { notificationPlayer: { NotificationPlayer: NotificationPlayerClass } })
    .notificationPlayer.NotificationPlayer;
const initialCountdownValue = storedCountdownInitialValue ? Number.parseInt(storedCountdownInitialValue, 10) : 10;
const countdownEngine = new CountdownEngine({ initialValue: initialCountdownValue });
const notificationPlayer = new NotificationPlayer({
    sendRumble: (seconds: number, shouldRumble: boolean): void => {
        electronAPI.sendTimerNotificationTrigger(seconds, shouldRumble);
    },
    createAudio: (audioUrl: string): HTMLAudioElement => new Audio(audioUrl),
    now: (): number => Date.now(),
    initialDelayMs: 200,
});

let countdownInterval: ReturnType<typeof setInterval> | null = null;
let currentFontSize = storedTimerFontSize ? Number.parseInt(storedTimerFontSize, 10) : 100; // 保存値を反映
let isCountdownMenuVisible = false;
let selectedPresetIndex = -1;
let currentPresetValues: number[] = JSON.parse(storedTimerPresets || '[10, 60, 120, 180, 300]');
let currentMenuItems: TimerMenuItem[] = buildMenuItems(currentPresetValues);
let currentOpacity = storedOpacity ? Number.parseFloat(storedOpacity) : 0.9; // 背景の初期透明度
let timerNotificationConfigs: TimerNotificationConfig[] = JSON.parse(storedNotifications || '[]');

/**
 * タイマーのフォントサイズを更新する。
 * @param delta 増減量
 */
function updateTimerFontSize(delta: number): void {
    currentFontSize = timerStyleState.calcNextFontSize(currentFontSize, delta, 20, 500);
    
    if (countdownTimerElement) {
        countdownTimerElement.style.fontSize = `${currentFontSize}px`;
    }
    localStorage.setItem('timerFontSize', String(currentFontSize));
}

/**
 * タイマーウィンドウのプリセット表示ラベルを生成する。
 * @param seconds 秒数
 * @returns 表示ラベル
 */
function formatTimerWindowPresetLabel(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs === 0 ? `${mins}m` : `${mins}m${secs}s`;
}

/**
 * メニュー項目を生成する。
 * @param presets プリセット一覧
 * @returns メニュー項目
 */
function buildMenuItems(presets: number[]): TimerMenuItem[] {
    const items: TimerMenuItem[] = presets.map((time: number) => ({
        type: 'preset',
        time,
        label: formatTimerWindowPresetLabel(time),
    }));

    items.push({ type: 'add-minute', label: '+1分' });
    return items;
}

/**
 * 秒数を M:SS 形式に整形する。
 * @param seconds 秒数
 * @returns 表示用文字列
 */
function formatTime(seconds: number): string {
    return CountdownEngine.formatTime(seconds);
}

/**
 * カウントダウンメニュー表示を更新する。
 */
function updateCountdownMenuDisplay(): void {
    if (countdownMenuValueElement) {
        countdownMenuValueElement.textContent = formatTime(getMenuDisplaySeconds());
    }
}

/**
 * カウントダウンメニューの表示状態を切り替える。
 * @param visible 表示するかどうか
 */
function setCountdownMenuVisible(visible: boolean): void {
    const decision = decideCountdownMenuVisibility(visible);
    isCountdownMenuVisible = visible;
    if (countdownMenuElement) {
        countdownMenuElement.style.visibility = decision.menuVisible ? 'visible' : 'hidden';
    }
    if (visible) {
        if (decision.updateMenuDisplay) {
            updateCountdownMenuDisplay();
        }
        if (decision.stopCountdown) {
            stopCountdown();
        }
        if (countdownTimerElement && !decision.timerVisible) {
            countdownTimerElement.style.visibility = 'hidden';
            if (decision.resetTimerText) {
                countdownTimerElement.textContent = formatTime(countdownEngine.getCurrentInitialValue());
            }
        }
        if (decision.renderPresets) {
            renderTimerPresets(); // メニュー表示時に再描画
        }
    } else {
        // タイマー表示に戻す
        if (countdownTimerElement && decision.timerVisible) {
            countdownTimerElement.style.visibility = 'visible';
            // 停止後の色が残らないように戻す
            if (!countdownInterval) {
                countdownTimerElement.style.color = '#ffffff';
            }
        }
    }
}

/**
 * カウントダウンを停止する。
 */
function stopCountdown(): void {
    const wasActive = countdownEngine.isActive();
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    countdownEngine.stop();
    notificationPlayer.resetPlayed();
    if (wasActive) {
        electronAPI.sendTimerStatus(false);
    }
    electronAPI.sendTimerPauseStatus(false);
}

/**
 * メニュー表示用の秒数を取得する。
 * @returns 秒数
 */
function getMenuDisplaySeconds(): number {
    return countdownEngine.isActive()
        ? countdownEngine.getCountdownValue()
        : countdownEngine.getCurrentInitialValue();
}

/**
 * +1分の処理を実行する。
 */
function handleAddMinuteAction(): void {
    const result = countdownEngine.addMinute();
    const isActive = countdownEngine.isActive();
    localStorage.setItem('countdownInitialValue', String(countdownEngine.getCurrentInitialValue()));

    if (countdownTimerElement) {
        const displayValue = isActive ? result.nextRemaining : result.nextInitial;
        countdownTimerElement.textContent = formatTime(displayValue);
    }
    if (isActive) {
        electronAPI.sendTimerCountdownUpdate(result.nextRemaining);
    }
    if (isCountdownMenuVisible) {
        updateCountdownMenuDisplay();
    }
}

/**
 * カウントダウンを一時停止する。
 */
function pauseCountdown(): void {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        if (countdownEngine.pause()) {
            if (countdownTimerElement) {
                countdownTimerElement.style.color = '#ffd966';
            }
            electronAPI.sendTimerPauseStatus(true);
        }
    }
}

/**
 * カウントダウンを再開する。
 */
function resumeCountdown(): void {
    if (countdownInterval || !countdownEngine.getStatus().isPaused || !countdownTimerElement) return;
    if (!countdownEngine.resume()) return;
    countdownTimerElement.style.color = '#ffffff';
    electronAPI.sendTimerPauseStatus(false);
    countdownInterval = setInterval((): void => {
        // カウントが一致したタイミングで通知を再生する
        const currentValue = countdownEngine.getCountdownValue();
        notificationPlayer.handleTick(timerNotificationConfigs, currentValue);

        const tickResult = countdownEngine.tick();
        if (!tickResult) {
            return;
        }

        if (!tickResult.shouldStop) {
            countdownTimerElement.textContent = formatTime(tickResult.remaining);
            electronAPI.sendTimerCountdownUpdate(tickResult.remaining); // メインプロセスに残り時間を送信
            return;
        }

        stopCountdown();
        countdownTimerElement.style.color = '#888888';
        countdownTimerElement.textContent = formatTime(countdownEngine.getCurrentInitialValue());
        electronAPI.sendTimerCountdownUpdate(tickResult.remaining); // 0 になったことを送信
    }, 1000);
}

/**
 * タイマーウィンドウのプリセットを描画する。
 */
function renderTimerPresets(): void {
    if (!timerPresetsContainer) return;
    timerPresetsContainer.innerHTML = '';
    currentMenuItems.forEach((item: TimerMenuItem, index: number): void => {
        const btn = document.createElement(item.type === 'preset' ? 'div' : 'button');
        btn.className = item.type === 'preset' ? 'menu-preset-btn menu-item-btn' : 'menu-action-btn menu-item-btn';
        if (index === selectedPresetIndex) btn.classList.add('focused');
        btn.textContent = item.label;
        if (item.type === 'preset') {
            btn.dataset.time = String(item.time);
            btn.addEventListener('click', (): void => {
                if (isCountdownMenuVisible) {
                    setCountdownMenuVisible(false);
                }
                startCountdown(item.time);
            });
        } else {
            btn.addEventListener('click', (): void => {
                handleAddMinuteAction();
            });
        }
        timerPresetsContainer.appendChild(btn);
    });
}

/**
 * タイマー表示の透明度を適用する。
 * @param opacity 透明度
 */
function applyCountdownTimerOpacity(opacity: number): void {
    if (countdownTimerElement) {
        // ベース色は style.css の定義に合わせる
        countdownTimerElement.style.background = `rgba(100, 100, 100, ${opacity})`;
    }
}

/**
 * 透明度を更新する。
 * @param delta 増減量
 */
function updateTransparency(delta: number): void {
    currentOpacity = timerStyleState.calcNextOpacity(currentOpacity, delta, 0.1, 1.0);

    applyCountdownTimerOpacity(currentOpacity);
    localStorage.setItem('timerWindowOpacity', String(currentOpacity));
}


/**
 * プリセットのフォーカス状態を更新する。
 */
function updatePresetFocus(): void {
    const btns = timerPresetsContainer?.querySelectorAll('.menu-item-btn');
    if (!btns) return;
    btns.forEach((btn: Element, index: number): void => {
        if (index === selectedPresetIndex) {
            btn.classList.add('focused');
            const item = currentMenuItems[index];
            if (item && item.type === 'preset') {
                countdownEngine.setInitialValue(item.time);
                updateCountdownMenuDisplay();
            }
        } else {
            btn.classList.remove('focused');
        }
    });
}

/**
 * カウントダウンを開始する。
 * @param duration 秒数
 */
function startCountdown(duration: number): void {
    if (!countdownTimerElement) return;

    stopCountdown();
    electronAPI.sendTimerPauseStatus(false);
    const startValue = countdownEngine.start(duration);
    
    // 再生済みの通知を記録して重複を防ぐ
    notificationPlayer.resetPlayed();

    countdownTimerElement.style.visibility = 'visible';
    countdownTimerElement.style.color = '#ffffff';
    countdownTimerElement.textContent = formatTime(startValue);
    
    console.log(`[TimerRenderer] Starting countdown: ${startValue}s`);
    electronAPI.sendTimerStatus(true);

    countdownInterval = setInterval(() => {
        // カウントが一致したタイミングで通知を再生する
        const currentValue = countdownEngine.getCountdownValue();
        notificationPlayer.handleTick(timerNotificationConfigs, currentValue);

        const tickResult = countdownEngine.tick();
        if (!tickResult) {
            return;
        }

        if (!tickResult.shouldStop) {
            countdownTimerElement.textContent = formatTime(tickResult.remaining);
            electronAPI.sendTimerCountdownUpdate(tickResult.remaining); // メインプロセスに残り時間を送信
            return;
        }

        stopCountdown();
        countdownTimerElement.style.color = '#888888';
        countdownTimerElement.textContent = formatTime(countdownEngine.getCurrentInitialValue());
        electronAPI.sendTimerCountdownUpdate(tickResult.remaining); // 0 になったことを送信
    }, 1000);
}

electronAPI.onUpdateTimerNotifications((configs: TimerNotificationConfig[]): void => {
    console.log('[TimerRenderer] Notifications updated:', configs);
    timerNotificationConfigs = configs.map((config: TimerNotificationConfig) => ({
        ...config,
        rumble: !!config.rumble,
    }));
    localStorage.setItem('timerNotifications', JSON.stringify(configs));
});

electronAPI.onUpdateSoundPlayDelay((delayMs: number): void => {
    const normalizedDelay = notificationPlayer.setDelayMs(delayMs);
    localStorage.setItem('soundPlayDelayMs', String(normalizedDelay));
});


electronAPI.onChangeFontSize((delta: number): void => {
    console.log(`[TimerRenderer] Change font size via Joy-Con: ${delta}`);
    updateTimerFontSize(delta * 2);
});

if (wheelZone) {
    wheelZone.addEventListener('wheel', (e: WheelEvent): void => {
        e.preventDefault(); // 既定のスクロール動作を抑止

        if (e.shiftKey) {
            // 透明度を調整
            const delta = e.deltaY < 0 ? 0.05 : -0.05; // 上スクロールで不透明、下で透明
            updateTransparency(delta);
        } else {
            // フォントサイズを調整（既存仕様）
            const delta = e.deltaY < 0 ? 5 : -5;
            console.log(`[TimerRenderer] Wheel detected on zone. Delta: ${delta}, Current: ${currentFontSize}`);
            updateTimerFontSize(delta);
        }
    }, { passive: false });
}

electronAPI.onUpdateCountdownInitialValue((value: number): void => {
    const nextInitialValue = countdownEngine.setInitialValue(value);
    localStorage.setItem('countdownInitialValue', String(nextInitialValue));
    if (countdownTimerElement && !countdownEngine.isActive()) {
        countdownTimerElement.textContent = formatTime(nextInitialValue);
    }
    if (isCountdownMenuVisible) {
        updateCountdownMenuDisplay();
    }
});

electronAPI.onUpdateTimerPresets((presets: number[]): void => {
    console.log('[TimerRenderer] Received presets update:', presets);
    currentPresetValues = presets;
    currentMenuItems = buildMenuItems(currentPresetValues);
    localStorage.setItem('timerPresets', JSON.stringify(presets));
    if (isCountdownMenuVisible) {
        renderTimerPresets();
    }
});

electronAPI.onSetTimerMode((mode: TimerMode): void => {
    console.log(`[TimerRenderer] Setting mode to: ${mode}`);
    if (mode === 'setup') {
        setCountdownMenuVisible(true);
    } else {
        setCountdownMenuVisible(false);
    }
    // モード切替時にフォントサイズを再適用する
    if (countdownTimerElement) {
        countdownTimerElement.style.fontSize = `${currentFontSize}px`;
    }
});

// 即時開始のIPCを受信
electronAPI.onStartCountdown((duration: number): void => {
    console.log(`[TimerRenderer] Received start-countdown IPC: ${duration}s`);
    if (isCountdownMenuVisible) {
        setCountdownMenuVisible(false);
    }
    startCountdown(duration);
});

electronAPI.onJoyConButtonSrPressed((): void => {
    setCountdownMenuVisible(!isCountdownMenuVisible);
});

electronAPI.onTimerMenuNavigate((direction: number): void => {
    if (!isCountdownMenuVisible) return;
    
    if (selectedPresetIndex === -1) {
        selectedPresetIndex = 0;
    } else {
        selectedPresetIndex += direction;
        if (selectedPresetIndex < 0) selectedPresetIndex = currentMenuItems.length - 1;
        if (selectedPresetIndex >= currentMenuItems.length) selectedPresetIndex = 0;
    }
    updatePresetFocus();
});

electronAPI.onTimerMenuSelect((): void => {
    if (!isCountdownMenuVisible) {
        if (countdownInterval) {
            pauseCountdown();
            return;
        }
        if (countdownEngine.getStatus().isPaused) {
            resumeCountdown();
        }
        return;
    }
    if (selectedPresetIndex !== -1) {
        const item = currentMenuItems[selectedPresetIndex];
        if (item?.type === 'preset') {
            setCountdownMenuVisible(false);
            startCountdown(countdownEngine.getCurrentInitialValue());
            return;
        }
        if (item?.type === 'add-minute') {
            handleAddMinuteAction();
        }
    }
});

electronAPI.onToggleTimerPause((): void => {
    if (countdownInterval) {
        pauseCountdown();
        return;
    }
    if (countdownEngine.getStatus().isPaused) {
        resumeCountdown();
    }
});

electronAPI.onAddMinuteTimer((): void => {
    handleAddMinuteAction();
});

// 初期フォントサイズを反映
if (countdownTimerElement) {
    countdownTimerElement.style.fontSize = `${currentFontSize}px`;
}
applyCountdownTimerOpacity(currentOpacity); // 初期値を適用

console.log('[TimerRenderer] Initialized.');
const storedSoundDelay = localStorage.getItem('soundPlayDelayMs');
if (storedSoundDelay) {
    const parsedDelay = parseInt(storedSoundDelay, 10);
    notificationPlayer.setDelayMs(parsedDelay);
}
renderTimerPresets();
})();
