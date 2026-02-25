{
    type TimerMainLogicApi = import('../../shared/timer-main-logic-types').TimerMainLogicApi;
    type MainRendererContext = import('../../shared/main-renderer-types').MainRendererContext;
    type TimerNotificationConfig = import('../../shared/timer-notification-config').TimerNotificationConfig;
    type ParseNumberUtilsApi = import('../../shared/parse-number-utils-types').ParseNumberUtilsApi;
    type LocalStorageStoreApi = import('../../shared/local-storage-store-types').LocalStorageStoreApi;
    type MainTimerApiResolverBootstrapApi = import('../../shared/renderer-api-resolver-types').RendererApiResolverBootstrapApi;
    type TimerUiUtilsApi = {
        setSelectValue: (select: HTMLSelectElement, value: string) => void;
        resolveStoredCountdownInitialValue: (
            storedValue: string,
            parseCountdownInitialValue: (rawValue: string, min: number, max: number) => number | null,
            min: number,
            max: number,
        ) => number | null;
        previewSound: (
            filename: string,
            getMediaBasePath: () => Promise<string>,
            buildMediaAbsolutePath: (basePath: string, filename: string) => string,
            toFileUrl: (absolutePath: string) => string,
        ) => Promise<void>;
        applyStoredMediaDir: (
            storedDir: string,
            setMediaBasePath: (dir: string) => Promise<boolean>,
            removeStoredDir: () => void,
        ) => Promise<void>;
    };
    type TimerSoundHandlersApi = {
        registerSoundHandlers: (deps: {
            elements: MainRendererContext['elements'];
            electronAPI: MainRendererContext['electronAPI'];
            localStorageStore: LocalStorageStoreApi;
            timerUiUtils: TimerUiUtilsApi;
            timerMainLogic: TimerMainLogicApi;
            loadMediaFiles: () => Promise<void>;
            broadcastNotificationUpdate: () => Promise<void>;
        }) => void;
    };

    const rendererApiResolverUtils = ((): import('../../shared/renderer-api-resolver-types').RendererApiResolverUtilsApi => {
        const root = globalThis as typeof globalThis & {
            rendererApiResolverBootstrap?: MainTimerApiResolverBootstrapApi;
        };
        if (root.rendererApiResolverBootstrap) {
            return root.rendererApiResolverBootstrap.getRendererApiResolverUtils('../api-resolver-access');
        }
        if (typeof require !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
            return (require('../api-resolver-utils') as MainTimerApiResolverBootstrapApi).getRendererApiResolverUtils('../api-resolver-access');
        }
        throw new Error('rendererApiResolverBootstrap API is not available');
    })();
    const mainRenderer = rendererApiResolverUtils.resolveGlobal<MainRendererContext>('mainRenderer');
    const timerMainLogic = rendererApiResolverUtils.resolveApi<TimerMainLogicApi>('timerMainLogic', './timer-logic');
    const parseNumberUtils = rendererApiResolverUtils.resolveApi<ParseNumberUtilsApi>('parseNumberUtils', '../parse-number-utils');
    const timerUiUtils = rendererApiResolverUtils.resolveApi<TimerUiUtilsApi>('timerUiUtils', './timer-ui-utils');
    const timerSoundHandlers = rendererApiResolverUtils.resolveApi<TimerSoundHandlersApi>('timerSoundHandlers', './timer-sound-handlers');
    const localStorageStore = rendererApiResolverUtils.resolveGlobal<LocalStorageStoreApi>('localStorageStore');
    const { electronAPI, elements, state } = mainRenderer;

    /**
     * カウントダウン初期値を反映して通知する。
     * @param value 秒数
     * @param shouldNotify メインプロセスへ通知するか
     * @param shouldStart タイマーを開始するか
     * @returns なし
     */
    const applyCountdownInitialValue = (value: number, shouldNotify: boolean, shouldStart: boolean): void => {
        elements.countdownInitialValueInput.value = String(value);
        localStorageStore.setString('countdownInitialValue', String(value));
        if (shouldNotify) {
            electronAPI.sendCountdownInitialValue(value);
        }
        if (shouldStart) {
            electronAPI.startCountdownTimer(value);
        }
    };

    /**
     * プリセットボタンを描画する。
     * @returns なし
     */
    const renderPresets = (): void => {
        elements.presetButtonsContainer.innerHTML = '';
        state.currentPresets.forEach((time: number): void => {
            const btn = document.createElement('button');
            btn.className = 'preset-btn';
            btn.dataset.time = String(time);
            btn.textContent = timerMainLogic.formatPresetLabel(time);
            btn.addEventListener('click', (): void => {
                applyCountdownInitialValue(time, true, true);
            });
            elements.presetButtonsContainer.appendChild(btn);
        });
    };

    /**
     * プリセット編集 UI を描画する。
     * @returns なし
     */
    const renderPresetConfig = (): void => {
        elements.presetInputsList.innerHTML = '';
        state.currentPresets.forEach((time: number, index: number): void => {
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
            input.addEventListener('change', (): void => {
                state.currentPresets[index] = parseNumberUtils.parseIntOrFallback(input.value, 10);
            });

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.style.padding = '2px 8px';
            removeBtn.style.background = '#dc3545';
            removeBtn.style.color = 'white';
            removeBtn.addEventListener('click', (): void => {
                state.currentPresets.splice(index, 1);
                renderPresetConfig();
            });

            item.appendChild(input);
            item.appendChild(removeBtn);
            elements.presetInputsList.appendChild(item);
        });
    };

    /**
     * プリセット編集パネルの表示を切り替える。
     * @returns なし
     */
    const togglePresetEditPanel = (): void => {
        const isHidden = elements.presetEditContainer.style.display === 'none';
        elements.presetEditContainer.style.display = isHidden ? 'block' : 'none';
        elements.togglePresetEditBtn.textContent = isHidden ? '✕ Close Edit' : '⚙ Edit Presets';
        elements.togglePresetEditBtn.style.background = isHidden ? '#dc3545' : '#6c757d';
    };

    /**
     * プリセットの保存と適用を行う。
     * @returns なし
     */
    const applyPresets = (): void => {
        state.currentPresets.sort((a: number, b: number): number => a - b);
        localStorageStore.setJsonValue('timerPresets', state.currentPresets);
        renderPresets();
        renderPresetConfig();
        electronAPI.updateTimerPresets(state.currentPresets);
    };

    /**
     * 通知音の振動設定を初期化する。
     * @returns なし
     */
    const initNotificationRumbleToggle = (): void => {
        const toggleMap: Array<{ toggle: HTMLInputElement; index: number }> = [
            { toggle: elements.sound1RumbleToggle, index: 0 },
            { toggle: elements.sound2RumbleToggle, index: 1 },
        ];
        toggleMap.forEach(({ toggle, index }: { toggle: HTMLInputElement; index: number }): void => {
            toggle.addEventListener('change', (): void => {
                void index;
                void broadcastNotificationUpdate();
            });
        });
    };

    /**
     * メインメニューのタイマー操作ボタンを初期化する。
     * @returns なし
     */
    const initTimerActionButtons = (): void => {
        elements.toggleTimerPauseBtn.addEventListener('click', (): void => {
            electronAPI.toggleTimerPause();
        });
        elements.addMinuteMainBtn.addEventListener('click', (): void => {
            electronAPI.addMinuteTimer();
        });
    };

    /**
     * 通知設定をローカルストレージから復元する。
     * @returns なし
     */
    const restoreNotificationSettings = (): void => {
        const configs = localStorageStore.getJsonValue<TimerNotificationConfig[]>('timerNotifications', []);
        if (configs.length > 0) {
            if (configs[0]) {
                elements.sound1TimeInput.value = String(configs[0].time);
                timerUiUtils.setSelectValue(elements.sound1Select, configs[0].filename);
                elements.sound1RumbleToggle.checked = !!configs[0].rumble;
            }
            if (configs[1]) {
                elements.sound2TimeInput.value = String(configs[1].time);
                timerUiUtils.setSelectValue(elements.sound2Select, configs[1].filename);
                elements.sound2RumbleToggle.checked = !!configs[1].rumble;
            }
        }
        void broadcastNotificationUpdate();
    };

    /**
     * 通知設定の更新を全ウィンドウへ通知する。
     * @returns 処理完了を示す Promise
     */
    const broadcastNotificationUpdate = async (): Promise<void> => {
        const basePath = await electronAPI.getMediaBasePath();
        const configs: TimerNotificationConfig[] = [
            {
                time: parseNumberUtils.parseIntOrFallback(elements.sound1TimeInput.value, 0),
                filename: elements.sound1Select.value,
                absolutePath: timerMainLogic.buildMediaAbsolutePath(basePath, elements.sound1Select.value),
                rumble: elements.sound1RumbleToggle.checked,
            },
            {
                time: parseNumberUtils.parseIntOrFallback(elements.sound2TimeInput.value, 0),
                filename: elements.sound2Select.value,
                absolutePath: timerMainLogic.buildMediaAbsolutePath(basePath, elements.sound2Select.value),
                rumble: elements.sound2RumbleToggle.checked,
            },
        ];
        localStorageStore.setJsonValue('timerNotifications', configs);
        electronAPI.updateTimerNotifications(configs);
    };

    /**
     * メディアファイル一覧を読み込み、セレクトボックスを更新する。
     * @returns 処理完了を示す Promise
     */
    const loadMediaFiles = async (): Promise<void> => {
        const files = await electronAPI.getMediaFiles();
        const dropdowns = [elements.sound1Select, elements.sound2Select];
        dropdowns.forEach((select: HTMLSelectElement): void => {
            const currentVal = select.value;
            select.innerHTML = '<option value="">-- No Sound Selected --</option>';
            if (files && files.length > 0) {
                files.forEach((file: string): void => {
                    const option = document.createElement('option');
                    option.value = file;
                    option.text = file;
                    if (file === currentVal) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
            }
        });
        restoreNotificationSettings();
    };

    /**
     * サウンド再生遅延を初期化する。
     * @returns なし
     */
    const initSoundPlayDelay = (): void => {
        const storedDelay = localStorageStore.getString('soundPlayDelayMs', '');
        const defaultDelay = 200;
        const initialDelay = parseNumberUtils.parseIntOrFallback(storedDelay, defaultDelay);
        const normalizedDelay = timerMainLogic.normalizeSoundPlayDelay(initialDelay, defaultDelay, 0, 5000);
        elements.soundPlayDelayInput.value = String(normalizedDelay);
        electronAPI.updateSoundPlayDelay(normalizedDelay);

        elements.soundPlayDelayInput.addEventListener('change', (): void => {
            const nextValue = parseNumberUtils.parseIntOrFallback(elements.soundPlayDelayInput.value, defaultDelay);
            const clamped = timerMainLogic.normalizeSoundPlayDelay(nextValue, defaultDelay, 0, 5000);
            elements.soundPlayDelayInput.value = String(clamped);
            localStorageStore.setString('soundPlayDelayMs', String(clamped));
            electronAPI.updateSoundPlayDelay(clamped);
        });
    };

    /**
     * プリセット編集関連イベントを登録する。
     * @returns なし
     */
    const registerPresetEditHandlers = (): void => {
        elements.togglePresetEditBtn.addEventListener('click', (): void => {
            togglePresetEditPanel();
        });

        elements.addPresetConfigBtn.addEventListener('click', (): void => {
            state.currentPresets.push(60);
            renderPresetConfig();
        });

        elements.applyPresetsBtn.addEventListener('click', (): void => {
            applyPresets();
        });
    };

    /**
     * タイマー同期関連イベントを登録する。
     * @returns なし
     */
    const registerTimerSyncHandlers = (): void => {
        electronAPI.onUpdateTimerPresets((presets: number[]): void => {
            state.currentPresets = presets;
            localStorageStore.setJsonValue('timerPresets', state.currentPresets);
            renderPresets();
            renderPresetConfig();
        });

        electronAPI.onMainTimerUpdate((remainingTime: number): void => {
            elements.mainCountdownDisplay.textContent = timerMainLogic.formatTimeForDisplay(remainingTime);
            elements.mainCountdownDisplay.style.color = remainingTime <= 0 ? '#dc3545' : '#007bff';
        });

        electronAPI.onUpdateCountdownInitialValue((value: number): void => {
            if (!Number.isNaN(value)) {
                applyCountdownInitialValue(value, false, false);
            }
        });
    };

    /**
     * 初期値入力イベントを登録する。
     * @returns なし
     */
    const registerCountdownInputHandler = (): void => {
        elements.countdownInitialValueInput.addEventListener('change', (): void => {
            const value = timerMainLogic.parseCountdownInitialValue(elements.countdownInitialValueInput.value, 1, 3600);
            if (value !== null) {
                applyCountdownInitialValue(value, true, false);
            }
        });
    };

    /**
     * タイマーセクションを初期化する。
     * @returns なし
     */
    const initTimerSection = (): void => {
        registerPresetEditHandlers();

        renderPresets();
        initTimerActionButtons();
        initNotificationRumbleToggle();
        initSoundPlayDelay();
        renderPresetConfig();
        registerTimerSyncHandlers();
        timerSoundHandlers.registerSoundHandlers({
            elements,
            electronAPI,
            localStorageStore,
            timerUiUtils,
            timerMainLogic,
            loadMediaFiles,
            broadcastNotificationUpdate,
        });
        registerCountdownInputHandler();

        electronAPI.updateTimerPresets(state.currentPresets);

        void timerUiUtils
            .applyStoredMediaDir(
                localStorageStore.getString('soundMediaDir', ''),
                electronAPI.setMediaBasePath,
                (): void => {
                    localStorageStore.remove('soundMediaDir');
                },
            )
            .then(() => loadMediaFiles());

        elements.toggleTimerWindowBtn.addEventListener('click', (): void => {
            electronAPI.toggleTimerWindow();
        });
        const storedInitialValue = timerUiUtils.resolveStoredCountdownInitialValue(
            localStorageStore.getString('countdownInitialValue', ''),
            timerMainLogic.parseCountdownInitialValue,
            1,
            3600,
        );
        if (storedInitialValue !== null) {
            applyCountdownInitialValue(storedInitialValue, true, false);
        }
    };

    mainRenderer.initTimerSection = initTimerSection;
}
