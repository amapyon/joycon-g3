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
    rumble?: boolean;
};
type ElectronAPI = {
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
    selectMediaFolder: () => Promise<string>;
    setMediaBasePath: (dir: string) => Promise<boolean>;
    updateSoundPlayDelay: (delayMs: number) => void;
    updateTimerNotifications: (configs: NotificationConfig[]) => void;
    onUpdateTimerNotifications: (callback: (configs: NotificationConfig[]) => void) => void;
    onUpdateSoundPlayDelay: (callback: (delayMs: number) => void) => void;
    toggleTimerWindow: () => void;
    toggleTimerPause: () => void;
    addMinuteTimer: () => void;
    onMainTimerUpdate: (callback: (remainingTime: number) => void) => void;
    requestJoyConStatus: () => void;
    sendMessageText: (text: string) => void;
    toggleMessageWindow: () => void;
};
type MainRendererElements = {
    displaySelect: HTMLSelectElement;
    cursorToggleBtn: HTMLButtonElement;
    errorMessageDiv: HTMLElement;
    mainBatteryStatusLeft: HTMLElement;
    mainBatteryStatusRight: HTMLElement;
    pptSelect: HTMLSelectElement;
    calibrateButton: HTMLButtonElement;
    calibrationStatus: HTMLElement;
    countdownInitialValueInput: HTMLInputElement;
    mainStatusLeftText: HTMLElement;
    mainStatusRightText: HTMLElement;
    joyconLeftActionBtn: HTMLButtonElement;
    joyconRightActionBtn: HTMLButtonElement;
    presetButtonsContainer: HTMLElement;
    presetInputsList: HTMLElement;
    addPresetConfigBtn: HTMLButtonElement;
    applyPresetsBtn: HTMLButtonElement;
    togglePresetEditBtn: HTMLButtonElement;
    presetEditContainer: HTMLElement;
    sound1Select: HTMLSelectElement;
    sound2Select: HTMLSelectElement;
    sound1TimeInput: HTMLInputElement;
    sound2TimeInput: HTMLInputElement;
    refreshSoundsBtn: HTMLButtonElement;
    soundFolderSelectBtn: HTMLButtonElement;
    soundPlayDelayInput: HTMLInputElement;
    sound1PlayBtn: HTMLButtonElement;
    sound2PlayBtn: HTMLButtonElement;
    sound1RumbleToggle: HTMLInputElement;
    sound2RumbleToggle: HTMLInputElement;
    toggleTimerWindowBtn: HTMLButtonElement;
    toggleTimerPauseBtn: HTMLButtonElement;
    addMinuteMainBtn: HTMLButtonElement;
    mainCountdownDisplay: HTMLElement;
    messageInput: HTMLDivElement;
    toggleMessageButton: HTMLButtonElement;
    colorContextMenu: HTMLDivElement;
};
type MainRendererState = {
    currentPresets: number[];
};
type MainRendererContext = {
    electronAPI: ElectronAPI;
    elements: MainRendererElements;
    state: MainRendererState;
    initDisplaySection?: () => void;
    initPptSection?: () => void;
    initJoyConSection?: () => void;
    initTimerSection?: () => void;
    initMessageSection?: () => void;
};

((): void => {
    const mainRenderer: MainRendererContext = {
        electronAPI: (window as unknown as { electronAPI: ElectronAPI }).electronAPI,
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

    (window as unknown as { mainRenderer: MainRendererContext }).mainRenderer = mainRenderer;
})();
