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
let currentFontSize: number = 48; // Default, style controls this mostly but logic might override
let isCountdownMenuVisible = false;
let selectedPresetIndex: number = -1; 
let currentPresetValues: number[] = [10, 60, 120, 180, 300]; 
const timerPresetsContainer: HTMLElement | null = document.getElementById('timer-presets-container');

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
    }
}

function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

function startCountdown(duration: number) {
    if (!countdownTimerElement) return;

    stopCountdown();
    currentCountdownInitialValue = duration;
    countdownValue = duration;
    
    countdownTimerElement.style.visibility = 'visible';
    countdownTimerElement.style.color = '#ffffff'; 
    countdownTimerElement.textContent = formatTime(countdownValue);
    
    console.log(`[TimerRenderer] Starting countdown: ${duration}s`);

    countdownInterval = setInterval(() => {
        countdownValue--;
        if (countdownValue >= 0) {
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

// Event Listeners

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
    if (countdownTimerElement) {
        if (isCountdownMenuVisible) {
            applyCountdownValue(1);
            return;
        }
        if (countdownInterval) {
            stopCountdown();
            countdownTimerElement.style.visibility = 'hidden';
            countdownTimerElement.textContent = formatTime(currentCountdownInitialValue);
        } else {
            startCountdown(currentCountdownInitialValue);
        }
    }
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
