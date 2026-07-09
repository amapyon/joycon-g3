((): void => {
    type StorageKeys = typeof import('../shared/storage-keys').storageKeys;

    const storageKeys: StorageKeys = {
        countdownInitialValue: 'countdownInitialValue',
        lastDisplayId: 'lastDisplayId',
        messageAlwaysOnTop: 'messageAlwaysOnTop',
        messageFontSize: 'messageFontSize',
        messageHtml: 'messageHtml',
        messageWindowOpacity: 'messageWindowOpacity',
        selectedPresentationTarget: 'selectedPresentationTarget',
        soundMediaDir: 'soundMediaDir',
        soundPlayDelayMs: 'soundPlayDelayMs',
        standalonePadAssignments: 'standalonePadAssignments',
        standalonePadVisible: 'standalonePadVisible',
        timerFontSize: 'timerFontSize',
        timerNotifications: 'timerNotifications',
        timerWindowOpacity: 'timerWindowOpacity',
        timerPresets: 'timerPresets',
        wifiTimerPanelVisible: 'wifiTimerPanelVisible',
        wifiTimerSettings: 'wifiTimerSettings',
    };

    const root = globalThis as typeof globalThis & { storageKeys?: StorageKeys };
    root.storageKeys = storageKeys;
})();
