type TimerNotificationConfig = import('../../shared/timer-notification-config').TimerNotificationConfig;
type LocalStorageStoreApi = import('../../shared/local-storage-store-types').LocalStorageStoreApi;

export type TimerSoundHandlersApi = {
    registerSoundHandlers: (deps: TimerSoundHandlersDeps) => void;
};

type TimerSoundHandlersDeps = {
    elements: {
        sound1Select: HTMLSelectElement;
        sound2Select: HTMLSelectElement;
        sound1TimeInput: HTMLInputElement;
        sound2TimeInput: HTMLInputElement;
        sound1PlayBtn: HTMLButtonElement;
        sound2PlayBtn: HTMLButtonElement;
        refreshSoundsBtn: HTMLButtonElement;
        soundFolderSelectBtn: HTMLButtonElement;
    };
    electronAPI: {
        selectMediaFolder: () => Promise<string>;
        getMediaBasePath: () => Promise<string>;
        setMediaBasePath: (dir: string) => Promise<boolean>;
        onUpdateTimerNotifications: (callback: (configs: TimerNotificationConfig[]) => void) => void;
    };
    localStorageStore: LocalStorageStoreApi;
    timerUiUtils: {
        previewSound: (
            filename: string,
            getMediaBasePath: () => Promise<string>,
            buildMediaAbsolutePath: (basePath: string, filename: string) => string,
            toFileUrl: (absolutePath: string) => string,
        ) => Promise<void>;
    };
    timerMainLogic: {
        buildMediaAbsolutePath: (basePath: string, filename: string) => string;
        toFileUrl: (absolutePath: string) => string;
    };
    loadMediaFiles: () => Promise<void>;
    broadcastNotificationUpdate: () => Promise<void>;
};

/**
 * サウンド関連イベントを登録する。
 * @param deps 登録に必要な依存
 */
function registerSoundHandlers(deps: TimerSoundHandlersDeps): void {
    const {
        elements,
        electronAPI,
        localStorageStore,
        timerUiUtils,
        timerMainLogic,
        loadMediaFiles,
        broadcastNotificationUpdate,
    } = deps;

    [elements.sound1Select, elements.sound2Select, elements.sound1TimeInput, elements.sound2TimeInput]
        .forEach((el: HTMLSelectElement | HTMLInputElement): void => {
            el.addEventListener('change', (): void => {
                void broadcastNotificationUpdate();
            });
        });

    elements.sound1PlayBtn.addEventListener('click', (): void => {
        void timerUiUtils.previewSound(
            elements.sound1Select.value,
            electronAPI.getMediaBasePath,
            timerMainLogic.buildMediaAbsolutePath,
            timerMainLogic.toFileUrl,
        );
    });

    elements.sound2PlayBtn.addEventListener('click', (): void => {
        void timerUiUtils.previewSound(
            elements.sound2Select.value,
            electronAPI.getMediaBasePath,
            timerMainLogic.buildMediaAbsolutePath,
            timerMainLogic.toFileUrl,
        );
    });

    elements.refreshSoundsBtn.addEventListener('click', (): void => {
        void loadMediaFiles();
    });

    elements.soundFolderSelectBtn.addEventListener('click', async (): Promise<void> => {
        await electronAPI.selectMediaFolder();
        const basePath = await electronAPI.getMediaBasePath();
        if (basePath) {
            localStorageStore.setString('soundMediaDir', basePath);
        }
        void loadMediaFiles();
    });

    electronAPI.onUpdateTimerNotifications((configs: TimerNotificationConfig[]): void => {
        localStorageStore.setJsonValue('timerNotifications', configs);
    });
}

const api: TimerSoundHandlersApi = {
    registerSoundHandlers,
};

const root = globalThis as typeof globalThis & {
    timerSoundHandlers?: TimerSoundHandlersApi;
};
root.timerSoundHandlers = api;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = api;
}
