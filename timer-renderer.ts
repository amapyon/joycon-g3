// timer-renderer.ts
// 独立したタイマーウィンドウの制御ロジック

interface Window {
    electronAPI: any;
}

const countdownTimerElement: HTMLElement | null = document.getElementById('countdownTimer');
const countdownMenuElement: HTMLElement | null = document.getElementById('countdownMenu');
const countdownMenuValueElement: HTMLElement | null = document.getElementById('countdownMenuValue');

let countdownInterval: NodeJS.Timeout | null = null;
let countdownValue: number = 10;
let currentCountdownInitialValue: number = 10;
let currentFontSize: number = parseInt(localStorage.getItem('timerFontSize') || '100'); // Load saved size
let isCountdownMenuVisible = false;
let selectedPresetIndex: number = -1; 
let currentPresetValues: number[] = [10, 60, 120, 180, 300]; 
const timerPresetsContainer: HTMLElement | null = document.getElementById('timer-presets-container');

function updateTimerFontSize(delta: number) {
    currentFontSize += delta;
    if (currentFontSize < 20) currentFontSize = 20;
    if (currentFontSize > 500) currentFontSize = 500;
    
    if (countdownTimerElement) {
        countdownTimerElement.style.fontSize = `${currentFontSize}px`;
    }
    localStorage.setItem('timerFontSize', String(currentFontSize));
}

// Initial application of font size
if (countdownTimerElement) {
    countdownTimerElement.style.fontSize = `${currentFontSize}px`;
}

function formatTimerWindowPresetLabel(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs === 0 ? `${mins}m` : `${mins}m${secs}s`;
}

function renderTimerPresets() {
    if (!timerPresetsContainer) return;
    timerPresetsContainer.innerHTML = '';
    currentPresetValues.forEach((time, index) => {
        const btn = document.createElement('div');
        btn.className = 'menu-preset-btn';
        if (index === selectedPresetIndex) btn.classList.add('focused');
        btn.dataset.time = String(time);
        btn.textContent = formatTimerWindowPresetLabel(time);
        btn.addEventListener('click', () => {
             if (isCountdownMenuVisible) {
                 setCountdownMenuVisible(false);
             }
             startCountdown(time);
        });
        timerPresetsContainer.appendChild(btn);
    });
}

// Helper to format text as M:SS
function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function clampCountdownValue(value: number) {
    return Math.max(1, Math.min(3600, value));
}

function updateCountdownMenuDisplay() {
    if (countdownMenuValueElement) {
        countdownMenuValueElement.textContent = formatTime(currentCountdownInitialValue);
    }
}

function setCountdownMenuVisible(visible: boolean) {
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
        renderTimerPresets(); // Re-render when menu opens
    } else {
        // Switching back to Timer UI
        if (countdownTimerElement) {
            countdownTimerElement.style.visibility = 'visible';
            // Ensure color is reset if we stopped a finished timer
            if (!countdownInterval) {
                 countdownTimerElement.style.color = '#ffffff';
            }
        }
    }
}

function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        window.electronAPI.sendTimerStatus(false);
    }
}

let timerNotificationConfigs: any[] = JSON.parse(localStorage.getItem('timerNotifications') || '[]');

window.electronAPI.onUpdateTimerNotifications((configs: any[]) => {
    console.log(`[TimerRenderer] Notifications updated:`, configs);
    timerNotificationConfigs = configs;
    localStorage.setItem('timerNotifications', JSON.stringify(configs));
});

function startCountdown(duration: number) {
    if (!countdownTimerElement) return;

    stopCountdown();
    currentCountdownInitialValue = duration;
    countdownValue = duration;
    
    // Track which sounds have already played this cycle to avoid repeats
    const playedIndices = new Set<number>();

    countdownTimerElement.style.visibility = 'visible';
    countdownTimerElement.style.color = '#ffffff'; 
    countdownTimerElement.textContent = formatTime(countdownValue);
    
    console.log(`[TimerRenderer] Starting countdown: ${duration}s`);
    window.electronAPI.sendTimerStatus(true);

    countdownInterval = setInterval(() => {
        // Check for notifications ANY time the value matches (including start)
        timerNotificationConfigs.forEach((config, index) => {
            if (!playedIndices.has(index) && config.absolutePath && countdownValue === config.time) {
                console.log(`[TimerRenderer] Alert trigger at ${config.time}s: ${config.absolutePath}`);
                try {
                    let audioUrl = config.absolutePath;
                    if (!audioUrl.startsWith('file://') && !audioUrl.startsWith('http')) {
                        audioUrl = 'file://' + config.absolutePath.replace(/\\/g, '/');
                    }
                    const audio = new Audio(audioUrl);
                    audio.play().catch(e => console.error('Audio play failed:', e));
                    playedIndices.add(index);
                } catch (err) {
                    console.error('Error playing notification sound:', err);
                }
            }
        });

        if (countdownValue > 0) {
            countdownValue--;
            countdownTimerElement!.textContent = formatTime(countdownValue);
        } else {
            stopCountdown();
            countdownTimerElement!.style.visibility = 'visible';
            countdownTimerElement!.style.color = '#888888'; 
            countdownTimerElement!.textContent = formatTime(currentCountdownInitialValue); 
        }
    }, 1000);
}

function applyCountdownValue(delta: number) {
    currentCountdownInitialValue = clampCountdownValue(currentCountdownInitialValue + delta);
    updateCountdownMenuDisplay();
    if (countdownTimerElement && !countdownInterval && !isCountdownMenuVisible) {
        countdownTimerElement.textContent = formatTime(currentCountdownInitialValue);
        countdownTimerElement.style.visibility = 'visible'; 
        countdownTimerElement.style.color = '#ffffff'; 
    }
    window.electronAPI.sendCountdownInitialValue(currentCountdownInitialValue);
}

// --- Manual Window Dragging (Removed in favor of CSS drag zone) ---

// Event Listeners

window.electronAPI.onChangeFontSize((delta: number) => {
    console.log(`[TimerRenderer] Change font size via Joy-Con: ${delta}`);
    updateTimerFontSize(delta * 2); 
});

const wheelZone = document.getElementById('wheel-zone');
if (wheelZone) {
    wheelZone.addEventListener('wheel', (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 5 : -5;
        console.log(`[TimerRenderer] Wheel detected on zone. Delta: ${delta}, Current: ${currentFontSize}`);
        updateTimerFontSize(delta);
    }, { passive: false });
}

window.electronAPI.onUpdateCountdownInitialValue((value: number) => {
    currentCountdownInitialValue = value;
    if (countdownTimerElement && !countdownInterval) {
        countdownTimerElement.textContent = formatTime(currentCountdownInitialValue);
    }
    if (isCountdownMenuVisible) {
        updateCountdownMenuDisplay();
    }
});

window.electronAPI.onUpdateTimerPresets((presets: number[]) => {
    console.log('[TimerRenderer] Received presets update:', presets);
    currentPresetValues = presets;
    if (isCountdownMenuVisible) {
        renderTimerPresets();
    }
});

window.electronAPI.onSetTimerMode((mode: 'timer' | 'setup') => {
    console.log(`[TimerRenderer] Setting mode to: ${mode}`);
    if (mode === 'setup') {
        setCountdownMenuVisible(true);
    } else {
        setCountdownMenuVisible(false);
    }
    // Re-apply font size on mode switch just in case
    if (countdownTimerElement) {
        countdownTimerElement.style.fontSize = `${currentFontSize}px`;
    }
});

// IPC Listener for immediate start
window.electronAPI.onStartCountdown((duration: number) => {
    console.log(`[TimerRenderer] Received start-countdown IPC: ${duration}s`);
    if (isCountdownMenuVisible) {
        setCountdownMenuVisible(false);
    }
    startCountdown(duration);
});

// Joy-Con Button Listeners
window.electronAPI.onJoyConButtonPlusPressed(() => {
    // Note: main.ts handles window visibility toggle. 
});

window.electronAPI.onJoyConButtonMinusPressed(() => {
    if (!isCountdownMenuVisible) return;
    applyCountdownValue(-1);
});

window.electronAPI.onJoyConButtonSrPressed(() => {
    setCountdownMenuVisible(!isCountdownMenuVisible);
});

function updatePresetFocus() {
    const btns = timerPresetsContainer?.querySelectorAll('.menu-preset-btn');
    if (!btns) return;
    btns.forEach((btn, index) => {
        if (index === selectedPresetIndex) {
            btn.classList.add('focused');
            const time = currentPresetValues[index];
            currentCountdownInitialValue = time;
            updateCountdownMenuDisplay();
        } else {
            btn.classList.remove('focused');
        }
    });
}

window.electronAPI.onTimerMenuNavigate((direction: number) => {
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

window.electronAPI.onTimerMenuSelect(() => {
    if (!isCountdownMenuVisible) return;
    if (selectedPresetIndex !== -1) {
         setCountdownMenuVisible(false); 
         startCountdown(currentCountdownInitialValue); 
    }
});

console.log('[TimerRenderer] Initialized.');
renderTimerPresets();
// Final apply for start
if (countdownTimerElement) {
    countdownTimerElement.style.fontSize = `${currentFontSize}px`;
}

