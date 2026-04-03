type ElectronAPI = import('../../shared/main-renderer-types').ElectronAPI;
type MainRendererContext = import('../../shared/main-renderer-types').MainRendererContext;
type LocalStorageStoreApi = import('../../shared/local-storage-store-types').LocalStorageStoreApi;
type MainWindowApiAccessorApi = import('../../shared/main-window-api-types').MainWindowApiAccessorApi;
type WifiTimerSettings = import('../../shared/wifi-timer-settings').WifiTimerSettings;

const DEFAULT_WIFI_TIMER_SETTINGS: WifiTimerSettings = {
    enabled: false,
    ipAddress: '',
};

((): void => {
    const mainWindowApiAccessor = (globalThis as typeof globalThis & {
        mainWindowApiAccessor?: MainWindowApiAccessorApi;
    }).mainWindowApiAccessor;
    if (!mainWindowApiAccessor) {
        throw new Error('mainWindowApiAccessor is not available');
    }
    const electronAPI = mainWindowApiAccessor.getApi<ElectronAPI>('electronAPI');
    const localStorageStore = mainWindowApiAccessor.getApi<LocalStorageStoreApi>('localStorageStore');
    const mainRenderer: MainRendererContext = {
        electronAPI,
        elements: {
            displaySelect: document.getElementById('display-select') as HTMLSelectElement,
            cursorToggleBtn: document.getElementById('cursor-toggle-btn') as HTMLButtonElement,
            errorMessageDiv: document.getElementById('error-message') as HTMLElement,
            pointerMoveSpeedInput: document.getElementById('pointer-move-speed') as HTMLInputElement,
            pointerMoveSpeedValue: document.getElementById('pointer-move-speed-value') as HTMLElement,
            pointerGyroDeadzoneInput: document.getElementById('pointer-gyro-deadzone') as HTMLInputElement,
            pointerSettingsResetBtn: document.getElementById('pointer-settings-reset-btn') as HTMLButtonElement,
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
            standaloneSoundPadToggleBtn: document.getElementById('standalone-sound-pad-toggle-btn') as HTMLButtonElement,
            standaloneSoundPadContainer: document.getElementById('standalone-sound-pad-container') as HTMLElement,
            standaloneSoundPadGrid: document.getElementById('standalone-sound-pad-grid') as HTMLElement,
            sound1RumbleToggle: document.getElementById('sound1-rumble') as HTMLInputElement,
            sound2RumbleToggle: document.getElementById('sound2-rumble') as HTMLInputElement,
            toggleTimerWindowBtn: document.getElementById('toggle-timer-window-btn') as HTMLButtonElement,
            toggleTimerPauseBtn: document.getElementById('toggle-timer-pause-btn') as HTMLButtonElement,
            addMinuteMainBtn: document.getElementById('add-minute-main-btn') as HTMLButtonElement,
            wifiTimerEnabledInput: document.getElementById('wifi-timer-enabled') as HTMLInputElement,
            wifiTimerIpAddressInput: document.getElementById('wifi-timer-ip-address') as HTMLInputElement,
            wifiTimerPanelContainer: document.getElementById('wifi-timer-panel-container') as HTMLElement,
            wifiTimerPanelToggleBtn: document.getElementById('wifi-timer-panel-toggle-btn') as HTMLButtonElement,
            wifiTimerRefreshBtn: document.getElementById('wifi-timer-refresh-btn') as HTMLButtonElement,
            wifiTimerStateLabel: document.getElementById('wifi-timer-state') as HTMLElement,
            wifiTimerIpLabel: document.getElementById('wifi-timer-current-ip') as HTMLElement,
            wifiTimerCurrentSsidLabel: document.getElementById('wifi-timer-current-ssid') as HTMLElement,
            wifiTimerActiveBrightnessInput: document.getElementById('wifi-timer-active-brightness') as HTMLInputElement,
            wifiTimerIdleBrightnessInput: document.getElementById('wifi-timer-idle-brightness') as HTMLInputElement,
            wifiTimerRotate180Input: document.getElementById('wifi-timer-rotate180') as HTMLInputElement,
            wifiTimerApplyDisplayBtn: document.getElementById('wifi-timer-apply-display-btn') as HTMLButtonElement,
            wifiTimerToneKindSelect: document.getElementById('wifi-timer-tone-kind') as HTMLSelectElement,
            wifiTimerVolumeInput: document.getElementById('wifi-timer-volume') as HTMLInputElement,
            wifiTimerRepeatCountInput: document.getElementById('wifi-timer-repeat-count') as HTMLInputElement,
            wifiTimerCustomSpeedInput: document.getElementById('wifi-timer-custom-speed') as HTMLInputElement,
            wifiTimerApplyAudioBtn: document.getElementById('wifi-timer-apply-audio-btn') as HTMLButtonElement,
            wifiTimerTestAudioBtn: document.getElementById('wifi-timer-test-audio-btn') as HTMLButtonElement,
            wifiTimerWifiRefreshBtn: document.getElementById('wifi-timer-wifi-refresh-btn') as HTMLButtonElement,
            wifiTimerWifiProfileSelect: document.getElementById('wifi-timer-profile-select') as HTMLSelectElement,
            wifiTimerConnectProfileBtn: document.getElementById('wifi-timer-connect-profile-btn') as HTMLButtonElement,
            wifiTimerDeleteProfileBtn: document.getElementById('wifi-timer-delete-profile-btn') as HTMLButtonElement,
            wifiTimerMoveUpProfileBtn: document.getElementById('wifi-timer-move-up-profile-btn') as HTMLButtonElement,
            wifiTimerMoveDownProfileBtn: document.getElementById('wifi-timer-move-down-profile-btn') as HTMLButtonElement,
            wifiTimerSsidInput: document.getElementById('wifi-timer-ssid') as HTMLInputElement,
            wifiTimerPasswordInput: document.getElementById('wifi-timer-password') as HTMLInputElement,
            wifiTimerSaveProfileBtn: document.getElementById('wifi-timer-save-profile-btn') as HTMLButtonElement,
            wifiTimerUpdateProfileBtn: document.getElementById('wifi-timer-update-profile-btn') as HTMLButtonElement,
            wifiTimerRebootBtn: document.getElementById('wifi-timer-reboot-btn') as HTMLButtonElement,
            wifiTimerOperationMessage: document.getElementById('wifi-timer-operation-message') as HTMLElement,
            mainCountdownDisplay: document.getElementById('main-countdown-display') as HTMLElement,
            messageInput: document.getElementById('message-input') as HTMLDivElement,
            toggleMessageButton: document.getElementById('toggle-message-button') as HTMLButtonElement,
            colorContextMenu: document.getElementById('color-context-menu') as HTMLDivElement,
        },
        state: {
            currentPresets: localStorageStore.getJsonValue<number[]>('timerPresets', [10, 60, 120, 180, 300]),
            wifiTimerSettings: localStorageStore.getJsonValue<WifiTimerSettings>('wifiTimerSettings', DEFAULT_WIFI_TIMER_SETTINGS),
        },
    };

    mainWindowApiAccessor.setApi<MainRendererContext>('mainRenderer', mainRenderer);
})();
