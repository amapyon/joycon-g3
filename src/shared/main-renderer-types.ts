import type { TimerNotificationConfig } from './timer-notification-config';
import type {
    BatteryStatus,
    CalibrationStatus,
    JoyConStatus,
} from './joycon-event-types';
export type { BatteryStatus, CalibrationStatus, JoyConStatus } from './joycon-event-types';

export type DisplayInfo = {
    id: number;
    label?: string;
    size: { width: number; height: number };
    scaleFactor?: number;
};

export type PresentationInfo = { id: string; name: string; isRunning: boolean };
export type NotificationConfig = TimerNotificationConfig;

export type ElectronAPI = {
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

export type MainRendererElements = {
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

export type MainRendererState = {
    currentPresets: number[];
};

export type MainRendererContext = {
    electronAPI: ElectronAPI;
    elements: MainRendererElements;
    state: MainRendererState;
    initDisplaySection?: () => void;
    initPptSection?: () => void;
    initJoyConSection?: () => void;
    initTimerSection?: () => void;
    initMessageSection?: () => void;
};

/**
 * mainRenderer 取得アクセサAPI。
 */
export type MainRendererAccessApi = {
    getMainRenderer: () => MainRendererContext;
};
