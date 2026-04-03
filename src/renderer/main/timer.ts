{
    type TimerMainLogicApi = import('../../shared/timer-main-logic-types').TimerMainLogicApi;
    type MainRendererContext = import('../../shared/main-renderer-types').MainRendererContext;
    type TimerNotificationConfig = import('../../shared/timer-notification-config').TimerNotificationConfig;
    type ParseNumberUtilsApi = import('../../shared/parse-number-utils-types').ParseNumberUtilsApi;
    type LocalStorageStoreApi = import('../../shared/local-storage-store-types').LocalStorageStoreApi;
    type WifiTimerSettings = import('../../shared/wifi-timer-settings').WifiTimerSettings;
    type WifiTimerStatus = import('../../shared/wifi-timer-api-types').WifiTimerStatus;
    type WifiTimerAudioTone = import('../../shared/wifi-timer-api-types').WifiTimerAudioTone;
    type WifiTimerAudioToneLimits = import('../../shared/wifi-timer-api-types').WifiTimerAudioToneLimits;
    type WifiTimerAudioTones = import('../../shared/wifi-timer-api-types').WifiTimerAudioTones;
    type WifiTimerWifiInfo = import('../../shared/wifi-timer-api-types').WifiTimerWifiInfo;
    type WifiTimerWifiProfile = import('../../shared/wifi-timer-api-types').WifiTimerWifiProfile;
    type WifiTimerDisplaySettings = import('../../shared/wifi-timer-api-types').WifiTimerDisplaySettings;
    type WifiTimerAudioSettings = import('../../shared/wifi-timer-api-types').WifiTimerAudioSettings;
    type WifiTimerWifiProfileInput = import('../../shared/wifi-timer-api-types').WifiTimerWifiProfileInput;
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
    type StandalonePadAudioState = {
        audio: HTMLAudioElement | null;
        assignedFile: string;
        playButton: HTMLButtonElement | null;
        pauseButton: HTMLButtonElement | null;
        stopButton: HTMLButtonElement | null;
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
    const defaultWifiTimerSettings: WifiTimerSettings = { enabled: false, ipAddress: '' };
    const defaultWifiTimerAudioToneLimits: WifiTimerAudioToneLimits = {
        toneIdMin: 0,
        toneIdMax: 8,
        volumeMin: 0,
        volumeMax: 100,
        repeatCountMin: 1,
        repeatCountMax: 20,
        customSpeedMin: 60,
        customSpeedMax: 120,
    };
    const defaultWifiTimerAudioSettings: WifiTimerAudioSettings = {
        toneKind: 0,
        volume: 50,
        repeatCount: 1,
        customSpeed: 100,
    };
    const standalonePadCount = 10;
    const standalonePadAssignmentsKey = 'standalonePadAssignments';
    const standalonePadVisibilityKey = 'standalonePadVisible';
    const wifiTimerPanelVisibilityKey = 'wifiTimerPanelVisible';
    let currentWifiTimerProfiles: WifiTimerWifiProfile[] = [];
    let currentWifiTimerAudioToneLimits: WifiTimerAudioToneLimits = defaultWifiTimerAudioToneLimits;
    let currentWifiTimerAudioSettings: WifiTimerAudioSettings = defaultWifiTimerAudioSettings;
    const standalonePadAudioStates: StandalonePadAudioState[] = Array.from({ length: standalonePadCount }, (): StandalonePadAudioState => ({
        audio: null,
        assignedFile: '',
        playButton: null,
        pauseButton: null,
        stopButton: null,
    }));

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
     * WiFi タイマー設定をフォームへ反映する。
     * @param settings 設定値
     */
    const applyWifiTimerSettingsToForm = (settings: WifiTimerSettings): void => {
        elements.wifiTimerEnabledInput.checked = settings.enabled;
        elements.wifiTimerIpAddressInput.value = settings.ipAddress;
    };

    /**
     * フォームから WiFi タイマー設定を読み取る。
     * @returns 読み取った設定
     */
    const readWifiTimerSettingsFromForm = (): WifiTimerSettings => {
        return {
            enabled: elements.wifiTimerEnabledInput.checked,
            ipAddress: elements.wifiTimerIpAddressInput.value.trim(),
        };
    };

    /**
     * WiFi タイマー設定を保存してメインプロセスへ通知する。
     * @param settings 保存する設定
     */
    const persistWifiTimerSettings = (settings: WifiTimerSettings): void => {
        state.wifiTimerSettings = settings;
        localStorageStore.setJsonValue('wifiTimerSettings', settings);
        electronAPI.updateWifiTimerSettings(settings);
        const currentCountdownValue = timerMainLogic.parseCountdownInitialValue(elements.countdownInitialValueInput.value, 1, 3600);
        if (currentCountdownValue !== null) {
            electronAPI.sendCountdownInitialValue(currentCountdownValue);
        }
    };

    /**
     * WiFi タイマー設定 UI を初期化する。
     */
    const initWifiTimerSettings = (): void => {
        const storedSettings = localStorageStore.getJsonValue<WifiTimerSettings>('wifiTimerSettings', defaultWifiTimerSettings);
        state.wifiTimerSettings = {
            enabled: storedSettings.enabled,
            ipAddress: storedSettings.ipAddress.trim(),
        };
        applyWifiTimerSettingsToForm(state.wifiTimerSettings);
        electronAPI.updateWifiTimerSettings(state.wifiTimerSettings);

        const handleChange = (): void => {
            const nextSettings = readWifiTimerSettingsFromForm();
            applyWifiTimerSettingsToForm(nextSettings);
            persistWifiTimerSettings(nextSettings);
        };

        elements.wifiTimerEnabledInput.addEventListener('change', handleChange);
        elements.wifiTimerIpAddressInput.addEventListener('change', handleChange);
    };

    /**
     * WiFi タイマーパネルの表示状態を反映する。
     * @param isVisible 表示するなら true
     */
    const applyWifiTimerPanelVisibility = (isVisible: boolean): void => {
        elements.wifiTimerPanelContainer.querySelector('.wifi-timer-panel')?.setAttribute('style', `display: ${isVisible ? 'block' : 'none'};`);
        elements.wifiTimerPanelToggleBtn.textContent = isVisible ? 'Hide WiFi Timer' : 'Show WiFi Timer';
        localStorageStore.setString(wifiTimerPanelVisibilityKey, isVisible ? '1' : '0');
    };

    /**
     * WiFi タイマー操作メッセージを表示する。
     * @param message 表示内容
     * @param isError エラー表示かどうか
     */
    const setWifiTimerOperationMessage = (message: string, isError: boolean = false): void => {
        elements.wifiTimerOperationMessage.textContent = message;
        elements.wifiTimerOperationMessage.style.color = isError ? '#b04a3f' : '#7a5a00';
    };

    /**
     * WiFi タイマー状態を UI に反映する。
     * @param status 状態
     */
    const applyWifiTimerStatus = (status: WifiTimerStatus): void => {
        currentWifiTimerAudioSettings = {
            toneKind: status.alertToneKind,
            volume: status.alertVolume,
            repeatCount: status.alertRepeatCount,
            customSpeed: status.alertCustomSpeedPercent,
        };
        elements.wifiTimerStateLabel.textContent = `State: ${status.state}`;
        elements.wifiTimerIpLabel.textContent = `IP: ${status.ip || '--'}`;
        elements.wifiTimerActiveBrightnessInput.value = String(status.activeBrightness);
        elements.wifiTimerIdleBrightnessInput.value = String(status.idleBrightness);
        elements.wifiTimerRotate180Input.checked = status.rotate180;
        timerUiUtils.setSelectValue(elements.wifiTimerToneKindSelect, String(status.alertToneKind));
        elements.wifiTimerVolumeInput.value = String(status.alertVolume);
        elements.wifiTimerRepeatCountInput.value = String(status.alertRepeatCount);
        elements.wifiTimerCustomSpeedInput.value = String(status.alertCustomSpeedPercent);
    };

    /**
     * 音色定義から表示ラベルを生成する。
     * @param tone 音色定義
     * @returns 表示ラベル
     */
    const formatWifiTimerToneLabel = (tone: WifiTimerAudioTone): string => {
        const baseLabel = tone.label || tone.name || `Tone ${tone.id}`;
        if (tone.available) {
            return `${tone.id}: ${baseLabel}`;
        }
        return `${tone.id}: ${baseLabel} (Unavailable)`;
    };

    /**
     * 音色カタログを UI に反映する。
     * @param audioTones 音色カタログ
     * @param preferredToneKind 優先して選択する toneKind
     * @param shouldSyncAudioSettings 音設定の補助値も同期するなら true
     */
    const applyWifiTimerAudioTones = (
        audioTones: WifiTimerAudioTones,
        preferredToneKind?: number,
        shouldSyncAudioSettings: boolean = true,
    ): void => {
        currentWifiTimerAudioToneLimits = audioTones.limits;
        if (shouldSyncAudioSettings) {
            currentWifiTimerAudioSettings = {
                toneKind: audioTones.current.toneKind ?? audioTones.defaults.toneKind,
                volume: audioTones.current.volume ?? audioTones.defaults.volume,
                repeatCount: audioTones.current.repeatCount ?? audioTones.defaults.repeatCount,
                customSpeed: audioTones.current.customSpeed ?? audioTones.defaults.customSpeed,
            };
        }
        const selectedToneKind = preferredToneKind ?? audioTones.current.toneKind ?? audioTones.defaults.toneKind;
        elements.wifiTimerVolumeInput.min = String(audioTones.limits.volumeMin);
        elements.wifiTimerVolumeInput.max = String(audioTones.limits.volumeMax);
        elements.wifiTimerRepeatCountInput.min = String(audioTones.limits.repeatCountMin);
        elements.wifiTimerRepeatCountInput.max = String(audioTones.limits.repeatCountMax);
        elements.wifiTimerCustomSpeedInput.min = String(audioTones.limits.customSpeedMin);
        elements.wifiTimerCustomSpeedInput.max = String(audioTones.limits.customSpeedMax);
        elements.wifiTimerToneKindSelect.innerHTML = '';
        if (audioTones.tones.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.text = '-- No Tones --';
            elements.wifiTimerToneKindSelect.appendChild(option);
            return;
        }
        audioTones.tones.forEach((tone: WifiTimerAudioTone): void => {
            const option = document.createElement('option');
            option.value = String(tone.id);
            option.text = formatWifiTimerToneLabel(tone);
            if (!tone.available) {
                option.dataset.available = '0';
            }
            if (tone.id === selectedToneKind) {
                option.selected = true;
            }
            elements.wifiTimerToneKindSelect.appendChild(option);
        });
        if (!elements.wifiTimerToneKindSelect.value && audioTones.tones[0]) {
            elements.wifiTimerToneKindSelect.value = String(audioTones.tones[0].id);
        }
    };

    /**
     * WiFi プロファイル選択状態をフォームへ反映する。
     */
    const syncWifiTimerProfileSelection = (): void => {
        const selectedProfileId = parseNumberUtils.parseIntOrNull(elements.wifiTimerWifiProfileSelect.value);
        const selectedProfile = currentWifiTimerProfiles.find((profile: WifiTimerWifiProfile): boolean => profile.id === selectedProfileId) ?? null;
        elements.wifiTimerConnectProfileBtn.disabled = selectedProfile === null;
        elements.wifiTimerDeleteProfileBtn.disabled = selectedProfile === null;
        elements.wifiTimerUpdateProfileBtn.disabled = selectedProfile === null;
        elements.wifiTimerMoveUpProfileBtn.disabled = selectedProfile === null;
        elements.wifiTimerMoveDownProfileBtn.disabled = selectedProfile === null;
        if (!selectedProfile) {
            return;
        }
        elements.wifiTimerSsidInput.value = selectedProfile.ssid;
        elements.wifiTimerPasswordInput.value = '';
    };

    /**
     * WiFi 情報を UI に反映する。
     * @param wifiInfo WiFi 情報
     */
    const applyWifiTimerWifiInfo = (wifiInfo: WifiTimerWifiInfo): void => {
        currentWifiTimerProfiles = wifiInfo.profiles;
        elements.wifiTimerCurrentSsidLabel.textContent = `SSID: ${wifiInfo.currentSsid || '--'}`;
        if (wifiInfo.ip) {
            elements.wifiTimerIpLabel.textContent = `IP: ${wifiInfo.ip}`;
        }
        const previousValue = elements.wifiTimerWifiProfileSelect.value;
        const connectedProfile = wifiInfo.profiles.find((profile: WifiTimerWifiProfile): boolean => profile.connected) ?? null;
        const activeProfile = wifiInfo.profiles.find((profile: WifiTimerWifiProfile): boolean => profile.active) ?? null;
        elements.wifiTimerWifiProfileSelect.innerHTML = '';
        if (wifiInfo.profiles.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.text = '-- No Profiles --';
            elements.wifiTimerWifiProfileSelect.appendChild(option);
            syncWifiTimerProfileSelection();
            return;
        }
        wifiInfo.profiles.forEach((profile: WifiTimerWifiProfile): void => {
            const option = document.createElement('option');
            option.value = String(profile.id);
            option.text = `${profile.connected ? '●' : profile.active ? '○' : '・'} ${profile.ssid}`;
            if (
                profile.connected
                || (!connectedProfile && previousValue === option.value)
                || (!connectedProfile && !previousValue && activeProfile?.id === profile.id)
            ) {
                option.selected = true;
            }
            elements.wifiTimerWifiProfileSelect.appendChild(option);
        });
        if (!elements.wifiTimerWifiProfileSelect.value && wifiInfo.profiles[0]) {
            elements.wifiTimerWifiProfileSelect.value = String(wifiInfo.profiles[0].id);
        }
        syncWifiTimerProfileSelection();
    };

    /**
     * WiFi タイマー状態を更新取得する。
     * @returns 状態
     */
    const refreshWifiTimerStatus = async (): Promise<WifiTimerStatus> => {
        const status = await electronAPI.getWifiTimerStatus();
        applyWifiTimerStatus(status);
        return status;
    };

    /**
     * WiFi タイマーの音色カタログを更新取得する。
     * @param preferredToneKind 優先して選択する toneKind
     * @returns 音色カタログ
     */
    const refreshWifiTimerAudioTones = async (preferredToneKind?: number): Promise<WifiTimerAudioTones> => {
        const audioTones = await electronAPI.getWifiTimerAudioTones();
        applyWifiTimerAudioTones(audioTones, preferredToneKind);
        return audioTones;
    };

    /**
     * WiFi タイマーの WiFi 情報を更新取得する。
     * @returns WiFi 情報
     */
    const refreshWifiTimerWifiInfo = async (): Promise<WifiTimerWifiInfo> => {
        const wifiInfo = await electronAPI.getWifiTimerWifi();
        applyWifiTimerWifiInfo(wifiInfo);
        return wifiInfo;
    };

    /**
     * WiFi タイマーパネル全体を更新する。
     */
    const refreshWifiTimerPanel = async (): Promise<void> => {
        const audioTones = await refreshWifiTimerAudioTones();
        const status = await refreshWifiTimerStatus();
        applyWifiTimerAudioTones(audioTones, status.alertToneKind, false);
        await refreshWifiTimerWifiInfo();
    };

    /**
     * 輝度・回転設定をフォームから読み取る。
     * @returns 表示設定
     */
    const readWifiTimerDisplaySettings = (): WifiTimerDisplaySettings => {
        const activeBrightness = Math.min(Math.max(parseNumberUtils.parseIntOrFallback(elements.wifiTimerActiveBrightnessInput.value, 255), 0), 255);
        const idleBrightness = Math.min(Math.max(parseNumberUtils.parseIntOrFallback(elements.wifiTimerIdleBrightnessInput.value, 32), 0), 255);
        elements.wifiTimerActiveBrightnessInput.value = String(activeBrightness);
        elements.wifiTimerIdleBrightnessInput.value = String(idleBrightness);
        return {
            activeBrightness,
            idleBrightness,
            rotate180: elements.wifiTimerRotate180Input.checked,
        };
    };

    /**
     * 音設定をフォームから読み取る。
     * @returns 音設定
     */
    const readWifiTimerAudioSettings = (): WifiTimerAudioSettings => {
        const toneKind = Math.min(
            Math.max(
                parseNumberUtils.parseIntOrFallback(elements.wifiTimerToneKindSelect.value, currentWifiTimerAudioToneLimits.toneIdMin),
                currentWifiTimerAudioToneLimits.toneIdMin,
            ),
            currentWifiTimerAudioToneLimits.toneIdMax,
        );
        const volume = Math.min(
            Math.max(
                parseNumberUtils.parseIntOrFallback(elements.wifiTimerVolumeInput.value, audioClampFallback('volume')),
                currentWifiTimerAudioToneLimits.volumeMin,
            ),
            currentWifiTimerAudioToneLimits.volumeMax,
        );
        const repeatCount = Math.min(
            Math.max(
                parseNumberUtils.parseIntOrFallback(elements.wifiTimerRepeatCountInput.value, audioClampFallback('repeatCount')),
                currentWifiTimerAudioToneLimits.repeatCountMin,
            ),
            currentWifiTimerAudioToneLimits.repeatCountMax,
        );
        const customSpeed = Math.min(
            Math.max(
                parseNumberUtils.parseIntOrFallback(elements.wifiTimerCustomSpeedInput.value, audioClampFallback('customSpeed')),
                currentWifiTimerAudioToneLimits.customSpeedMin,
            ),
            currentWifiTimerAudioToneLimits.customSpeedMax,
        );
        timerUiUtils.setSelectValue(elements.wifiTimerToneKindSelect, String(toneKind));
        elements.wifiTimerVolumeInput.value = String(volume);
        elements.wifiTimerRepeatCountInput.value = String(repeatCount);
        elements.wifiTimerCustomSpeedInput.value = String(customSpeed);
        return {
            toneKind,
            volume,
            repeatCount,
            customSpeed,
        };
    };

    /**
     * 音設定の既定値を返す。
     * @param kind 種別
     * @returns 既定値
     */
    const audioClampFallback = (kind: 'volume' | 'repeatCount' | 'customSpeed'): number => {
        if (kind === 'volume') {
            return currentWifiTimerAudioSettings.volume;
        }
        if (kind === 'repeatCount') {
            return currentWifiTimerAudioSettings.repeatCount;
        }
        return Math.min(
            Math.max(currentWifiTimerAudioSettings.customSpeed, currentWifiTimerAudioToneLimits.customSpeedMin),
            currentWifiTimerAudioToneLimits.customSpeedMax,
        );
    };

    /**
     * WiFi プロファイル入力を読み取る。
     * @returns 入力内容。SSID 未入力時は null
     */
    const readWifiTimerWifiProfileInput = (): WifiTimerWifiProfileInput | null => {
        const ssid = elements.wifiTimerSsidInput.value.trim();
        const password = elements.wifiTimerPasswordInput.value;
        if (!ssid) {
            return null;
        }
        return { ssid, password };
    };

    /**
     * 選択中の WiFi プロファイル ID を取得する。
     * @returns プロファイル ID。未選択時は null
     */
    const getSelectedWifiTimerProfileId = (): number | null => {
        return parseNumberUtils.parseIntOrNull(elements.wifiTimerWifiProfileSelect.value);
    };

    /**
     * WiFi タイマー設定操作を初期化する。
     */
    const initWifiTimerAdminPanel = (): void => {
        elements.wifiTimerWifiProfileSelect.addEventListener('change', (): void => {
            syncWifiTimerProfileSelection();
        });

        elements.wifiTimerRefreshBtn.addEventListener('click', (): void => {
            void refreshWifiTimerPanel()
                .then((): void => {
                    setWifiTimerOperationMessage('WiFi timer status refreshed.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerApplyDisplayBtn.addEventListener('click', (): void => {
            void electronAPI.updateWifiTimerDisplaySettings(readWifiTimerDisplaySettings())
                .then((status: WifiTimerStatus): void => {
                    applyWifiTimerStatus(status);
                    setWifiTimerOperationMessage('Display settings updated.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerApplyAudioBtn.addEventListener('click', (): void => {
            void electronAPI.updateWifiTimerAudioSettings(readWifiTimerAudioSettings())
                .then((status: WifiTimerStatus): void => {
                    applyWifiTimerStatus(status);
                    setWifiTimerOperationMessage('Audio settings updated.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerTestAudioBtn.addEventListener('click', (): void => {
            void electronAPI.testWifiTimerAudioSettings(readWifiTimerAudioSettings())
                .then((status: WifiTimerStatus): void => {
                    applyWifiTimerStatus(status);
                    setWifiTimerOperationMessage('Audio test requested.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerWifiRefreshBtn.addEventListener('click', (): void => {
            void refreshWifiTimerWifiInfo()
                .then((): void => {
                    setWifiTimerOperationMessage('Wi-Fi profiles refreshed.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerMoveUpProfileBtn.addEventListener('click', (): void => {
            const selectedProfileId = getSelectedWifiTimerProfileId();
            if (selectedProfileId === null) {
                setWifiTimerOperationMessage('移動するプロファイルを選択してください。', true);
                return;
            }
            void electronAPI.moveUpWifiTimerWifiProfile(selectedProfileId)
                .then((wifiInfo: WifiTimerWifiInfo): void => {
                    applyWifiTimerWifiInfo(wifiInfo);
                    setWifiTimerOperationMessage('Wi-Fi profile moved up.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerMoveDownProfileBtn.addEventListener('click', (): void => {
            const selectedProfileId = getSelectedWifiTimerProfileId();
            if (selectedProfileId === null) {
                setWifiTimerOperationMessage('移動するプロファイルを選択してください。', true);
                return;
            }
            void electronAPI.moveDownWifiTimerWifiProfile(selectedProfileId)
                .then((wifiInfo: WifiTimerWifiInfo): void => {
                    applyWifiTimerWifiInfo(wifiInfo);
                    setWifiTimerOperationMessage('Wi-Fi profile moved down.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerSaveProfileBtn.addEventListener('click', (): void => {
            const profile = readWifiTimerWifiProfileInput();
            if (!profile) {
                setWifiTimerOperationMessage('SSID を入力してください。', true);
                return;
            }
            void electronAPI.saveWifiTimerWifiProfile(profile)
                .then((wifiInfo: WifiTimerWifiInfo): void => {
                    applyWifiTimerWifiInfo(wifiInfo);
                    elements.wifiTimerPasswordInput.value = '';
                    setWifiTimerOperationMessage('Wi-Fi profile added.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerUpdateProfileBtn.addEventListener('click', (): void => {
            const selectedProfileId = getSelectedWifiTimerProfileId();
            const profile = readWifiTimerWifiProfileInput();
            if (selectedProfileId === null) {
                setWifiTimerOperationMessage('更新するプロファイルを選択してください。', true);
                return;
            }
            if (!profile) {
                setWifiTimerOperationMessage('SSID を入力してください。', true);
                return;
            }
            void electronAPI.deleteWifiTimerWifiProfile(selectedProfileId)
                .then((): Promise<WifiTimerWifiInfo> => {
                    return electronAPI.saveWifiTimerWifiProfile(profile);
                })
                .then((wifiInfo: WifiTimerWifiInfo): void => {
                    applyWifiTimerWifiInfo(wifiInfo);
                    elements.wifiTimerPasswordInput.value = '';
                    setWifiTimerOperationMessage('Selected Wi-Fi profile updated.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerDeleteProfileBtn.addEventListener('click', (): void => {
            const selectedProfileId = getSelectedWifiTimerProfileId();
            if (selectedProfileId === null) {
                setWifiTimerOperationMessage('削除するプロファイルを選択してください。', true);
                return;
            }
            void electronAPI.deleteWifiTimerWifiProfile(selectedProfileId)
                .then((wifiInfo: WifiTimerWifiInfo): void => {
                    applyWifiTimerWifiInfo(wifiInfo);
                    elements.wifiTimerSsidInput.value = '';
                    elements.wifiTimerPasswordInput.value = '';
                    setWifiTimerOperationMessage('Wi-Fi profile deleted.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerConnectProfileBtn.addEventListener('click', (): void => {
            const selectedProfileId = getSelectedWifiTimerProfileId();
            if (selectedProfileId === null) {
                setWifiTimerOperationMessage('接続するプロファイルを選択してください。', true);
                return;
            }
            void electronAPI.connectWifiTimerWifiProfile(selectedProfileId)
                .then((wifiInfo: WifiTimerWifiInfo): void => {
                    applyWifiTimerWifiInfo(wifiInfo);
                    setWifiTimerOperationMessage('Wi-Fi connection requested.');
                })
                .then((): Promise<WifiTimerStatus> => refreshWifiTimerStatus())
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerRebootBtn.addEventListener('click', (): void => {
            void electronAPI.rebootWifiTimer()
                .then((): void => {
                    setWifiTimerOperationMessage('WiFi timer reboot requested.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerPanelToggleBtn.addEventListener('click', (): void => {
            const isVisible = elements.wifiTimerPanelContainer.querySelector('.wifi-timer-panel')?.getAttribute('style') !== 'display: none;';
            applyWifiTimerPanelVisibility(!isVisible);
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
     * ファイル名をパッド表示用に整形する。
     * @param filename 元のファイル名
     * @returns 表示用ラベル
     */
    const formatPadLabel = (filename: string): string => {
        if (filename.length <= 18) {
            return filename;
        }
        return `${filename.slice(0, 15)}...`;
    };

    /**
     * 保存済みのパッド割り当てを取得する。
     * @returns パッドごとの割り当てファイル名
     */
    const loadStandalonePadAssignments = (): string[] => {
        const stored = localStorageStore.getJsonValue<unknown[]>(standalonePadAssignmentsKey, []);
        const assignments = Array.from({ length: standalonePadCount }, (): string => '');
        stored.slice(0, standalonePadCount).forEach((value: unknown, index: number): void => {
            if (typeof value === 'string') {
                assignments[index] = value;
            }
        });
        return assignments;
    };

    /**
     * パッド割り当てを保存する。
     * @param assignments 保存する割り当て
     */
    const saveStandalonePadAssignments = (assignments: string[]): void => {
        localStorageStore.setJsonValue(standalonePadAssignmentsKey, assignments);
    };

    /**
     * パッドの表示状態を更新する。
     * @param button 再生ボタン
     * @param fileLabel 表示ラベル
     * @param padIndex パッド番号
     * @param filename 割り当て済みファイル名
     */
    const applyPadPresentation = (
        button: HTMLButtonElement,
        fileLabel: HTMLElement,
        padIndex: number,
        filename: string,
    ): void => {
        button.disabled = !filename;
        fileLabel.textContent = filename ? formatPadLabel(filename) : `PAD ${padIndex + 1} sound`;
    };

    /**
     * 開いているパッド設定 UI を閉じる。
     * @returns なし
     */
    const closeAllPadSelectors = (): void => {
        elements.standaloneSoundPadGrid
            .querySelectorAll('.sound-pad-card.is-config-open')
            .forEach((element: Element): void => {
                element.classList.remove('is-config-open');
            });
    };

    /**
     * PAD の再生操作ボタン状態を更新する。
     * @param padIndex 対象 PAD 番号
     * @returns なし
     */
    const updatePadAudioControlState = (padIndex: number): void => {
        const stateEntry = standalonePadAudioStates[padIndex];
        const hasAssignedFile = !!stateEntry.assignedFile;
        const isPaused = !!stateEntry.audio && stateEntry.audio.paused && stateEntry.audio.currentTime > 0 && !stateEntry.audio.ended;
        const isPlaying = !!stateEntry.audio && !stateEntry.audio.paused && !stateEntry.audio.ended;

        if (stateEntry.playButton) {
            stateEntry.playButton.disabled = !hasAssignedFile;
        }
        if (stateEntry.pauseButton) {
            stateEntry.pauseButton.disabled = !stateEntry.audio || (!isPlaying && !isPaused);
            stateEntry.pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
        }
        if (stateEntry.stopButton) {
            stateEntry.stopButton.disabled = !stateEntry.audio || (!isPlaying && !isPaused);
        }
    };

    /**
     * PAD の再生状態を破棄する。
     * @param padIndex 対象 PAD 番号
     * @returns なし
     */
    const clearPadAudio = (padIndex: number): void => {
        const stateEntry = standalonePadAudioStates[padIndex];
        if (stateEntry.audio) {
            stateEntry.audio.pause();
            stateEntry.audio.currentTime = 0;
        }
        stateEntry.audio = null;
        updatePadAudioControlState(padIndex);
    };

    /**
     * PAD に紐づく音声を準備する。
     * @param padIndex 対象 PAD 番号
     * @param filename 再生対象ファイル名
     * @returns 利用可能な音声要素
     */
    const ensurePadAudio = async (padIndex: number, filename: string): Promise<HTMLAudioElement | null> => {
        const stateEntry = standalonePadAudioStates[padIndex];
        if (!filename) {
            clearPadAudio(padIndex);
            return null;
        }
        if (stateEntry.audio && stateEntry.assignedFile === filename) {
            return stateEntry.audio;
        }

        clearPadAudio(padIndex);
        const basePath = await electronAPI.getMediaBasePath();
        const absolutePath = timerMainLogic.buildMediaAbsolutePath(basePath, filename);
        const audio = new Audio(timerMainLogic.toFileUrl(absolutePath));
        audio.addEventListener('play', (): void => updatePadAudioControlState(padIndex));
        audio.addEventListener('pause', (): void => updatePadAudioControlState(padIndex));
        audio.addEventListener('ended', (): void => {
            if (standalonePadAudioStates[padIndex].audio === audio) {
                standalonePadAudioStates[padIndex].audio = null;
            }
            updatePadAudioControlState(padIndex);
        });
        stateEntry.audio = audio;
        stateEntry.assignedFile = filename;
        updatePadAudioControlState(padIndex);
        return audio;
    };

    /**
     * PAD の音を再生する。
     * @param padIndex 対象 PAD 番号
     * @returns なし
     */
    const playPadAudio = async (padIndex: number): Promise<void> => {
        const filename = standalonePadAudioStates[padIndex].assignedFile;
        const audio = await ensurePadAudio(padIndex, filename);
        if (!audio) {
            return;
        }
        try {
            await audio.play();
        } catch {
            updatePadAudioControlState(padIndex);
        }
    };

    /**
     * PAD の音を一時停止または再開する。
     * @param padIndex 対象 PAD 番号
     * @returns なし
     */
    const togglePadPause = async (padIndex: number): Promise<void> => {
        const stateEntry = standalonePadAudioStates[padIndex];
        if (!stateEntry.audio) {
            return;
        }
        if (stateEntry.audio.paused) {
            try {
                await stateEntry.audio.play();
            } catch {
                updatePadAudioControlState(padIndex);
            }
            return;
        }
        stateEntry.audio.pause();
        updatePadAudioControlState(padIndex);
    };

    /**
     * 全 PAD の再生状態を破棄する。
     * @returns なし
     */
    const clearAllPadAudios = (): void => {
        for (let index = 0; index < standalonePadCount; index += 1) {
            clearPadAudio(index);
        }
    };

    /**
     * パッドエリアの表示状態を反映する。
     * @param isVisible 表示するなら true
     */
    const applyStandalonePadVisibility = (isVisible: boolean): void => {
        elements.standaloneSoundPadGrid.style.display = isVisible ? 'grid' : 'none';
        elements.standaloneSoundPadToggleBtn.textContent = isVisible ? 'Hide Pads' : 'Show Pads';
        localStorageStore.setString(standalonePadVisibilityKey, isVisible ? '1' : '0');
        if (!isVisible) {
            closeAllPadSelectors();
        }
    };

    /**
     * 単発再生用パッドを描画する。
     * @param files 音声ファイル一覧
     * @returns なし
     */
    const renderStandaloneSoundPads = (files: string[]): void => {
        const assignments = loadStandalonePadAssignments().map((filename: string): string => {
            return files.includes(filename) ? filename : '';
        });
        saveStandalonePadAssignments(assignments);
        clearAllPadAudios();
        elements.standaloneSoundPadGrid.innerHTML = '';
        for (let index = 0; index < standalonePadCount; index += 1) {
            const card = document.createElement('div');
            const header = document.createElement('div');
            const button = document.createElement('button');
            const fileLabel = document.createElement('span');
            const configButton = document.createElement('button');
            const controls = document.createElement('div');
            const pauseButton = document.createElement('button');
            const stopButton = document.createElement('button');
            const select = document.createElement('select');
            const filename = assignments[index];

            card.className = 'sound-pad-card';
            header.className = 'sound-pad-header';
            button.type = 'button';
            button.className = 'sound-pad-btn';
            button.addEventListener('click', (): void => { void playPadAudio(index); });

            const indexLabel = document.createElement('span');
            indexLabel.className = 'sound-pad-index';
            indexLabel.textContent = `PAD ${index + 1}`;

            configButton.type = 'button';
            configButton.className = 'sound-pad-config-btn';
            configButton.textContent = 'SET';
            configButton.addEventListener('click', (event: MouseEvent): void => {
                event.stopPropagation();
                const shouldOpen = !card.classList.contains('is-config-open');
                closeAllPadSelectors();
                if (shouldOpen) {
                    card.classList.add('is-config-open');
                    select.focus();
                }
            });

            fileLabel.className = 'sound-pad-label';
            applyPadPresentation(button, fileLabel, index, filename);

            controls.className = 'sound-pad-controls';
            pauseButton.type = 'button';
            pauseButton.className = 'sound-pad-control-btn';
            pauseButton.textContent = 'Pause';
            pauseButton.addEventListener('click', (event: MouseEvent): void => {
                event.stopPropagation();
                void togglePadPause(index);
            });

            stopButton.type = 'button';
            stopButton.className = 'sound-pad-control-btn stop';
            stopButton.textContent = 'Stop';
            stopButton.addEventListener('click', (event: MouseEvent): void => {
                event.stopPropagation();
                clearPadAudio(index);
            });

            select.className = 'sound-pad-selector';
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.text = '-- Select Sound --';
            select.appendChild(emptyOption);
            files.forEach((file: string): void => {
                const option = document.createElement('option');
                option.value = file;
                option.text = file;
                if (file === filename) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            select.addEventListener('change', (): void => {
                assignments[index] = select.value;
                saveStandalonePadAssignments(assignments);
                standalonePadAudioStates[index].assignedFile = assignments[index];
                clearPadAudio(index);
                applyPadPresentation(button, fileLabel, index, assignments[index]);
                card.classList.remove('is-config-open');
            });
            select.addEventListener('blur', (): void => {
                card.classList.remove('is-config-open');
            });

            standalonePadAudioStates[index].assignedFile = filename;
            standalonePadAudioStates[index].playButton = button;
            standalonePadAudioStates[index].pauseButton = pauseButton;
            standalonePadAudioStates[index].stopButton = stopButton;
            updatePadAudioControlState(index);

            header.appendChild(indexLabel);
            header.appendChild(configButton);
            button.appendChild(header);
            button.appendChild(fileLabel);
            controls.appendChild(pauseButton);
            controls.appendChild(stopButton);
            card.appendChild(button);
            card.appendChild(controls);
            card.appendChild(select);
            elements.standaloneSoundPadGrid.appendChild(card);
        }
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
        renderStandaloneSoundPads(files);
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
        initWifiTimerSettings();
        initWifiTimerAdminPanel();
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
        elements.standaloneSoundPadToggleBtn.addEventListener('click', (): void => {
            const isVisible = elements.standaloneSoundPadGrid.style.display !== 'none';
            applyStandalonePadVisibility(!isVisible);
        });

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
        applyStandalonePadVisibility(localStorageStore.getString(standalonePadVisibilityKey, '0') !== '0');
        applyWifiTimerPanelVisibility(localStorageStore.getString(wifiTimerPanelVisibilityKey, '1') !== '0');
        if (state.wifiTimerSettings.ipAddress) {
            void refreshWifiTimerPanel().catch(() => undefined);
        }
    };

    mainRenderer.initTimerSection = initTimerSection;
}
