import type { TimerNotificationConfig } from './timer-notification-config';
import type { PointerMotionDiagnostics, PointerMotionSettings } from './pointer-motion-settings';
import type { WifiTimerSettings } from './wifi-timer-settings';
import type {
    WifiTimerAudioSettings,
    WifiTimerAudioStreamChunkResult,
    WifiTimerAudioStreamEndResult,
    WifiTimerAudioStreamStartInput,
    WifiTimerAudioStreamStartResult,
    WifiTimerCustomAudioList,
    WifiTimerAudioTones,
    WifiTimerCapabilities,
    WifiTimerDisplaySettings,
    WifiTimerStatus,
    WifiTimerWifiInfo,
    WifiTimerWifiProfileInput,
} from './wifi-timer-api-types';
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

export type PresentationTargetType = 'powerpoint' | 'google-slides';

export type PresentationInfo = {
    id: string;
    name: string;
    isRunning: boolean;
    type: PresentationTargetType;
};

export type ElectronAPI = {
    getOpenPowerPointPresentations: () => Promise<PresentationInfo[]>;
    getOpenPresentationTargets: () => Promise<PresentationInfo[]>;
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
    updateWifiTimerSettings: (settings: WifiTimerSettings) => void;
    getWifiTimerCapabilities: () => Promise<WifiTimerCapabilities>;
    getWifiTimerAudioTones: () => Promise<WifiTimerAudioTones>;
    getWifiTimerCustomAudioList: () => Promise<WifiTimerCustomAudioList>;
    getWifiTimerStatus: () => Promise<WifiTimerStatus>;
    updateWifiTimerDisplaySettings: (settings: WifiTimerDisplaySettings) => Promise<WifiTimerStatus>;
    updateWifiTimerAudioSettings: (settings: WifiTimerAudioSettings) => Promise<WifiTimerStatus>;
    testWifiTimerAudioSettings: (settings: WifiTimerAudioSettings) => Promise<WifiTimerStatus>;
    uploadWifiTimerCustomAudio: (name: string, audio: Uint8Array) => Promise<Record<string, unknown>>;
    selectWifiTimerCustomAudio: (name: string) => Promise<Record<string, unknown>>;
    testWifiTimerCustomAudio: (name: string, settings: WifiTimerAudioSettings) => Promise<WifiTimerStatus>;
    deleteWifiTimerCustomAudio: (name: string) => Promise<Record<string, unknown>>;
    renameWifiTimerCustomAudio: (oldName: string, newName: string) => Promise<Record<string, unknown>>;
    startWifiTimerAudioStream: (input: WifiTimerAudioStreamStartInput) => Promise<WifiTimerAudioStreamStartResult>;
    sendWifiTimerAudioStreamChunk: (chunk: Uint8Array) => Promise<WifiTimerAudioStreamChunkResult>;
    endWifiTimerAudioStream: () => Promise<WifiTimerAudioStreamEndResult>;
    cancelWifiTimerAudioStream: () => Promise<void>;
    updateWifiTimerAudioStreamVolume: (volume: number) => Promise<void>;
    getWifiTimerWifi: () => Promise<WifiTimerWifiInfo>;
    saveWifiTimerWifiProfile: (profile: WifiTimerWifiProfileInput) => Promise<WifiTimerWifiInfo>;
    deleteWifiTimerWifiProfile: (id: number) => Promise<WifiTimerWifiInfo>;
    connectWifiTimerWifiProfile: (id: number) => Promise<WifiTimerWifiInfo>;
    moveUpWifiTimerWifiProfile: (id: number) => Promise<WifiTimerWifiInfo>;
    moveDownWifiTimerWifiProfile: (id: number) => Promise<WifiTimerWifiInfo>;
    rebootWifiTimer: () => Promise<void>;
    updateSoundPlayDelay: (delayMs: number) => void;
    updatePointerMotionSettings: (settings: PointerMotionSettings) => void;
    onPointerMotionDiagnostics: (callback: (diagnostics: PointerMotionDiagnostics) => void) => void;
    updateTimerNotifications: (configs: TimerNotificationConfig[]) => void;
    onUpdateTimerNotifications: (callback: (configs: TimerNotificationConfig[]) => void) => void;
    onUpdateSoundPlayDelay: (callback: (delayMs: number) => void) => void;
    sendTimerNotificationTrigger: (seconds: number, shouldRumble: boolean) => void;
    toggleTimerWindow: () => void;
    showClockTimerWindow: () => void;
    toggleTimerPause: () => void;
    addMinuteTimer: () => void;
    onMainTimerUpdate: (callback: (remainingTime: number) => void) => void;
    requestJoyConStatus: () => void;
    sendMessageText: (text: string) => void;
    setMessageAlwaysOnTop: (alwaysOnTop: boolean) => void;
    toggleMessageWindow: () => void;
};

export type MainRendererElements = {
    displaySelect: HTMLSelectElement;
    cursorToggleBtn: HTMLButtonElement;
    errorMessageDiv: HTMLElement;
    pointerMoveSpeedInput: HTMLInputElement;
    pointerMoveSpeedValue: HTMLElement;
    pointerGyroDeadzoneInput: HTMLInputElement;
    pointerCompensationStrengthSelect: HTMLSelectElement;
    pointerFixedAngleSelect: HTMLSelectElement;
    pointerDiagnosticsEnabledInput: HTMLInputElement;
    pointerDiagnosticsPanel: HTMLElement;
    pointerDiagnosticsLeft: HTMLElement;
    pointerDiagnosticsRight: HTMLElement;
    pointerSettingsResetBtn: HTMLButtonElement;
    mainBatteryStatusLeft: HTMLElement;
    mainBatteryStatusRight: HTMLElement;
    pptSelect: HTMLSelectElement;
    pptRefreshBtn: HTMLButtonElement;
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
    standaloneSoundPadToggleBtn: HTMLButtonElement;
    standaloneSoundPadContainer: HTMLElement;
    standaloneSoundPadGrid: HTMLElement;
    sound1RumbleToggle: HTMLInputElement;
    sound2RumbleToggle: HTMLInputElement;
    timeAlarmEnabledInput: HTMLInputElement;
    timeAlarmTargetTimeInput: HTMLInputElement;
    toggleTimerWindowBtn: HTMLButtonElement;
    showClockTimerBtn: HTMLButtonElement;
    toggleTimerPauseBtn: HTMLButtonElement;
    addMinuteMainBtn: HTMLButtonElement;
    wifiTimerEnabledInput: HTMLInputElement;
    wifiTimerIpAddressInput: HTMLInputElement;
    wifiTimerPanelContainer: HTMLElement;
    wifiTimerPanelToggleBtn: HTMLButtonElement;
    wifiTimerRefreshBtn: HTMLButtonElement;
    wifiTimerStateLabel: HTMLElement;
    wifiTimerIpLabel: HTMLElement;
    wifiTimerCurrentSsidLabel: HTMLElement;
    wifiTimerActiveBrightnessInput: HTMLInputElement;
    wifiTimerIdleBrightnessInput: HTMLInputElement;
    wifiTimerRotate180Input: HTMLInputElement;
    wifiTimerStage1SecondsInput: HTMLInputElement;
    wifiTimerStage2SecondsInput: HTMLInputElement;
    wifiTimerStage3SecondsInput: HTMLInputElement;
    wifiTimerBlinkSecondsInput: HTMLInputElement;
    wifiTimerBlinkIntervalMsInput: HTMLInputElement;
    wifiTimerStage1ColorInput: HTMLInputElement;
    wifiTimerStage2ColorInput: HTMLInputElement;
    wifiTimerStage3ColorInput: HTMLInputElement;
    wifiTimerAlertColorInput: HTMLInputElement;
    wifiTimerApplyDisplayBtn: HTMLButtonElement;
    wifiTimerSaveColorEffectBtn: HTMLButtonElement;
    wifiTimerPresetColorEffectBtn: HTMLButtonElement;
    wifiTimerColorEffectPreview: HTMLElement;
    wifiTimerToneKindSelect: HTMLSelectElement;
    wifiTimerCurrentCustomToneHint: HTMLElement;
    wifiTimerVolumeInput: HTMLInputElement;
    wifiTimerRepeatCountInput: HTMLInputElement;
    wifiTimerCustomSpeedInput: HTMLInputElement;
    wifiTimerApplyAudioBtn: HTMLButtonElement;
    wifiTimerTestAudioBtn: HTMLButtonElement;
    wifiTimerCustomToneFileInput: HTMLInputElement;
    wifiTimerUploadCustomToneBtn: HTMLButtonElement;
    wifiTimerRefreshCustomToneBtn: HTMLButtonElement;
    wifiTimerCustomStorageInfo: HTMLElement;
    wifiTimerCustomToneList: HTMLElement;
    wifiTimerLocalAudioFileInput: HTMLInputElement;
    wifiTimerStreamAudioBtn: HTMLButtonElement;
    wifiTimerPauseStreamBtn: HTMLButtonElement;
    wifiTimerResumeStreamBtn: HTMLButtonElement;
    wifiTimerCancelStreamBtn: HTMLButtonElement;
    wifiTimerStreamStatus: HTMLElement;
    wifiTimerWifiRefreshBtn: HTMLButtonElement;
    wifiTimerWifiProfileSelect: HTMLSelectElement;
    wifiTimerConnectProfileBtn: HTMLButtonElement;
    wifiTimerDeleteProfileBtn: HTMLButtonElement;
    wifiTimerMoveUpProfileBtn: HTMLButtonElement;
    wifiTimerMoveDownProfileBtn: HTMLButtonElement;
    wifiTimerSsidInput: HTMLInputElement;
    wifiTimerPasswordInput: HTMLInputElement;
    wifiTimerSaveProfileBtn: HTMLButtonElement;
    wifiTimerUpdateProfileBtn: HTMLButtonElement;
    wifiTimerRebootBtn: HTMLButtonElement;
    wifiTimerOperationMessage: HTMLElement;
    mainCountdownDisplay: HTMLElement;
    messageInput: HTMLDivElement;
    messageAlwaysOnTopInput: HTMLInputElement;
    toggleMessageButton: HTMLButtonElement;
    colorContextMenu: HTMLDivElement;
};

export type MainRendererState = {
    currentPresets: number[];
    wifiTimerSettings: WifiTimerSettings;
};

export type MainRendererContext = {
    electronAPI: ElectronAPI;
    elements: MainRendererElements;
    state: MainRendererState;
    initDisplaySection?: () => void;
    initPointerSettingsSection?: () => void;
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
