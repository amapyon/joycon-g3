type ElectronAPI = import('../../shared/main-renderer-types').ElectronAPI;
type MainRendererContext = import('../../shared/main-renderer-types').MainRendererContext;

((): void => {
    const electronAPI = (window as Window & { electronAPI?: ElectronAPI }).electronAPI;
    if (!electronAPI) {
        throw new Error('electronAPI is not available');
    }
    const mainRenderer: MainRendererContext = {
        electronAPI,
        elements: {
            displaySelect: document.getElementById('display-select') as HTMLSelectElement,
            cursorToggleBtn: document.getElementById('cursor-toggle-btn') as HTMLButtonElement,
            errorMessageDiv: document.getElementById('error-message') as HTMLElement,
            mainBatteryStatusLeft: document.getElementById('main-battery-status-left') as HTMLElement,
            mainBatteryStatusRight: document.getElementById('main-battery-status-right') as HTMLElement,
            pptSelect: document.getElementById('ppt-select') as HTMLSelectElement,
            calibrateButton: document.getElementById('calibrate-button') as HTMLButtonElement,
            calibrationStatus: document.getElementById('calibration-status') as HTMLElement,
            countdownInitialValueInput: document.getElementById('countdown-initial-value') as HTMLInputElement,
            mainStatusLeftText: document.getElementById('main-status-left-text') as HTMLElement,
            mainStatusRightText: document.getElementById('main-status-right-text') as HTMLElement,
            joyconLeftActionBtn: document.getElementById('joycon-left-action-btn') as HTMLButtonElement,
            joyconRightActionBtn: document.getElementById('joycon-right-action-btn') as HTMLButtonElement,
            presetButtonsContainer: document.getElementById('preset-buttons-container') as HTMLElement,
            presetInputsList: document.getElementById('preset-inputs-list') as HTMLElement,
            addPresetConfigBtn: document.getElementById('add-preset-config-btn') as HTMLButtonElement,
            applyPresetsBtn: document.getElementById('apply-presets-btn') as HTMLButtonElement,
            togglePresetEditBtn: document.getElementById('toggle-preset-edit-btn') as HTMLButtonElement,
            presetEditContainer: document.getElementById('preset-edit-container') as HTMLElement,
            sound1Select: document.getElementById('sound1-select') as HTMLSelectElement,
            sound2Select: document.getElementById('sound2-select') as HTMLSelectElement,
            sound1TimeInput: document.getElementById('sound1-time') as HTMLInputElement,
            sound2TimeInput: document.getElementById('sound2-time') as HTMLInputElement,
            refreshSoundsBtn: document.getElementById('refresh-sounds-btn') as HTMLButtonElement,
            soundFolderSelectBtn: document.getElementById('sound-folder-select-btn') as HTMLButtonElement,
            soundPlayDelayInput: document.getElementById('sound-play-delay') as HTMLInputElement,
            sound1PlayBtn: document.getElementById('sound1-play-btn') as HTMLButtonElement,
            sound2PlayBtn: document.getElementById('sound2-play-btn') as HTMLButtonElement,
            sound1RumbleToggle: document.getElementById('sound1-rumble') as HTMLInputElement,
            sound2RumbleToggle: document.getElementById('sound2-rumble') as HTMLInputElement,
            toggleTimerWindowBtn: document.getElementById('toggle-timer-window-btn') as HTMLButtonElement,
            toggleTimerPauseBtn: document.getElementById('toggle-timer-pause-btn') as HTMLButtonElement,
            addMinuteMainBtn: document.getElementById('add-minute-main-btn') as HTMLButtonElement,
            mainCountdownDisplay: document.getElementById('main-countdown-display') as HTMLElement,
            messageInput: document.getElementById('message-input') as HTMLDivElement,
            toggleMessageButton: document.getElementById('toggle-message-button') as HTMLButtonElement,
            colorContextMenu: document.getElementById('color-context-menu') as HTMLDivElement,
        },
        state: {
            currentPresets: JSON.parse(localStorage.getItem('timerPresets') || '[10, 60, 120, 180, 300]') as number[],
        },
    };

    (window as Window & { mainRenderer?: MainRendererContext }).mainRenderer = mainRenderer;
})();
