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
    countdownTimerElement.style.color = '#ffffff'; // active color
    // countdownTimerElement.style.fontSize = `${currentFontSize}px`; // Let CSS handle base size for now or sync if needed
    countdownTimerElement.textContent = formatTime(countdownValue);
    
    console.log(`[TimerRenderer] Starting countdown: ${duration}s`);

    countdownInterval = setInterval(() => {
        countdownValue--;
        if (countdownValue >= 0) {
            countdownTimerElement!.textContent = formatTime(countdownValue);
        } else {
            stopCountdown();
            // Do NOT hide, keep visible but inactive styling
            countdownTimerElement!.style.visibility = 'visible';
            countdownTimerElement!.style.color = '#888888'; // inactive color
            countdownTimerElement!.textContent = formatTime(currentCountdownInitialValue); // Show reset value? Or 0:00? "Timer itself" usually implies ready state.
             // Let's show the reset value so they know what happens if they press + again.
            console.log('[TimerRenderer] Countdown finished.');
        }
    }, 1000);
}

function applyCountdownValue(delta: number) {
    currentCountdownInitialValue = clampCountdownValue(currentCountdownInitialValue + delta);
    updateCountdownMenuDisplay();
    // If timer is NOT running and NOT in menu, update text of hidden timer so it shows correct value when started
    // Start: Logic update for "Always visible"
    // If timer is visible (which is mostly always now unless closed via menu?), update text.
    if (countdownTimerElement && !countdownInterval && !isCountdownMenuVisible) {
        countdownTimerElement.textContent = formatTime(currentCountdownInitialValue);
        countdownTimerElement.style.visibility = 'visible'; // Ensure it's visible if we are adjusting it
        countdownTimerElement.style.color = '#ffffff'; // Make it look active/ready if we are changing it
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
    console.log('[TimerRenderer] Received button-plus-pressed IPC event.');
    if (countdownTimerElement) {
        if (isCountdownMenuVisible) {
            applyCountdownValue(1);
            return;
        }
        if (countdownInterval) {
            stopCountdown();
            countdownTimerElement.style.visibility = 'hidden';
            countdownTimerElement.textContent = formatTime(currentCountdownInitialValue);
            console.log('[TimerRenderer] Countdown stopped and hidden.');
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

console.log('[TimerRenderer] Initialized.');
