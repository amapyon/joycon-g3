// main-renderer.ts
// TypeScript化: DOM型・window.electronAPI型を明示

(() => {

type DisplayInfo = {
    id: number;
    label?: string;
    size: { width: number; height: number };
    scaleFactor?: number;
};
type PresentationInfo = { id: string; name: string; isRunning: boolean };
type JoyConStatus = { leftConnected: boolean; rightConnected: boolean };
type BatteryStatus = { isLeft: boolean; level: number };
type CalibrationStatus = { id: string; status: string };
type NotificationConfig = {
    time: number;
    filename: string;
    absolutePath: string;
};
type MainRendererElectronAPI = {
    getOpenPowerPointPresentations: () => Promise<PresentationInfo[]>;
    setTargetPresentation: (identifier: string) => void;
    onAvailablePresentations: (callback: (presentations: PresentationInfo[]) => void) => void;
    onAvailableDisplays: (callback: (displays: DisplayInfo[]) => void) => void;
    setTargetDisplay: (displayId: number) => void;
    launchCursorWindow: (displayId: number | string) => void;
    closeCursorWindow: () => void;
    onCursorWindowOpened: (callback: () => void) => void;
    onCursorWindowClosed: (callback: () => void) => void;
    onLaunchError: (callback: (message: string) => void) => void;
    onJoyConStatusUpdate: (callback: (status: JoyConStatus) => void) => void;
    connectJoyCon: (isLeft: boolean) => void;
    shutdownJoyCon: (isLeft: boolean) => void;
    onJoyConBatteryStatusUpdate: (callback: (status: BatteryStatus) => void) => void;
    startCalibration: () => void;
    onCalibrationStatusUpdate: (callback: (statusInfo: CalibrationStatus) => void) => void;
    sendCountdownInitialValue: (value: number) => void;
    onUpdateCountdownInitialValue: (callback: (value: number) => void) => void;
    startCountdownTimer: (duration: number) => void;
    updateTimerPresets: (presets: number[]) => void;
    onUpdateTimerPresets: (callback: (presets: number[]) => void) => void;
    getMediaFiles: () => Promise<string[]>;
    getMediaBasePath: () => Promise<string>;
    updateTimerNotifications: (configs: NotificationConfig[]) => void;
    onUpdateTimerNotifications: (callback: (configs: NotificationConfig[]) => void) => void;
    toggleTimerWindow: () => void;
    onMainTimerUpdate: (callback: (remainingTime: number) => void) => void;
    requestJoyConStatus: () => void;
    sendMessageText: (text: string) => void;
    toggleMessageWindow: () => void;
};

const electronAPI = (window as unknown as { electronAPI: MainRendererElectronAPI }).electronAPI;

const displaySelect = document.getElementById('display-select') as HTMLSelectElement;
const cursorToggleBtn = document.getElementById('cursor-toggle-btn') as HTMLButtonElement;
const errorMessageDiv = document.getElementById('error-message') as HTMLElement;
const mainBatteryStatusLeft = document.getElementById('main-battery-status-left') as HTMLElement;
const mainBatteryStatusRight = document.getElementById('main-battery-status-right') as HTMLElement;
const pptSelect = document.getElementById('ppt-select') as HTMLSelectElement;
const calibrateButton = document.getElementById('calibrate-button') as HTMLButtonElement;
const calibrationStatus = document.getElementById('calibration-status') as HTMLElement;
const countdownInitialValueInput = document.getElementById('countdown-initial-value') as HTMLInputElement; // New

/**
 * PowerPoint プレゼンテーションをロードして UI を更新する。
 * @returns 処理完了を示す Promise
 */
async function loadPowerPointPresentations() {
    pptSelect.innerHTML = '<option value="">-- Loading Presentations --</option>';
    pptSelect.disabled = true;
    try {
        const presentations = await electronAPI.getOpenPowerPointPresentations();
        pptSelect.innerHTML = ''; // Clear loading message
        if (presentations && presentations.length > 0) {
            presentations.forEach((ppt) => {
                const option = document.createElement('option');
                option.value = ppt.id;
                option.text = ppt.name + (ppt.isRunning ? ' (Running)' : '');
                pptSelect.appendChild(option);
            });
            pptSelect.disabled = false;
            // 最初のプレゼンテーションを自動選択し、ターゲットとして設定
            if (presentations.length > 0) {
                pptSelect.value = presentations[0].id;
                electronAPI.setTargetPresentation(presentations[0].id);
            }
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.text = '-- No Presentations Found --';
            pptSelect.appendChild(option);
            pptSelect.disabled = true;
        }
    } catch (error) {
        console.error('Failed to load PowerPoint presentations:', error);
        const option = document.createElement('option');
        option.value = '';
        option.text = '-- Error Loading Presentations --';
        pptSelect.appendChild(option);
        pptSelect.disabled = true;
    }
}

electronAPI.onAvailableDisplays((displays) => {
    console.log('Available displays:', displays);
    displaySelect.innerHTML = '';
    if (displays && displays.length > 0) {
        const storedDisplayIdRaw = localStorage.getItem('lastDisplayId');
        const storedDisplayId = storedDisplayIdRaw ? parseInt(storedDisplayIdRaw, 10) : null;
        const displayIds = displays.map((display) => display.id);
        const fallbackDisplayId = displayIds.reduce((min, id) => (id < min ? id : min), displayIds[0]);
        const defaultDisplayId = storedDisplayId !== null && displayIds.includes(storedDisplayId)
            ? storedDisplayId
            : fallbackDisplayId;

        displays.forEach((display) => {
            const option = document.createElement('option');
            option.value = String(display.id);
            // 物理ピクセルで表示
            const physicalWidth = display.size.width * (display.scaleFactor || 1);
            const physicalHeight = display.size.height * (display.scaleFactor || 1);
            option.text = (display.label || 'Display') + ' [' + physicalWidth + 'x' + physicalHeight + ' - ' + display.id + ']';
            displaySelect.appendChild(option);
        });
        displaySelect.disabled = false;
        cursorToggleBtn.disabled = false;
        displaySelect.value = String(defaultDisplayId);
        electronAPI.setTargetDisplay(defaultDisplayId);
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.text = '-- No Displays Found --';
        displaySelect.appendChild(option);
        displaySelect.disabled = true;
        cursorToggleBtn.disabled = true;
    }
});

// onAvailablePresentationsはメインプロセスからのプッシュ通知用として残しておく
electronAPI.onAvailablePresentations((presentations) => {
    console.log('Received updated available presentations:', presentations);
    // ここではUIを直接更新せず、loadPowerPointPresentationsを呼び出すことで一貫性を保つ
    loadPowerPointPresentations();
});

pptSelect.addEventListener('change', () => {
    const selectedId = pptSelect.value;
    if (selectedId) {
        electronAPI.setTargetPresentation(selectedId);
    }
});

displaySelect.addEventListener('change', () => {
    const selectedDisplayId = parseInt(displaySelect.value, 10);
    if (!isNaN(selectedDisplayId)) {
        console.log(`[main-renderer] Display selected: ${selectedDisplayId}`);
        electronAPI.setTargetDisplay(selectedDisplayId);
        localStorage.setItem('lastDisplayId', String(selectedDisplayId));
    }
});

cursorToggleBtn.addEventListener('click', () => {
    const isRunning = cursorToggleBtn.textContent === 'OFF';
    if (isRunning) {
        // Stop
        errorMessageDiv.textContent = 'Closing cursor window...';
        electronAPI.closeCursorWindow();
    } else {
        // Start
        const selectedDisplayId = displaySelect.value;
        if (selectedDisplayId) {
            electronAPI.launchCursorWindow(selectedDisplayId);
            cursorToggleBtn.disabled = true;
            displaySelect.disabled = true;
            errorMessageDiv.textContent = '';
        }
    }
});

electronAPI.onCursorWindowOpened(() => {
    cursorToggleBtn.textContent = 'OFF';
    cursorToggleBtn.style.background = '#dc3545';
    cursorToggleBtn.disabled = false;
    displaySelect.disabled = true;
    errorMessageDiv.textContent = '';
});

electronAPI.onCursorWindowClosed(() => {
    errorMessageDiv.textContent = 'Cursor window closed. Ready to launch again.';
    displaySelect.disabled = false;
    cursorToggleBtn.disabled = false;
    cursorToggleBtn.textContent = 'ON';
    cursorToggleBtn.style.background = '#28a745';
});

electronAPI.onLaunchError((message) => {
    errorMessageDiv.textContent = `Error: ${message}`;
    cursorToggleBtn.disabled = false;
    displaySelect.disabled = false;
    cursorToggleBtn.textContent = 'ON';
    cursorToggleBtn.style.background = '#28a745';
});

const mainStatusLeftText = document.getElementById('main-status-left-text') as HTMLElement;
const mainStatusRightText = document.getElementById('main-status-right-text') as HTMLElement;
const joyconLeftActionBtn = document.getElementById('joycon-left-action-btn') as HTMLButtonElement;
const joyconRightActionBtn = document.getElementById('joycon-right-action-btn') as HTMLButtonElement;

electronAPI.onJoyConStatusUpdate((status) => {
    console.log('JoyCon status update in renderer:', status);
    
    // Update Left
    if (mainStatusLeftText && joyconLeftActionBtn) {
        mainStatusLeftText.textContent = status.leftConnected ? 'L: 🟢' : 'L: ⚪';
        mainStatusLeftText.className = status.leftConnected ? 'connected' : 'disconnected';
        joyconLeftActionBtn.textContent = status.leftConnected ? 'OFF' : 'ON';
        joyconLeftActionBtn.style.backgroundColor = status.leftConnected ? '#dc3545' : '#28a745';
        joyconLeftActionBtn.style.color = 'white';
        joyconLeftActionBtn.style.padding = '2px 10px';
        // Clear battery if disconnected
        if (!status.leftConnected && mainBatteryStatusLeft) mainBatteryStatusLeft.textContent = '';
    }
    
    // Update Right
    if (mainStatusRightText && joyconRightActionBtn) {
        mainStatusRightText.textContent = status.rightConnected ? 'R: 🟢' : 'R: ⚪';
        mainStatusRightText.className = status.rightConnected ? 'connected' : 'disconnected';
        joyconRightActionBtn.textContent = status.rightConnected ? 'OFF' : 'ON';
        joyconRightActionBtn.style.backgroundColor = status.rightConnected ? '#dc3545' : '#28a745';
        joyconRightActionBtn.style.color = 'white';
        joyconRightActionBtn.style.padding = '2px 10px';
        // Clear battery if disconnected
        if (!status.rightConnected && mainBatteryStatusRight) mainBatteryStatusRight.textContent = '';
    }
});

joyconLeftActionBtn.addEventListener('click', () => {
    const isConnected = mainStatusLeftText.classList.contains('connected');
    if (isConnected) {
        electronAPI.shutdownJoyCon(true);
    } else {
        electronAPI.connectJoyCon(true);
    }
});

joyconRightActionBtn.addEventListener('click', () => {
    const isConnected = mainStatusRightText.classList.contains('connected');
    if (isConnected) {
        electronAPI.shutdownJoyCon(false);
    } else {
        electronAPI.connectJoyCon(false);
    }
});

electronAPI.onJoyConBatteryStatusUpdate(({ isLeft, level }) => {
    // Convert level (0-4) to battery icon
    // 0 = Empty, 1 = 25%, 2 = 50%, 3 = 75%, 4 = 100%
    let icon = '';
    let percentage = 0;
    
    switch (level) {
    case 0:
        icon = '🪫'; // Empty battery
        percentage = 0;
        break;
    case 1:
        icon = '🔋'; // Low battery (25%)
        percentage = 25;
        break;
    case 2:
        icon = '🔋'; // Medium-low battery (50%)
        percentage = 50;
        break;
    case 3:
        icon = '🔋'; // Medium-high battery (75%)
        percentage = 75;
        break;
    case 4:
        icon = '🔋'; // Full battery (100%)
        percentage = 100;
        break;
    default:
        icon = '❓';
        percentage = 0;
    }
    
    const displayText = `${icon} ${percentage}%`;
    
    if (isLeft) {
        mainBatteryStatusLeft.textContent = displayText;
    } else {
        mainBatteryStatusRight.textContent = displayText;
    }
});

calibrateButton.addEventListener('click', () => {
    calibrationStatus.textContent = 'Calibrating... Keep Joy-Cons still!';
    calibrateButton.disabled = true;
    electronAPI.startCalibration();
});

electronAPI.onCalibrationStatusUpdate((statusInfo) => {
    let message = `Calibration ${statusInfo.status}.`;
    if (statusInfo.status === 'complete') {
        message = 'Calibration complete!';
        calibrateButton.disabled = false;
    } else if (statusInfo.status === 'failed') {
        message = 'Calibration failed.';
        calibrateButton.disabled = false;
    }
    calibrationStatus.textContent = message;
});

// --- Timer Presets Management ---
const presetButtonsContainer = document.getElementById('preset-buttons-container') as HTMLElement;
const presetInputsList = document.getElementById('preset-inputs-list') as HTMLElement;
const addPresetConfigBtn = document.getElementById('add-preset-config-btn') as HTMLButtonElement;
const applyPresetsBtn = document.getElementById('apply-presets-btn') as HTMLButtonElement;
const togglePresetEditBtn = document.getElementById('toggle-preset-edit-btn') as HTMLButtonElement;
const presetEditContainer = document.getElementById('preset-edit-container') as HTMLElement;

togglePresetEditBtn.addEventListener('click', () => {
    const isHidden = presetEditContainer.style.display === 'none';
    presetEditContainer.style.display = isHidden ? 'block' : 'none';
    togglePresetEditBtn.textContent = isHidden ? '✕ Close Edit' : '⚙ Edit Presets';
    togglePresetEditBtn.style.background = isHidden ? '#dc3545' : '#6c757d';
});

// Load presets from localStorage or use defaults
let currentPresets: number[] = JSON.parse(localStorage.getItem('timerPresets') || '[10, 60, 120, 180, 300]');

/**
 * メイン画面のプリセット表示ラベルを生成する。
 * @param seconds 秒数
 * @returns 表示ラベル
 */
function formatMainPresetLabel(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs === 0 ? `${mins}m` : `${mins}m${secs}s`;
}

/**
 * プリセットボタンを描画する。
 */
function renderPresets() {
    presetButtonsContainer.innerHTML = '';
    currentPresets.forEach(time => {
        const btn = document.createElement('button');
        btn.className = 'preset-btn';
        btn.dataset.time = String(time);
        btn.textContent = formatMainPresetLabel(time);
        btn.addEventListener('click', () => {
            countdownInitialValueInput.value = String(time);
            electronAPI.sendCountdownInitialValue(time);
            localStorage.setItem('countdownInitialValue', String(time));
            electronAPI.startCountdownTimer(time);
        });
        presetButtonsContainer.appendChild(btn);
    });
}

/**
 * プリセット編集 UI を描画する。
 */
function renderPresetConfig() {
    presetInputsList.innerHTML = '';
    currentPresets.forEach((time, index) => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.marginBottom = '5px';

        const input = document.createElement('input');
        input.type = 'number';
        input.value = String(time);
        input.min = '1';
        input.max = '3600';
        input.style.width = '60px';
        input.style.marginRight = '5px';
        input.addEventListener('change', () => {
            currentPresets[index] = parseInt(input.value, 10) || 10;
        });

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.style.padding = '2px 8px';
        removeBtn.style.background = '#dc3545';
        removeBtn.style.color = 'white';
        removeBtn.addEventListener('click', () => {
            currentPresets.splice(index, 1);
            renderPresetConfig();
        });

        item.appendChild(input);
        item.appendChild(removeBtn);
        presetInputsList.appendChild(item);
    });
}

addPresetConfigBtn.addEventListener('click', () => {
    currentPresets.push(60);
    renderPresetConfig();
});

applyPresetsBtn.addEventListener('click', () => {
    // Sort and save
    currentPresets.sort((a, b) => a - b);
    localStorage.setItem('timerPresets', JSON.stringify(currentPresets));
    renderPresets();
    renderPresetConfig();
    
    // Broadcast to other windows
    electronAPI.updateTimerPresets(currentPresets);
});

// Initial render
renderPresets();
renderPresetConfig();

// Listen for updates from other windows if needed (for sync)
electronAPI.onUpdateTimerPresets((presets) => {
    currentPresets = presets;
    localStorage.setItem('timerPresets', JSON.stringify(currentPresets));
    renderPresets();
    renderPresetConfig();
});

// Initial load broadcasts to others
electronAPI.updateTimerPresets(currentPresets);

cursorToggleBtn.disabled = true;
pptSelect.disabled = true;

// --- Sound Notification Management (v2 - Two Timed Sounds) ---
const sound1Select = document.getElementById('sound1-select') as HTMLSelectElement;
const sound2Select = document.getElementById('sound2-select') as HTMLSelectElement;
const sound1TimeInput = document.getElementById('sound1-time') as HTMLInputElement;
const sound2TimeInput = document.getElementById('sound2-time') as HTMLInputElement;
const refreshSoundsBtn = document.getElementById('refresh-sounds-btn') as HTMLButtonElement;

/**
 * メディアファイル一覧を読み込み、セレクトボックスを更新する。
 * @returns 処理完了を示す Promise
 */
async function loadMediaFiles() {
    const files = await electronAPI.getMediaFiles();
    const dropdowns = [sound1Select, sound2Select];
    
    dropdowns.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- No Sound Selected --</option>';
        if (files && files.length > 0) {
            files.forEach((file: string) => {
                const option = document.createElement('option');
                option.value = file;
                option.text = file;
                if (file === currentVal) option.selected = true;
                select.appendChild(option);
            });
        }
    });

    restoreNotificationSettings();
}

/**
 * 通知設定をローカルストレージから復元する。
 */
function restoreNotificationSettings() {
    // Load from localStorage
    const saved = localStorage.getItem('timerNotifications');
    if (saved) {
        const configs: NotificationConfig[] = JSON.parse(saved);
        if (configs[0]) {
            sound1TimeInput.value = String(configs[0].time);
            setSelectValue(sound1Select, configs[0].filename);
        }
        if (configs[1]) {
            sound2TimeInput.value = String(configs[1].time);
            setSelectValue(sound2Select, configs[1].filename);
        }
    }
    broadcastNotificationUpdate();
}

/**
 * セレクトボックスの値を安全に反映する。
 * @param select 対象セレクト
 * @param val 設定する値
 */
function setSelectValue(select: HTMLSelectElement, val: string) {
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === val) {
            select.selectedIndex = i;
            break;
        }
    }
}

/**
 * 通知設定の更新を全ウィンドウへ通知する。
 * @returns 処理完了を示す Promise
 */
async function broadcastNotificationUpdate() {
    const basePath = await electronAPI.getMediaBasePath();
    const configs: NotificationConfig[] = [
        {
            time: parseInt(sound1TimeInput.value, 10) || 0,
            filename: sound1Select.value,
            absolutePath: sound1Select.value ? (basePath + '/' + sound1Select.value).replace(/\\/g, '/') : ''
        },
        {
            time: parseInt(sound2TimeInput.value, 10) || 0,
            filename: sound2Select.value,
            absolutePath: sound2Select.value ? (basePath + '/' + sound2Select.value).replace(/\\/g, '/') : ''
        }
    ];

    localStorage.setItem('timerNotifications', JSON.stringify(configs));
    electronAPI.updateTimerNotifications(configs);
}

[sound1Select, sound2Select, sound1TimeInput, sound2TimeInput].forEach(el => {
    el?.addEventListener('change', broadcastNotificationUpdate);
});

const sound1PlayBtn = document.getElementById('sound1-play-btn') as HTMLButtonElement;
const sound2PlayBtn = document.getElementById('sound2-play-btn') as HTMLButtonElement;

/**
 * サウンドファイルをプレビュー再生する。
 * @param filename ファイル名
 * @returns 処理完了を示す Promise
 */
async function previewSound(filename: string) {
    if (!filename) return;
    const basePath = await electronAPI.getMediaBasePath();
    const absolutePath = (basePath + '/' + filename).replace(/\\/g, '/');
    const audioUrl = absolutePath.startsWith('file://') ? absolutePath : 'file://' + absolutePath;
    
    try {
        const audio = new Audio(audioUrl);
        audio.play().catch(e => console.error('Preview play failed:', e));
    } catch (err) {
        console.error('Error playing preview:', err);
    }
}

if (sound1PlayBtn) {
    sound1PlayBtn.addEventListener('click', () => {
        previewSound(sound1Select.value);
    });
}

if (sound2PlayBtn) {
    sound2PlayBtn.addEventListener('click', () => {
        previewSound(sound2Select.value);
    });
}

if (refreshSoundsBtn) {
    refreshSoundsBtn.addEventListener('click', loadMediaFiles);
}

electronAPI.onUpdateTimerNotifications((configs) => {
    // Sync UI only if it differs significantly or is first load
    localStorage.setItem('timerNotifications', JSON.stringify(configs));
});

// Initial load
loadMediaFiles();

// Timer window toggle
const toggleTimerWindowBtn = document.getElementById('toggle-timer-window-btn') as HTMLButtonElement;
if (toggleTimerWindowBtn) {
    toggleTimerWindowBtn.addEventListener('click', () => {
        console.log('[Main Renderer] Toggle timer window');
        electronAPI.toggleTimerWindow();
    });
}

const mainCountdownDisplay = document.getElementById('main-countdown-display') as HTMLElement;

/**
 * 秒数を表示用の文字列に整形する。
 * @param seconds 秒数
 * @returns 表示用文字列
 */
function formatTimeForDisplay(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

electronAPI.onMainTimerUpdate((remainingTime) => {
    if (mainCountdownDisplay) {
        mainCountdownDisplay.textContent = formatTimeForDisplay(remainingTime);
        if (remainingTime <= 0) {
            mainCountdownDisplay.style.color = '#dc3545'; // 赤色
        } else {
            mainCountdownDisplay.style.color = '#007bff'; // 青色
        }
    }
});

console.log('Main Renderer script loaded.');
electronAPI.requestJoyConStatus();
loadPowerPointPresentations(); 
electronAPI.onUpdateCountdownInitialValue((value) => {
    if (!Number.isNaN(value)) {
        countdownInitialValueInput.value = String(value);
        localStorage.setItem('countdownInitialValue', String(value));
    }
});
countdownInitialValueInput.addEventListener('change', () => {
    const value = parseInt(countdownInitialValueInput.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 3600) {
        electronAPI.sendCountdownInitialValue(value);
        localStorage.setItem('countdownInitialValue', String(value));
    }
});

// Load initial value on startup
const savedInitialValue = localStorage.getItem('countdownInitialValue');
if (savedInitialValue) {
    const val = parseInt(savedInitialValue, 10);
    if (!isNaN(val)) {
        countdownInitialValueInput.value = savedInitialValue;
        electronAPI.sendCountdownInitialValue(val);
    }
}

// --- Message Window Logic ---
const messageInput = document.getElementById('message-input') as HTMLDivElement;
const toggleMessageButton = document.getElementById('toggle-message-button') as HTMLButtonElement;
const colorContextMenu = document.getElementById('color-context-menu') as HTMLDivElement;

if (messageInput && toggleMessageButton) {
    messageInput.addEventListener('input', () => {
        let text = messageInput.innerHTML;
        // Chromium adds a trailing <br> to contenteditable sometimes. Remove it.
        text = text.replace(/<br\s*\/?>$/i, '');
        
        electronAPI.sendMessageText(text);
    });

    toggleMessageButton.addEventListener('click', () => {
        electronAPI.toggleMessageWindow();
    });

    // Handle Context Menu (Right Click)
    messageInput.addEventListener('contextmenu', (e: MouseEvent) => {
        e.preventDefault();
        
        // Show menu at mouse position
        if (colorContextMenu) {
            colorContextMenu.style.display = 'block';
            colorContextMenu.style.left = `${e.clientX}px`;
            colorContextMenu.style.top = `${e.clientY}px`;
        }
    });

    // Hide context menu when clicking elsewhere
    window.addEventListener('click', (e: MouseEvent) => {
        if (colorContextMenu && !colorContextMenu.contains(e.target as Node)) {
            colorContextMenu.style.display = 'none';
        }
    });

    // Apply color when swatch is clicked
    const swatches = document.querySelectorAll('.color-swatch');
    
    swatches.forEach(swatch => {
        swatch.addEventListener('mousedown', (e: Event) => {
            // Use mousedown and preventDefault to avoid losing selection from the input
            e.preventDefault();
            const color = (swatch as HTMLElement).dataset.color;
            if (color) {
                applyColorToMessageInput(messageInput, color);
            }
            if (colorContextMenu) colorContextMenu.style.display = 'none';
        });
    });

    // Apply styles (Bold, Italic, Strike)
    const styleBtns = document.querySelectorAll('.style-btn');
    styleBtns.forEach(btn => {
        btn.addEventListener('mousedown', (e: Event) => {
            e.preventDefault();
            const cmd = (btn as HTMLElement).dataset.cmd;
            if (cmd) {
                messageInput.focus();
                document.execCommand(cmd, false);
                messageInput.dispatchEvent(new Event('input'));
            }
            if (colorContextMenu) colorContextMenu.style.display = 'none';
        });
    });
}

/**
 * 選択範囲の文字色を適用する。
 * @param input 対象入力欄
 * @param color 色コード
 */
function applyColorToMessageInput(input: HTMLDivElement, color: string) {
    input.focus();

    // 選択範囲があるか確認する
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        document.execCommand('foreColor', false, color);
    } else {
        // 選択がない場合は全選択して色を適用する
        document.execCommand('selectAll', false);
        document.execCommand('foreColor', false, color);
    }

    // 変更通知のために入力イベントを発火する
    input.dispatchEvent(new Event('input'));
}
})();
