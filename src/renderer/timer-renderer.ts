((): void => {
type TimerMode = 'timer' | 'setup';
type TimerNotificationConfig = {
    time: number;
    filename: string;
    absolutePath: string;
};
type TimerStyleStateApi = {
    calcNextFontSize: (current: number, delta: number, min: number, max: number) => number;
    calcNextOpacity: (current: number, delta: number, min: number, max: number) => number;
};
type TimerRendererElectronAPI = {
    onUpdateTimerNotifications: (callback: (configs: TimerNotificationConfig[]) => void) => void;
    sendTimerStatus: (isCounting: boolean) => void;
    sendTimerCountdownUpdate: (remainingTime: number) => void;
    onChangeFontSize: (callback: (delta: number) => void) => void;
    onUpdateCountdownInitialValue: (callback: (value: number) => void) => void;
    onUpdateTimerPresets: (callback: (presets: number[]) => void) => void;
    onSetTimerMode: (callback: (mode: TimerMode) => void) => void;
    onStartCountdown: (callback: (duration: number) => void) => void;
    onJoyConButtonSrPressed: (callback: () => void) => void;
    onTimerMenuNavigate: (callback: (direction: number) => void) => void;
    onTimerMenuSelect: (callback: () => void) => void;
};

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

let countdownInterval: ReturnType<typeof setInterval> | null = null;
let countdownValue = 10;
let currentCountdownInitialValue = storedCountdownInitialValue ? Number.parseInt(storedCountdownInitialValue, 10) : 10;
let currentFontSize = storedTimerFontSize ? Number.parseInt(storedTimerFontSize, 10) : 100; // 保存値を反映
let isCountdownMenuVisible = false;
let selectedPresetIndex = -1;
let currentPresetValues: number[] = JSON.parse(storedTimerPresets || '[10, 60, 120, 180, 300]');
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
 * 秒数を M:SS 形式に整形する。
 * @param seconds 秒数
 * @returns 表示用文字列
 */
function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * カウントダウン値を範囲内に収める。
 * @param value カウントダウン値
 * @returns 補正後の値
 */
function clampCountdownValue(value: number): number {
    return Math.max(1, Math.min(3600, value));
}

/**
 * カウントダウンメニュー表示を更新する。
 */
function updateCountdownMenuDisplay(): void {
    if (countdownMenuValueElement) {
        countdownMenuValueElement.textContent = formatTime(currentCountdownInitialValue);
    }
}

/**
 * カウントダウンメニューの表示状態を切り替える。
 * @param visible 表示するかどうか
 */
function setCountdownMenuVisible(visible: boolean): void {
    isCountdownMenuVisible = visible;
    if (countdownMenuElement) {
        countdownMenuElement.style.visibility = visible ? 'visible' : 'hidden';
    }
    if (visible) {
        updateCountdownMenuDisplay();
        stopCountdown();
        if (countdownTimerElement) {
            countdownTimerElement.style.visibility = 'hidden';
            countdownTimerElement.textContent = formatTime(currentCountdownInitialValue);
        }
        renderTimerPresets(); // メニュー表示時に再描画
    } else {
        // タイマー表示に戻す
        if (countdownTimerElement) {
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
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        electronAPI.sendTimerStatus(false);
    }
}

/**
 * タイマーウィンドウのプリセットを描画する。
 */
function renderTimerPresets(): void {
    if (!timerPresetsContainer) return;
    timerPresetsContainer.innerHTML = '';
    currentPresetValues.forEach((time: number, index: number): void => {
        const btn = document.createElement('div');
        btn.className = 'menu-preset-btn';
        if (index === selectedPresetIndex) btn.classList.add('focused');
        btn.dataset.time = String(time);
        btn.textContent = formatTimerWindowPresetLabel(time);
        btn.addEventListener('click', (): void => {
            if (isCountdownMenuVisible) {
                setCountdownMenuVisible(false);
            }
            startCountdown(time);
        });
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
    const btns = timerPresetsContainer?.querySelectorAll('.menu-preset-btn');
    if (!btns) return;
    btns.forEach((btn: Element, index: number): void => {
        if (index === selectedPresetIndex) {
            btn.classList.add('focused');
            const time = currentPresetValues[index];
            currentCountdownInitialValue = clampCountdownValue(time);
            updateCountdownMenuDisplay();
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
    currentCountdownInitialValue = clampCountdownValue(duration);
    countdownValue = currentCountdownInitialValue;
    
    // 再生済みの通知を記録して重複を防ぐ
    const playedIndices = new Set<number>();

    countdownTimerElement.style.visibility = 'visible';
    countdownTimerElement.style.color = '#ffffff';
    countdownTimerElement.textContent = formatTime(countdownValue);
    
    console.log(`[TimerRenderer] Starting countdown: ${currentCountdownInitialValue}s`);
    electronAPI.sendTimerStatus(true);

    countdownInterval = setInterval(() => {
        // カウントが一致したタイミングで通知を再生する
        timerNotificationConfigs.forEach((config: TimerNotificationConfig, index: number): void => {
            if (!playedIndices.has(index) && config.absolutePath && countdownValue === config.time) {
                console.log(`[TimerRenderer] Alert trigger at ${config.time}s: ${config.absolutePath}`);
                try {
                    let audioUrl = config.absolutePath;
                    if (!audioUrl.startsWith('file://') && !audioUrl.startsWith('http')) {
                        audioUrl = 'file://' + config.absolutePath.replace(/\\/g, '/');
                    }
                    const audio = new Audio(audioUrl);
                    audio.play().catch((e: unknown): void => console.error('Audio play failed:', e));
                    playedIndices.add(index);
                } catch (err) {
                    console.error('Error playing notification sound:', err);
                }
            }
        });

        if (countdownValue > 0) {
            countdownValue--;
            countdownTimerElement.textContent = formatTime(countdownValue);
            electronAPI.sendTimerCountdownUpdate(countdownValue); // メインプロセスに残り時間を送信
        } else {
            stopCountdown();
            countdownTimerElement.style.color = '#888888';
            countdownTimerElement.textContent = formatTime(currentCountdownInitialValue);
            electronAPI.sendTimerCountdownUpdate(countdownValue); // 0 になったことを送信
        }
    }, 1000);
}

electronAPI.onUpdateTimerNotifications((configs: TimerNotificationConfig[]): void => {
    console.log('[TimerRenderer] Notifications updated:', configs);
    timerNotificationConfigs = configs;
    localStorage.setItem('timerNotifications', JSON.stringify(configs));
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
    currentCountdownInitialValue = clampCountdownValue(value);
    localStorage.setItem('countdownInitialValue', String(currentCountdownInitialValue));
    if (countdownTimerElement && !countdownInterval) {
        countdownTimerElement.textContent = formatTime(currentCountdownInitialValue);
    }
    if (isCountdownMenuVisible) {
        updateCountdownMenuDisplay();
    }
});

electronAPI.onUpdateTimerPresets((presets: number[]): void => {
    console.log('[TimerRenderer] Received presets update:', presets);
    currentPresetValues = presets;
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
        if (selectedPresetIndex < 0) selectedPresetIndex = 0;
        if (selectedPresetIndex >= currentPresetValues.length) selectedPresetIndex = currentPresetValues.length - 1;
    }
    updatePresetFocus();
});

electronAPI.onTimerMenuSelect((): void => {
    if (!isCountdownMenuVisible) return;
    if (selectedPresetIndex !== -1) {
        setCountdownMenuVisible(false);
        startCountdown(currentCountdownInitialValue);
    }
});

// 初期フォントサイズを反映
if (countdownTimerElement) {
    countdownTimerElement.style.fontSize = `${currentFontSize}px`;
}
applyCountdownTimerOpacity(currentOpacity); // 初期値を適用

console.log('[TimerRenderer] Initialized.');
renderTimerPresets();
})();

