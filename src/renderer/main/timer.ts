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
    type WifiTimerDisplayColorEffect = import('../../shared/wifi-timer-api-types').WifiTimerDisplayColorEffect;
    type WifiTimerDisplaySettings = import('../../shared/wifi-timer-api-types').WifiTimerDisplaySettings;
    type WifiTimerAudioSettings = import('../../shared/wifi-timer-api-types').WifiTimerAudioSettings;
    type WifiTimerAudioStreamChunkResult = import('../../shared/wifi-timer-api-types').WifiTimerAudioStreamChunkResult;
    type WifiTimerAudioStreamEndResult = import('../../shared/wifi-timer-api-types').WifiTimerAudioStreamEndResult;
    type WifiTimerAudioStreamStartResult = import('../../shared/wifi-timer-api-types').WifiTimerAudioStreamStartResult;
    type WifiTimerCustomAudioFile = import('../../shared/wifi-timer-api-types').WifiTimerCustomAudioFile;
    type WifiTimerCustomAudioList = import('../../shared/wifi-timer-api-types').WifiTimerCustomAudioList;
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
    type WifiTimerAudioStreamProgress = {
        producedBytes: number;
        sentBytes: number;
        bufferedBytes: number;
        maxBufferedBytes: number;
        totalOnDevice: number;
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
    let currentWifiTimerAudioTones: WifiTimerAudioTones | null = null;
    let currentWifiTimerCustomAudioFiles: WifiTimerCustomAudioFile[] = [];
    let currentWifiTimerActiveCustomAudioName = '';
    let wifiTimerDisplayEffectDirty = false;
    let wifiTimerStreamBusy = false;
    let wifiTimerStreamCancelRequested = false;
    let wifiTimerStreamVolumeUpdateTimer: number | null = null;
    let wifiTimerStreamPlaybackPaused = false;
    let wifiTimerStreamHtmlAudio: HTMLAudioElement | null = null;
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
     * WiFi タイマーのストリーム状態表示を更新する。
     * @param message 表示内容
     * @param isError エラー表示かどうか
     */
    const setWifiTimerStreamStatus = (message: string, isError: boolean = false): void => {
        elements.wifiTimerStreamStatus.textContent = message;
        elements.wifiTimerStreamStatus.style.color = isError ? '#b04a3f' : '#7a5a00';
    };

    /**
     * 現在選択中のカスタム音表示を更新する。
     */
    const updateWifiTimerCurrentCustomToneHint = (): void => {
        const selectedValue = elements.wifiTimerToneKindSelect.value;
        if (selectedValue === 'fixed:chime') {
            elements.wifiTimerCurrentCustomToneHint.textContent = 'custom_alert.pcm (Built-in chime)';
            return;
        }
        if (selectedValue === 'fixed:gong') {
            elements.wifiTimerCurrentCustomToneHint.textContent = 'custom_gong.pcm (Built-in gong)';
            return;
        }
        if (selectedValue.startsWith('custom:')) {
            elements.wifiTimerCurrentCustomToneHint.textContent = selectedValue.slice('custom:'.length) || '-';
            return;
        }
        elements.wifiTimerCurrentCustomToneHint.textContent = currentWifiTimerActiveCustomAudioName || '-';
    };

    /**
     * 色演出プレビュー文言を更新する。
     */
    const updateWifiTimerColorEffectPreview = (): void => {
        const stage1Seconds = parseNumberUtils.parseIntOrFallback(elements.wifiTimerStage1SecondsInput.value, 0);
        const stage2Seconds = parseNumberUtils.parseIntOrFallback(elements.wifiTimerStage2SecondsInput.value, 0);
        const stage3Seconds = parseNumberUtils.parseIntOrFallback(elements.wifiTimerStage3SecondsInput.value, 0);
        const blinkSeconds = parseNumberUtils.parseIntOrFallback(elements.wifiTimerBlinkSecondsInput.value, 0);
        elements.wifiTimerColorEffectPreview.textContent = `Stage mapping: >${stage1Seconds}s = Stage1, ${stage1Seconds}..${stage2Seconds + 1}s = Stage2, `
            + `${stage2Seconds}..${stage3Seconds + 1}s = Stage3, ${stage3Seconds}..${blinkSeconds + 1}s = fade, <= ${blinkSeconds}s = blink.`;
    };

    /**
     * 色演出入力へプリセットを反映する。
     */
    const applyWifiTimerDramaticColorEffectPreset = (): void => {
        elements.wifiTimerStage1SecondsInput.value = '60';
        elements.wifiTimerStage2SecondsInput.value = '45';
        elements.wifiTimerStage3SecondsInput.value = '30';
        elements.wifiTimerBlinkSecondsInput.value = '10';
        elements.wifiTimerBlinkIntervalMsInput.value = '400';
        elements.wifiTimerStage1ColorInput.value = '#2060ff';
        elements.wifiTimerStage2ColorInput.value = '#ffffff';
        elements.wifiTimerStage3ColorInput.value = '#ff9d9d';
        elements.wifiTimerAlertColorInput.value = '#ff0000';
        wifiTimerDisplayEffectDirty = true;
        updateWifiTimerColorEffectPreview();
    };

    /**
     * WiFi タイマーのストリーム操作可否を更新する。
     * @param isBusy ストリーム中なら true
     */
    const setWifiTimerStreamBusy = (isBusy: boolean): void => {
        wifiTimerStreamBusy = isBusy;
        if (!isBusy) {
            wifiTimerStreamCancelRequested = false;
            wifiTimerStreamPlaybackPaused = false;
        }
        elements.wifiTimerStreamAudioBtn.disabled = isBusy;
        elements.wifiTimerPauseStreamBtn.disabled = !isBusy || wifiTimerStreamPlaybackPaused;
        elements.wifiTimerResumeStreamBtn.disabled = !isBusy || !wifiTimerStreamPlaybackPaused;
        elements.wifiTimerCancelStreamBtn.disabled = !isBusy;
        elements.wifiTimerLocalAudioFileInput.disabled = isBusy;
    };

    /**
     * WiFi タイマー用の直接アクセス URL を構築する。
     * @param path API パス
     * @param params クエリパラメータ
     * @returns URL 文字列
     */
    const buildWifiTimerDirectUrl = (path: string, params?: Record<string, string>): string => {
        const trimmedIpAddress = state.wifiTimerSettings.ipAddress.trim();
        if (!trimmedIpAddress) {
            throw new Error('WiFi timer IP address is not configured');
        }
        const withProtocol = /^[a-z]+:\/\//i.test(trimmedIpAddress) ? trimmedIpAddress : `http://${trimmedIpAddress}`;
        const baseUrl = new URL(withProtocol);
        const url = new URL(path, `${baseUrl.origin}/`);
        if (params) {
            Object.entries(params).forEach(([key, value]: [string, string]): void => {
                url.searchParams.set(key, value);
            });
        }
        return url.toString();
    };

    /**
     * WiFi タイマーへ直接 JSON リクエストを送る。
     * @param path API パス
     * @param init fetch 初期化引数
     * @param params クエリパラメータ
     * @returns 解析済み JSON
     */
    const requestWifiTimerDirectJson = async <T>(
        path: string,
        init: RequestInit,
        params?: Record<string, string>,
    ): Promise<T> => {
        const response = await fetch(buildWifiTimerDirectUrl(path, params), init);
        const raw = await response.text();
        if (!response.ok) {
            let errorMessage = raw || `WiFi timer request failed: ${response.status}`;
            try {
                const parsed = JSON.parse(raw) as { error?: string };
                if (parsed.error) {
                    errorMessage = parsed.error;
                }
            } catch {
                void 0;
            }
            throw new Error(errorMessage);
        }
        return JSON.parse(raw) as T;
    };

    /**
     * WiFi タイマー状態を UI に反映する。
     * @param status 状態
     */
    const applyWifiTimerStatus = (status: WifiTimerStatus): void => {
        const streamStateLabel = status.audioPlaying
            ? (status.audioStreamPaused ? 'paused' : 'playing')
            : 'stopped';
        wifiTimerStreamPlaybackPaused = status.audioStreamPaused;
        currentWifiTimerAudioSettings = {
            toneKind: status.alertToneKind,
            volume: status.alertVolume,
            repeatCount: status.alertRepeatCount,
            customSpeed: status.alertCustomSpeedPercent,
        };
        elements.wifiTimerStateLabel.textContent = `State: ${status.state} | Stream: ${streamStateLabel}`;
        elements.wifiTimerIpLabel.textContent = `IP: ${status.ip || '--'}`;
        elements.wifiTimerActiveBrightnessInput.value = String(status.activeBrightness);
        elements.wifiTimerIdleBrightnessInput.value = String(status.idleBrightness);
        elements.wifiTimerRotate180Input.checked = status.rotate180;
        if (status.displayColorEffect) {
            if (!wifiTimerDisplayEffectDirty) {
                elements.wifiTimerStage1SecondsInput.value = String(status.displayColorEffect.stage1Seconds);
                elements.wifiTimerStage2SecondsInput.value = String(status.displayColorEffect.stage2Seconds);
                elements.wifiTimerStage3SecondsInput.value = String(status.displayColorEffect.stage3Seconds);
                elements.wifiTimerBlinkSecondsInput.value = String(status.displayColorEffect.blinkSeconds);
                elements.wifiTimerBlinkIntervalMsInput.value = String(status.displayColorEffect.blinkIntervalMs);
                elements.wifiTimerStage1ColorInput.value = status.displayColorEffect.stage1Color || '#ffffff';
                elements.wifiTimerStage2ColorInput.value = status.displayColorEffect.stage2Color || '#ffff00';
                elements.wifiTimerStage3ColorInput.value = status.displayColorEffect.stage3Color || '#ff0000';
                elements.wifiTimerAlertColorInput.value = status.displayColorEffect.alertColor || '#ff0000';
            }
        }
        if (status.alertToneKind === 6) {
            if (currentWifiTimerActiveCustomAudioName === 'custom_alert.pcm') {
                timerUiUtils.setSelectValue(elements.wifiTimerToneKindSelect, 'fixed:chime');
            } else if (
                currentWifiTimerActiveCustomAudioName
                && Array.from(elements.wifiTimerToneKindSelect.options).some(
                    (option: HTMLOptionElement): boolean => option.value === `custom:${currentWifiTimerActiveCustomAudioName}`,
                )
            ) {
                timerUiUtils.setSelectValue(elements.wifiTimerToneKindSelect, `custom:${currentWifiTimerActiveCustomAudioName}`);
            } else {
                timerUiUtils.setSelectValue(elements.wifiTimerToneKindSelect, 'fixed:chime');
            }
        } else if (status.alertToneKind === 7) {
            timerUiUtils.setSelectValue(elements.wifiTimerToneKindSelect, 'fixed:gong');
        } else {
            timerUiUtils.setSelectValue(elements.wifiTimerToneKindSelect, String(status.alertToneKind));
        }
        elements.wifiTimerVolumeInput.value = String(status.alertVolume);
        elements.wifiTimerRepeatCountInput.value = String(status.alertRepeatCount);
        elements.wifiTimerCustomSpeedInput.value = String(status.alertCustomSpeedPercent);
        updateWifiTimerColorEffectPreview();
        updateWifiTimerCurrentCustomToneHint();
        setWifiTimerStreamBusy(wifiTimerStreamBusy);
    };

    /**
     * 音色定義から表示ラベルを生成する。
     * @param tone 音色定義
     * @returns 表示ラベル
     */
    const formatWifiTimerToneLabel = (tone: WifiTimerAudioTone): string => {
        const baseLabel = tone.label || tone.name || `Tone ${tone.id}`;
        if (tone.available) {
            return baseLabel;
        }
        return `${baseLabel} (not available)`;
    };

    /**
     * 音色カタログを UI に反映する。
     * @param audioTones 音色カタログ
     * @param preferredToneKind 優先して選択する toneKind
     * @param shouldSyncAudioSettings 音設定の補助値も同期するなら true
     */
    const applyWifiTimerAudioTones = (
        audioTones: WifiTimerAudioTones,
        preferredToneValue?: string,
        shouldSyncAudioSettings: boolean = true,
    ): void => {
        currentWifiTimerAudioTones = audioTones;
        currentWifiTimerAudioToneLimits = audioTones.limits;
        if (shouldSyncAudioSettings) {
            currentWifiTimerAudioSettings = {
                toneKind: audioTones.current.toneKind ?? audioTones.defaults.toneKind,
                volume: audioTones.current.volume ?? audioTones.defaults.volume,
                repeatCount: audioTones.current.repeatCount ?? audioTones.defaults.repeatCount,
                customSpeed: audioTones.current.customSpeed ?? audioTones.defaults.customSpeed,
            };
        }
        let fallbackToneValue = String(audioTones.current.toneKind ?? audioTones.defaults.toneKind);
        if (audioTones.current.toneKind === 6) {
            if (currentWifiTimerActiveCustomAudioName === 'custom_alert.pcm') {
                fallbackToneValue = 'fixed:chime';
            } else if (
                currentWifiTimerActiveCustomAudioName
                && currentWifiTimerCustomAudioFiles.some((file: WifiTimerCustomAudioFile): boolean => file.name === currentWifiTimerActiveCustomAudioName)
            ) {
                fallbackToneValue = `custom:${currentWifiTimerActiveCustomAudioName}`;
            } else {
                fallbackToneValue = 'fixed:chime';
            }
        } else if (audioTones.current.toneKind === 7) {
            fallbackToneValue = 'fixed:gong';
        }
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
        const builtinGroup = document.createElement('optgroup');
        builtinGroup.label = 'Built-in';
        const toneMap = new Map<number, WifiTimerAudioTone>();
        audioTones.tones.forEach((tone: WifiTimerAudioTone): void => {
            toneMap.set(tone.id, tone);
        });
        [0, 1, 2, 3, 4, 5].forEach((toneId: number): void => {
            const tone = toneMap.get(toneId);
            if (!tone) {
                return;
            }
            const option = document.createElement('option');
            option.value = String(tone.id);
            option.text = formatWifiTimerToneLabel(tone);
            option.disabled = !tone.available;
            builtinGroup.appendChild(option);
        });
        const chimeOption = document.createElement('option');
        chimeOption.value = 'fixed:chime';
        chimeOption.text = 'chime';
        builtinGroup.appendChild(chimeOption);

        const gongTone = toneMap.get(7);
        const gongOption = document.createElement('option');
        gongOption.value = 'fixed:gong';
        gongOption.text = gongTone && !gongTone.available ? 'gong (not available)' : 'gong';
        gongOption.disabled = !!gongTone && !gongTone.available;
        builtinGroup.appendChild(gongOption);
        elements.wifiTimerToneKindSelect.appendChild(builtinGroup);

        const customGroup = document.createElement('optgroup');
        customGroup.label = 'Custom Library';
        if (currentWifiTimerCustomAudioFiles.length === 0) {
            const option = document.createElement('option');
            option.value = '6';
            option.text = 'Custom (no uploaded files yet)';
            customGroup.appendChild(option);
        } else {
            currentWifiTimerCustomAudioFiles.forEach((file: WifiTimerCustomAudioFile): void => {
                const option = document.createElement('option');
                option.value = `custom:${file.name}`;
                option.text = file.active ? `Custom: ${file.name} [Selected]` : `Custom: ${file.name}`;
                customGroup.appendChild(option);
            });
        }
        elements.wifiTimerToneKindSelect.appendChild(customGroup);

        const nextToneValue = preferredToneValue
            && Array.from(elements.wifiTimerToneKindSelect.options).some((option: HTMLOptionElement): boolean => option.value === preferredToneValue)
            ? preferredToneValue
            : fallbackToneValue;
        timerUiUtils.setSelectValue(elements.wifiTimerToneKindSelect, nextToneValue);
        if (!elements.wifiTimerToneKindSelect.value && audioTones.tones[0]) {
            elements.wifiTimerToneKindSelect.value = String(audioTones.tones[0].id);
        }
        updateWifiTimerCurrentCustomToneHint();
    };

    /**
     * バイト数を表示向け文字列へ変換する。
     * @param bytes バイト数
     * @returns 表示文字列
     */
    const formatWifiTimerBytes = (bytes?: number): string => {
        if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes < 0) {
            return '-';
        }
        if (bytes < 1024) {
            return `${bytes} B`;
        }
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    /**
     * カスタム音名をリネーム用に正規化する。
     * @param rawName 入力名
     * @returns 正規化後ファイル名
     */
    const sanitizeWifiTimerCustomAudioName = (rawName: string): string => {
        const source = rawName.toLowerCase().endsWith('.pcm') ? rawName.slice(0, -4) : rawName;
        let normalized = source.normalize('NFKC').trim();
        normalized = normalized.replace(/\s+/g, '_');
        normalized = normalized.replace(/[^0-9A-Za-z_.-]/g, '_');
        normalized = normalized.replace(/_+/g, '_');
        normalized = normalized.replace(/^[_.-]+|[_.-]+$/g, '');
        if (!normalized) {
            normalized = 'custom';
        }
        if (normalized.length > 24) {
            normalized = normalized.slice(0, 24);
        }
        return `${normalized}.pcm`;
    };

    /**
     * 利用可能な live-stream 音色 ID を取得する。
     * @returns live-stream 音色 ID。未対応時は null
     */
    const getWifiTimerLiveStreamToneId = (): number | null => {
        if (!currentWifiTimerAudioTones) {
            return null;
        }
        const liveStreamTone = currentWifiTimerAudioTones.tones.find((tone: WifiTimerAudioTone): boolean => {
            return tone.kind === 'live-stream' && tone.available;
        }) ?? null;
        return liveStreamTone?.id ?? null;
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
        const preferredToneValue = typeof preferredToneKind === 'number'
            ? String(preferredToneKind)
            : undefined;
        applyWifiTimerAudioTones(audioTones, preferredToneValue);
        return audioTones;
    };

    /**
     * カスタム音一覧を描画する。
     * @param customAudioList カスタム音一覧
     */
    const renderWifiTimerCustomAudioList = (customAudioList: WifiTimerCustomAudioList): void => {
        elements.wifiTimerCustomToneList.innerHTML = '';
        const normalizedFiles = customAudioList.files.map((file: WifiTimerCustomAudioFile): WifiTimerCustomAudioFile => ({
            ...file,
            active: file.active ?? file.name === customAudioList.activeName,
        }));
        currentWifiTimerCustomAudioFiles = normalizedFiles;
        currentWifiTimerActiveCustomAudioName = customAudioList.activeName || '';
        if (normalizedFiles.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'wifi-timer-operation-message';
            empty.textContent = 'No uploaded custom sounds';
            elements.wifiTimerCustomToneList.appendChild(empty);
        } else {
            normalizedFiles.forEach((file: WifiTimerCustomAudioFile): void => {
                const item = document.createElement('div');
                item.className = 'wifi-timer-profile-item';

                const label = document.createElement('span');
                label.className = 'wifi-timer-profile-label';
                label.textContent = file.active ? `${file.name} [Selected]` : file.name;

                const meta = document.createElement('span');
                meta.className = 'wifi-timer-inline-hint';
                meta.textContent = `${formatWifiTimerBytes(file.bytes)} / ${(((file.durationMs ?? 0) / 1000)).toFixed(1)}s`;

                const actionRow = document.createElement('div');
                actionRow.className = 'wifi-timer-button-row';

                const hint = document.createElement('span');
                hint.className = 'wifi-timer-inline-hint';
                hint.textContent = file.active ? 'Now used by Sound list' : 'Choose from Sound list';

                const testBtn = document.createElement('button');
                testBtn.className = 'wifi-timer-action-btn secondary';
                testBtn.textContent = 'Test';
                testBtn.addEventListener('click', (): void => {
                    void electronAPI.testWifiTimerCustomAudio(file.name, {
                        toneKind: 6,
                        volume: parseNumberUtils.parseIntOrFallback(elements.wifiTimerVolumeInput.value, audioClampFallback('volume')),
                        repeatCount: 1,
                        customSpeed: parseNumberUtils.parseIntOrFallback(elements.wifiTimerCustomSpeedInput.value, audioClampFallback('customSpeed')),
                    })
                        .then(async (status: WifiTimerStatus): Promise<void> => {
                            applyWifiTimerStatus(status);
                            setWifiTimerOperationMessage(`Custom audio test requested: ${file.name}`);
                            await refreshWifiTimerStatus();
                        })
                        .catch((error: unknown): void => {
                            setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                        });
                });

                const renameBtn = document.createElement('button');
                renameBtn.className = 'wifi-timer-action-btn secondary';
                renameBtn.textContent = 'Rename';
                renameBtn.addEventListener('click', (): void => {
                    const currentStem = file.name.toLowerCase().endsWith('.pcm') ? file.name.slice(0, -4) : file.name;
                    const raw = window.prompt('New file name (.pcm optional)', currentStem);
                    if (raw === null) {
                        return;
                    }
                    const nextName = sanitizeWifiTimerCustomAudioName(raw);
                    void electronAPI.renameWifiTimerCustomAudio(file.name, nextName)
                        .then((): Promise<WifiTimerCustomAudioList> => refreshWifiTimerCustomAudioList())
                        .then((): Promise<WifiTimerStatus> => refreshWifiTimerStatus())
                        .then((): void => {
                            setWifiTimerOperationMessage(`Custom audio renamed: ${file.name} -> ${nextName}`);
                        })
                        .catch((error: unknown): void => {
                            setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                        });
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'wifi-timer-action-btn danger';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', (): void => {
                    void electronAPI.deleteWifiTimerCustomAudio(file.name)
                        .then((): Promise<WifiTimerCustomAudioList> => refreshWifiTimerCustomAudioList())
                        .then((): Promise<WifiTimerStatus> => refreshWifiTimerStatus())
                        .then((): void => {
                            setWifiTimerOperationMessage(`Custom audio deleted: ${file.name}`);
                        })
                        .catch((error: unknown): void => {
                            setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                        });
                });

                actionRow.appendChild(testBtn);
                actionRow.appendChild(renameBtn);
                actionRow.appendChild(deleteBtn);
                item.appendChild(label);
                item.appendChild(meta);
                item.appendChild(hint);
                item.appendChild(actionRow);
                elements.wifiTimerCustomToneList.appendChild(item);
            });
        }
        elements.wifiTimerCustomStorageInfo.textContent =
            `Custom storage: free ${formatWifiTimerBytes(customAudioList.storage.freeBytes)} / `
            + `total ${formatWifiTimerBytes(customAudioList.storage.totalBytes)} `
            + `(upload remaining ${formatWifiTimerBytes(customAudioList.storage.remainingUploadBytes)})`;
        updateWifiTimerCurrentCustomToneHint();
    };

    /**
     * カスタム音一覧を更新取得する。
     * @returns カスタム音一覧
     */
    const refreshWifiTimerCustomAudioList = async (): Promise<WifiTimerCustomAudioList> => {
        const customAudioList = await electronAPI.getWifiTimerCustomAudioList();
        renderWifiTimerCustomAudioList(customAudioList);
        return customAudioList;
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
        await refreshWifiTimerCustomAudioList();
        const audioTones = await refreshWifiTimerAudioTones();
        const status = await refreshWifiTimerStatus();
        let preferredToneValue = String(status.alertToneKind);
        if (status.alertToneKind === 6) {
            preferredToneValue = currentWifiTimerActiveCustomAudioName === 'custom_alert.pcm'
                ? 'fixed:chime'
                : `custom:${currentWifiTimerActiveCustomAudioName}`;
        } else if (status.alertToneKind === 7) {
            preferredToneValue = 'fixed:gong';
        }
        applyWifiTimerAudioTones(audioTones, preferredToneValue, false);
        await refreshWifiTimerWifiInfo();
    };

    /**
     * 指定ミリ秒待機する。
     * @param ms 待機時間
     * @returns 完了 Promise
     */
    const sleepMs = async (ms: number): Promise<void> => {
        await new Promise<void>((resolve: () => void): void => {
            window.setTimeout((): void => resolve(), ms);
        });
    };

    /**
     * キュー先頭から指定サイズまでのチャンクを結合する。
     * @param queue PCM チャンクキュー
     * @param targetBytes 目標サイズ
     * @returns 結合済みチャンク。取り出せない場合は null
     */
    const dequeueWifiTimerStreamChunk = (queue: Uint8Array[], targetBytes: number): Uint8Array | null => {
        const firstChunk = queue.shift() ?? null;
        if (!firstChunk) {
            return null;
        }
        let totalBytes = firstChunk.byteLength;
        const chunks: Uint8Array[] = [firstChunk];
        while (queue.length > 0 && totalBytes < targetBytes) {
            const nextChunk = queue[0];
            if (!nextChunk) {
                break;
            }
            queue.shift();
            chunks.push(nextChunk);
            totalBytes += nextChunk.byteLength;
        }
        if (chunks.length === 1) {
            return firstChunk;
        }
        const mergedChunk = new Uint8Array(totalBytes);
        let offset = 0;
        chunks.forEach((chunk: Uint8Array): void => {
            mergedChunk.set(chunk, offset);
            offset += chunk.byteLength;
        });
        return mergedChunk;
    };

    /**
     * 次の描画フレームまで待機する。
     * @returns 完了 Promise
     */
    const waitForNextFrame = async (): Promise<void> => {
        await new Promise<void>((resolve: () => void): void => {
            window.requestAnimationFrame((): void => resolve());
        });
    };

    /**
     * AudioBuffer を PCM16LE モノラルへ変換する。
     * @param inputBuffer 入力バッファ
     * @returns PCM バイト列
     */
    const floatToInt16PcmMono = (inputBuffer: AudioBuffer): Uint8Array => {
        const channels = inputBuffer.numberOfChannels;
        const frames = inputBuffer.length;
        const pcm = new Int16Array(frames);
        for (let frameIndex = 0; frameIndex < frames; frameIndex += 1) {
            let mixed = 0;
            for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
                mixed += inputBuffer.getChannelData(channelIndex)[frameIndex];
            }
            mixed /= channels;
            const clamped = Math.max(-1, Math.min(1, mixed));
            pcm[frameIndex] = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
        }
        return new Uint8Array(pcm.buffer);
    };

    /**
     * Float32 PCM を Int16 PCM へ変換する。
     * @param floatSamples 入力サンプル
     * @returns Int16 PCM
     */
    const floatToInt16Pcm = (floatSamples: Float32Array): Int16Array => {
        const pcm = new Int16Array(floatSamples.length);
        for (let index = 0; index < floatSamples.length; index += 1) {
            const clamped = Math.max(-1, Math.min(1, floatSamples[index] ?? 0));
            pcm[index] = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
        }
        return pcm;
    };

    /**
     * 線形補間でリサンプリングする。
     * @param input 入力サンプル
     * @param inRate 入力サンプルレート
     * @param outRate 出力サンプルレート
     * @returns リサンプリング後サンプル
     */
    const resampleLinear = (input: Float32Array, inRate: number, outRate: number): Float32Array => {
        if (inRate === outRate) {
            return input;
        }
        const outLength = Math.max(1, Math.round((input.length * outRate) / inRate));
        const output = new Float32Array(outLength);
        const ratio = inRate / outRate;
        for (let index = 0; index < outLength; index += 1) {
            const srcPos = index * ratio;
            const left = Math.floor(srcPos);
            const right = Math.min(input.length - 1, left + 1);
            const frac = srcPos - left;
            output[index] = (input[left] ?? 0) * (1 - frac) + (input[right] ?? 0) * frac;
        }
        return output;
    };

    /**
     * ストリーム終了結果から状態オブジェクトを取り出す。
     * @param endResult 終了結果
     * @returns 状態。取得できない場合は null
     */
    const resolveWifiTimerStatusFromStreamEnd = (endResult: WifiTimerAudioStreamEndResult): WifiTimerStatus | null => {
        const rawStatus = endResult.status;
        if (!rawStatus) {
            return null;
        }
        if (typeof rawStatus === 'string') {
            try {
                return JSON.parse(rawStatus) as WifiTimerStatus;
            } catch {
                return null;
            }
        }
        return rawStatus as WifiTimerStatus;
    };

    /**
     * ストリーム中の音量変更を反映する。
     * @returns 完了 Promise
     */
    const applyWifiTimerStreamVolumeIfNeeded = async (): Promise<void> => {
        if (!wifiTimerStreamBusy) {
            return;
        }
        const volume = parseNumberUtils.parseIntOrFallback(elements.wifiTimerVolumeInput.value, currentWifiTimerAudioSettings.volume);
        try {
            await requestWifiTimerDirectJson<Record<string, unknown>>(
                'api/audio/stream/volume',
                { method: 'POST' },
                { volume: String(volume) },
            );
            setWifiTimerStreamStatus(`Streaming volume updated: ${volume}`);
        } catch (error: unknown) {
            setWifiTimerStreamStatus(error instanceof Error ? error.message : String(error), true);
        }
    };

    /**
     * ストリームチャンク送信をバッファフル時リトライ付きで行う。
     * @param chunkBytes PCM チャンク
     * @param onBuffered バッファ更新時コールバック
     * @returns 送信結果
     */
    const sendWifiTimerStreamChunkWithRetry = async (
        chunkBytes: Uint8Array,
        onBuffered?: (result: WifiTimerAudioStreamChunkResult) => void,
    ): Promise<WifiTimerAudioStreamChunkResult> => {
        const maxRetryCount = 200;
        for (let retryIndex = 0; retryIndex < maxRetryCount; retryIndex += 1) {
            while (wifiTimerStreamPlaybackPaused && !wifiTimerStreamCancelRequested) {
                await sleepMs(30);
            }
            if (wifiTimerStreamCancelRequested) {
                return {};
            }
            try {
                const formData = new FormData();
                const chunkCopy = new Uint8Array(chunkBytes.byteLength);
                chunkCopy.set(chunkBytes);
                formData.append('chunk', new Blob([chunkCopy.buffer], { type: 'application/octet-stream' }), 'chunk.pcm');
                const result = await requestWifiTimerDirectJson<WifiTimerAudioStreamChunkResult>(
                    'api/audio/stream/chunk',
                    { method: 'POST', body: formData },
                );
                if (onBuffered) {
                    onBuffered(result);
                }
                return result;
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                const isRetryable = message.includes('429')
                    || message.includes('stream buffer full')
                    || message.includes('ECONNRESET')
                    || message.includes('connection was reset')
                    || message.includes('fetch failed')
                    || message.includes('socket hang up');
                if (!isRetryable) {
                    throw error;
                }
                if (message.includes('409') && wifiTimerStreamCancelRequested) {
                    return {};
                }
                await sleepMs(wifiTimerStreamPlaybackPaused ? 120 : 20);
            }
        }
        throw new Error('stream buffer full または接続断が継続したため中断しました');
    };

    /**
     * ローカル音声をデバイスへリアルタイム送信する。
     * @param file 対象ファイル
     * @param onProgress 進捗通知
     * @returns 完了情報
     */
    const streamWifiTimerLocalAudioRealtime = async (
        file: File,
        onProgress?: (progress: WifiTimerAudioStreamProgress) => void,
    ): Promise<{ sampleRate: number; sentBytes: number; endResult: WifiTimerAudioStreamEndResult }> => {
        const AudioContextCtor = window.AudioContext
            ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) {
            throw new Error('This browser does not support Web Audio API');
        }

        const audioContext = new AudioContextCtor({ sampleRate: 16000, latencyHint: 'interactive' });
        const htmlAudio = new Audio();
        const objectUrl = URL.createObjectURL(file);
        wifiTimerStreamHtmlAudio = htmlAudio;
        htmlAudio.src = objectUrl;
        htmlAudio.preload = 'auto';
        htmlAudio.muted = false;
        htmlAudio.volume = 1;

        const sourceNode = audioContext.createMediaElementSource(htmlAudio);
        const processorNode = audioContext.createScriptProcessor(4096, 2, 1);
        const muteGain = audioContext.createGain();
        muteGain.gain.value = 0;

        sourceNode.connect(processorNode);
        processorNode.connect(muteGain);
        muteGain.connect(audioContext.destination);

        const queue: Uint8Array[] = [];
        let producedBytes = 0;
        let sentBytes = 0;
        let senderRunning = false;
        let ended = false;
        let senderError: unknown = null;
        const targetChunkBytes = 8192;

        const processQueue = async (): Promise<void> => {
            if (senderRunning) {
                return;
            }
            senderRunning = true;
            try {
                while ((!ended || queue.length > 0) && !wifiTimerStreamCancelRequested) {
                    if (wifiTimerStreamPlaybackPaused) {
                        await sleepMs(20);
                        continue;
                    }
                    const nextChunk = dequeueWifiTimerStreamChunk(queue, targetChunkBytes);
                    if (!nextChunk) {
                        await sleepMs(8);
                        continue;
                    }
                    const result = await sendWifiTimerStreamChunkWithRetry(nextChunk, (chunkResult: WifiTimerAudioStreamChunkResult): void => {
                        if (onProgress) {
                            onProgress({
                                producedBytes,
                                sentBytes,
                                bufferedBytes: chunkResult.bufferedBytes ?? 0,
                                maxBufferedBytes: chunkResult.maxBufferedBytes ?? 0,
                                totalOnDevice: chunkResult.bytes ?? 0,
                            });
                        }
                    });
                    if (wifiTimerStreamCancelRequested) {
                        break;
                    }
                    sentBytes += nextChunk.byteLength;
                    if (onProgress) {
                        onProgress({
                            producedBytes,
                            sentBytes,
                            bufferedBytes: result.bufferedBytes ?? 0,
                            maxBufferedBytes: result.maxBufferedBytes ?? 0,
                            totalOnDevice: result.bytes ?? 0,
                        });
                    }
                }
            } catch (error: unknown) {
                senderError = error;
            } finally {
                senderRunning = false;
            }
        };

        try {
            const volume = parseNumberUtils.parseIntOrFallback(elements.wifiTimerVolumeInput.value, currentWifiTimerAudioSettings.volume);
            const startInfo: WifiTimerAudioStreamStartResult = await requestWifiTimerDirectJson<WifiTimerAudioStreamStartResult>(
                'api/audio/stream/start',
                { method: 'POST' },
                {
                    volume: String(volume),
                    sampleRate: String(Math.round(audioContext.sampleRate)),
                },
            );
            if (!startInfo.ok) {
                throw new Error('stream start failed');
            }

            processorNode.onaudioprocess = (event: AudioProcessingEvent): void => {
                if (wifiTimerStreamCancelRequested || wifiTimerStreamPlaybackPaused) {
                    return;
                }
                const chunk = floatToInt16PcmMono(event.inputBuffer);
                if (chunk.byteLength > 0) {
                    queue.push(chunk);
                    producedBytes += chunk.byteLength;
                    void processQueue();
                }
            };

            await audioContext.resume();
            await htmlAudio.play();
            const playbackResult = await Promise.race([
                new Promise<'ended'>((resolve: (value: 'ended') => void, reject: (reason?: unknown) => void): void => {
                    htmlAudio.addEventListener('ended', (): void => resolve('ended'), { once: true });
                    htmlAudio.addEventListener('error', (): void => reject(new Error('audio decode/playback failed in browser')), { once: true });
                }),
                (async (): Promise<'canceled'> => {
                    while (!wifiTimerStreamCancelRequested) {
                        await sleepMs(20);
                    }
                    return 'canceled';
                })(),
            ]);
            if (playbackResult === 'canceled') {
                htmlAudio.pause();
            }
            ended = true;
            while (senderRunning || queue.length > 0) {
                await sleepMs(12);
            }

            if (senderError) {
                throw senderError;
            }

            if (playbackResult === 'canceled') {
                await requestWifiTimerDirectJson<Record<string, unknown>>('api/audio/stream/cancel', { method: 'POST' });
                throw new Error('Audio stream canceled');
            }

            const endResult = await requestWifiTimerDirectJson<WifiTimerAudioStreamEndResult>('api/audio/stream/end', { method: 'POST' });
            const status = resolveWifiTimerStatusFromStreamEnd(endResult);
            if (status) {
                applyWifiTimerStatus(status);
            }
            return {
                sampleRate: audioContext.sampleRate,
                sentBytes,
                endResult,
            };
        } finally {
            wifiTimerStreamHtmlAudio = null;
            processorNode.onaudioprocess = null;
            sourceNode.disconnect();
            processorNode.disconnect();
            muteGain.disconnect();
            htmlAudio.pause();
            htmlAudio.src = '';
            URL.revokeObjectURL(objectUrl);
            await audioContext.close();
        }
    };

    /**
     * 輝度・回転設定をフォームから読み取る。
     * @returns 表示設定
     */
    const readWifiTimerDisplaySettings = (): WifiTimerDisplaySettings => {
        const activeBrightness = Math.min(Math.max(parseNumberUtils.parseIntOrFallback(elements.wifiTimerActiveBrightnessInput.value, 255), 0), 255);
        const idleBrightness = Math.min(Math.max(parseNumberUtils.parseIntOrFallback(elements.wifiTimerIdleBrightnessInput.value, 32), 0), 255);
        const colorEffect: WifiTimerDisplayColorEffect = {
            stage1Seconds: Math.min(Math.max(parseNumberUtils.parseIntOrFallback(elements.wifiTimerStage1SecondsInput.value, 30), 0), 3600),
            stage2Seconds: Math.min(Math.max(parseNumberUtils.parseIntOrFallback(elements.wifiTimerStage2SecondsInput.value, 10), 0), 3600),
            stage3Seconds: Math.min(Math.max(parseNumberUtils.parseIntOrFallback(elements.wifiTimerStage3SecondsInput.value, 10), 0), 3600),
            blinkSeconds: Math.min(Math.max(parseNumberUtils.parseIntOrFallback(elements.wifiTimerBlinkSecondsInput.value, 0), 0), 3600),
            blinkIntervalMs: Math.min(Math.max(parseNumberUtils.parseIntOrFallback(elements.wifiTimerBlinkIntervalMsInput.value, 500), 100), 2000),
            stage1Color: elements.wifiTimerStage1ColorInput.value || '#ffffff',
            stage2Color: elements.wifiTimerStage2ColorInput.value || '#ffff00',
            stage3Color: elements.wifiTimerStage3ColorInput.value || '#ff0000',
            alertColor: elements.wifiTimerAlertColorInput.value || '#ff0000',
        };
        colorEffect.stage2Seconds = Math.min(colorEffect.stage2Seconds, colorEffect.stage1Seconds);
        colorEffect.stage3Seconds = Math.min(colorEffect.stage3Seconds, colorEffect.stage2Seconds);
        colorEffect.blinkSeconds = Math.min(colorEffect.blinkSeconds, colorEffect.stage3Seconds);
        elements.wifiTimerActiveBrightnessInput.value = String(activeBrightness);
        elements.wifiTimerIdleBrightnessInput.value = String(idleBrightness);
        elements.wifiTimerStage1SecondsInput.value = String(colorEffect.stage1Seconds);
        elements.wifiTimerStage2SecondsInput.value = String(colorEffect.stage2Seconds);
        elements.wifiTimerStage3SecondsInput.value = String(colorEffect.stage3Seconds);
        elements.wifiTimerBlinkSecondsInput.value = String(colorEffect.blinkSeconds);
        elements.wifiTimerBlinkIntervalMsInput.value = String(colorEffect.blinkIntervalMs);
        updateWifiTimerColorEffectPreview();
        return {
            activeBrightness,
            idleBrightness,
            rotate180: elements.wifiTimerRotate180Input.checked,
            colorEffect,
        };
    };

    /**
     * 音設定をフォームから読み取る。
     * @returns 音設定
     */
    const readWifiTimerAudioSettings = (): WifiTimerAudioSettings => {
        const selectedToneValue = elements.wifiTimerToneKindSelect.value;
        const rawToneKind = selectedToneValue.startsWith('custom:')
            ? 6
            : parseNumberUtils.parseIntOrFallback(selectedToneValue, currentWifiTimerAudioToneLimits.toneIdMin);
        const toneKind = Math.min(
            Math.max(
                rawToneKind,
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
     * 選択中の音色がカスタム音なら先に本体側の選択を切り替える。
     * @returns 実際に送る toneKind
     */
    const resolveWifiTimerSelectedToneKind = async (): Promise<number> => {
        const selectedValue = elements.wifiTimerToneKindSelect.value;
        if (selectedValue === 'fixed:chime') {
            await electronAPI.selectWifiTimerCustomAudio('custom_alert.pcm');
            currentWifiTimerActiveCustomAudioName = 'custom_alert.pcm';
            updateWifiTimerCurrentCustomToneHint();
            return 6;
        }
        if (selectedValue === 'fixed:gong') {
            return 7;
        }
        if (!selectedValue.startsWith('custom:')) {
            return readWifiTimerAudioSettings().toneKind;
        }
        const name = selectedValue.slice('custom:'.length);
        await electronAPI.selectWifiTimerCustomAudio(name);
        currentWifiTimerActiveCustomAudioName = name;
        updateWifiTimerCurrentCustomToneHint();
        return 6;
    };

    /**
     * カスタム音アップロードに対応する入力か判定する。
     * @param file 対象ファイル
     * @returns 対応形式なら true
     */
    const isSupportedWifiTimerCustomAudioFile = (file: File | null): boolean => {
        if (!file) {
            return false;
        }
        const lowerName = file.name.toLowerCase();
        return lowerName.endsWith('.mp3') || lowerName.endsWith('.wav');
    };

    /**
     * カスタム音用に 16kHz PCM16 モノラルへ変換する。
     * @param file 入力ファイル
     * @param maxSeconds 最大秒数
     * @returns 変換結果
     */
    const decodeWifiTimerCustomAudioFile = async (
        file: File,
        maxSeconds: number,
    ): Promise<{ pcmBytes: Uint8Array; truncated: boolean; durationMs: number }> => {
        const AudioCtx = window.AudioContext
            ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) {
            throw new Error('This browser does not support Web Audio API');
        }
        const audioCtx = new AudioCtx();
        try {
            const arrayBuffer = await file.arrayBuffer();
            const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
            const mono = new Float32Array(decoded.length);
            for (let index = 0; index < decoded.length; index += 1) {
                let mixed = 0;
                for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
                    mixed += decoded.getChannelData(channel)[index] ?? 0;
                }
                mono[index] = mixed / decoded.numberOfChannels;
            }
            const resampled = resampleLinear(mono, decoded.sampleRate, 16000);
            const maxFrames = Math.max(1, Math.round(16000 * maxSeconds));
            const truncated = resampled.length > maxFrames;
            const clipped = truncated ? resampled.subarray(0, maxFrames) : resampled;
            const pcm = floatToInt16Pcm(clipped);
            return {
                pcmBytes: new Uint8Array(pcm.buffer),
                truncated,
                durationMs: Math.round((clipped.length * 1000) / 16000),
            };
        } finally {
            await audioCtx.close();
        }
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
     * ローカル音声ストリーム再生に必要な音色設定を整える。
     * @returns 完了 Promise
     */
    const prepareWifiTimerLiveStreamPlayback = async (): Promise<void> => {
        const liveStreamToneId = getWifiTimerLiveStreamToneId();
        if (liveStreamToneId === null) {
            throw new Error('WiFi timer does not provide an available live-stream tone');
        }
        const currentSettings = readWifiTimerAudioSettings();
        if (currentSettings.toneKind === liveStreamToneId) {
            return;
        }
        const status = await electronAPI.updateWifiTimerAudioSettings({
            toneKind: liveStreamToneId,
            volume: currentSettings.volume,
            repeatCount: currentSettings.repeatCount,
            customSpeed: currentSettings.customSpeed,
        });
        applyWifiTimerStatus(status);
        timerUiUtils.setSelectValue(elements.wifiTimerToneKindSelect, String(liveStreamToneId));
    };

    /**
     * WiFi タイマー設定操作を初期化する。
     */
    const initWifiTimerAdminPanel = (): void => {
        setWifiTimerStreamBusy(false);
        setWifiTimerStreamStatus('');
        updateWifiTimerColorEffectPreview();

        elements.wifiTimerWifiProfileSelect.addEventListener('change', (): void => {
            syncWifiTimerProfileSelection();
        });

        elements.wifiTimerVolumeInput.addEventListener('input', (): void => {
            if (!wifiTimerStreamBusy) {
                return;
            }
            if (wifiTimerStreamVolumeUpdateTimer !== null) {
                window.clearTimeout(wifiTimerStreamVolumeUpdateTimer);
            }
            wifiTimerStreamVolumeUpdateTimer = window.setTimeout((): void => {
                wifiTimerStreamVolumeUpdateTimer = null;
                void applyWifiTimerStreamVolumeIfNeeded();
            }, 120);
        });

        elements.wifiTimerToneKindSelect.addEventListener('input', (): void => {
            updateWifiTimerCurrentCustomToneHint();
        });

        [
            elements.wifiTimerStage1SecondsInput,
            elements.wifiTimerStage2SecondsInput,
            elements.wifiTimerStage3SecondsInput,
            elements.wifiTimerBlinkSecondsInput,
            elements.wifiTimerBlinkIntervalMsInput,
            elements.wifiTimerStage1ColorInput,
            elements.wifiTimerStage2ColorInput,
            elements.wifiTimerStage3ColorInput,
            elements.wifiTimerAlertColorInput,
        ].forEach((element: HTMLInputElement): void => {
            element.addEventListener('input', (): void => {
                wifiTimerDisplayEffectDirty = true;
                updateWifiTimerColorEffectPreview();
            });
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
                    wifiTimerDisplayEffectDirty = false;
                    applyWifiTimerStatus(status);
                    setWifiTimerOperationMessage('Display settings updated.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerSaveColorEffectBtn.addEventListener('click', (): void => {
            void electronAPI.updateWifiTimerDisplaySettings(readWifiTimerDisplaySettings())
                .then((status: WifiTimerStatus): void => {
                    wifiTimerDisplayEffectDirty = false;
                    applyWifiTimerStatus(status);
                    setWifiTimerOperationMessage('Display color effect updated.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerPresetColorEffectBtn.addEventListener('click', (): void => {
            applyWifiTimerDramaticColorEffectPreset();
            setWifiTimerOperationMessage('Dramatic preset loaded. Click Save Color Effect to apply.');
        });

        elements.wifiTimerApplyAudioBtn.addEventListener('click', (): void => {
            const currentSettings = readWifiTimerAudioSettings();
            void resolveWifiTimerSelectedToneKind()
                .then((toneKind: number): Promise<WifiTimerStatus> => {
                    return electronAPI.updateWifiTimerAudioSettings({
                        ...currentSettings,
                        toneKind,
                    });
                })
                .then((status: WifiTimerStatus): void => {
                    applyWifiTimerStatus(status);
                    setWifiTimerOperationMessage('Audio settings updated.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerTestAudioBtn.addEventListener('click', (): void => {
            const currentSettings = readWifiTimerAudioSettings();
            void resolveWifiTimerSelectedToneKind()
                .then((toneKind: number): Promise<WifiTimerStatus> => {
                    return electronAPI.testWifiTimerAudioSettings({
                        ...currentSettings,
                        toneKind,
                    });
                })
                .then((status: WifiTimerStatus): void => {
                    applyWifiTimerStatus(status);
                    setWifiTimerOperationMessage('Audio test requested.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerUploadCustomToneBtn.addEventListener('click', (): void => {
            const file = elements.wifiTimerCustomToneFileInput.files?.[0] ?? null;
            if (!file) {
                setWifiTimerOperationMessage('アップロードする mp3/wav ファイルを選択してください。', true);
                return;
            }
            if (!isSupportedWifiTimerCustomAudioFile(file)) {
                setWifiTimerOperationMessage('Custom upload supports mp3/wav only.', true);
                return;
            }
            void decodeWifiTimerCustomAudioFile(file, 5)
                .then((decoded: { pcmBytes: Uint8Array; truncated: boolean; durationMs: number }): Promise<Record<string, unknown>> => {
                    if (decoded.truncated) {
                        setWifiTimerOperationMessage('5秒を超える音声は先頭5秒のみ保存します。');
                    }
                    return electronAPI.uploadWifiTimerCustomAudio(file.name, decoded.pcmBytes);
                })
                .then((): Promise<WifiTimerCustomAudioList> => refreshWifiTimerCustomAudioList())
                .then((): Promise<WifiTimerAudioTones> => refreshWifiTimerAudioTones())
                .then((): Promise<WifiTimerStatus> => refreshWifiTimerStatus())
                .then((): void => {
                    elements.wifiTimerCustomToneFileInput.value = '';
                    setWifiTimerOperationMessage(`Custom audio uploaded: ${file.name}`);
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerRefreshCustomToneBtn.addEventListener('click', (): void => {
            void refreshWifiTimerCustomAudioList()
                .then((): Promise<WifiTimerAudioTones> => refreshWifiTimerAudioTones())
                .then((): Promise<WifiTimerStatus> => refreshWifiTimerStatus())
                .then((): void => {
                    setWifiTimerOperationMessage('Custom audio list refreshed.');
                })
                .catch((error: unknown): void => {
                    setWifiTimerOperationMessage(error instanceof Error ? error.message : String(error), true);
                });
        });

        elements.wifiTimerStreamAudioBtn.addEventListener('click', (): void => {
            if (wifiTimerStreamBusy) {
                return;
            }
            const file = elements.wifiTimerLocalAudioFileInput.files?.[0] ?? null;
            if (!file) {
                setWifiTimerStreamStatus('ローカル音声ファイルを選択してください。', true);
                return;
            }

            const startedAt = performance.now();
            setWifiTimerStreamBusy(true);
            setWifiTimerStreamStatus('Starting real-time stream...');
            void waitForNextFrame()
                .then((): Promise<void> => prepareWifiTimerLiveStreamPlayback())
                .then((): Promise<{ sampleRate: number; sentBytes: number; endResult: WifiTimerAudioStreamEndResult }> => {
                    return streamWifiTimerLocalAudioRealtime(file, (progress: WifiTimerAudioStreamProgress): void => {
                        const bufferedPercent = progress.maxBufferedBytes > 0
                            ? Math.round((progress.bufferedBytes / progress.maxBufferedBytes) * 100)
                            : 0;
                        setWifiTimerStreamStatus(
                            `Streaming... sent=${progress.sentBytes}B produced=${progress.producedBytes}B buffer=${bufferedPercent}% `
                            + `(${progress.bufferedBytes}/${progress.maxBufferedBytes})`,
                        );
                    });
                })
                .then((result: { sampleRate: number; sentBytes: number; endResult: WifiTimerAudioStreamEndResult }): void => {
                    const totalMs = Math.round(performance.now() - startedAt);
                    const deviceMs = typeof result.endResult.elapsedMs === 'number'
                        ? result.endResult.elapsedMs
                        : totalMs;
                    setWifiTimerStreamStatus(
                        `Playing streamed audio | sampleRate=${result.sampleRate}Hz sent=${result.sentBytes}B device=${deviceMs}ms total=${totalMs}ms`,
                    );
                    setWifiTimerOperationMessage('Local audio stream completed.');
                })
                .catch((error: unknown): void => {
                    const message = error instanceof Error ? error.message : String(error);
                    setWifiTimerStreamStatus(message, true);
                    setWifiTimerOperationMessage(message, true);
                })
                .finally((): void => {
                    if (wifiTimerStreamVolumeUpdateTimer !== null) {
                        window.clearTimeout(wifiTimerStreamVolumeUpdateTimer);
                        wifiTimerStreamVolumeUpdateTimer = null;
                    }
                    setWifiTimerStreamBusy(false);
                });
        });

        elements.wifiTimerPauseStreamBtn.addEventListener('click', (): void => {
            if (!wifiTimerStreamBusy || wifiTimerStreamPlaybackPaused) {
                return;
            }
            wifiTimerStreamPlaybackPaused = true;
            setWifiTimerStreamBusy(true);
            void requestWifiTimerDirectJson<WifiTimerStatus>('api/audio/stream/pause', { method: 'POST' })
                .then((status: WifiTimerStatus): void => {
                    wifiTimerStreamHtmlAudio?.pause();
                    applyWifiTimerStatus(status);
                    setWifiTimerStreamStatus('Audio stream paused.');
                    setWifiTimerOperationMessage('Audio stream paused.');
                })
                .catch((error: unknown): void => {
                    wifiTimerStreamPlaybackPaused = false;
                    setWifiTimerStreamBusy(true);
                    const message = error instanceof Error ? error.message : String(error);
                    setWifiTimerStreamStatus(message, true);
                    setWifiTimerOperationMessage(message, true);
                });
        });

        elements.wifiTimerResumeStreamBtn.addEventListener('click', (): void => {
            if (!wifiTimerStreamBusy || !wifiTimerStreamPlaybackPaused) {
                return;
            }
            void requestWifiTimerDirectJson<WifiTimerStatus>('api/audio/stream/resume', { method: 'POST' })
                .then(async (status: WifiTimerStatus): Promise<void> => {
                    if (wifiTimerStreamHtmlAudio) {
                        await wifiTimerStreamHtmlAudio.play();
                    }
                    applyWifiTimerStatus(status);
                    setWifiTimerStreamStatus('Audio stream resumed.');
                    setWifiTimerOperationMessage('Audio stream resumed.');
                })
                .catch((error: unknown): void => {
                    const message = error instanceof Error ? error.message : String(error);
                    setWifiTimerStreamStatus(message, true);
                    setWifiTimerOperationMessage(message, true);
                });
        });

        elements.wifiTimerCancelStreamBtn.addEventListener('click', (): void => {
            wifiTimerStreamCancelRequested = true;
            wifiTimerStreamHtmlAudio?.pause();
            void requestWifiTimerDirectJson<Record<string, unknown>>('api/audio/stream/cancel', { method: 'POST' })
                .then((): void => {
                    setWifiTimerStreamStatus('Audio stream canceled');
                    setWifiTimerOperationMessage('Audio stream canceled.');
                })
                .catch((error: unknown): void => {
                    const message = error instanceof Error ? error.message : String(error);
                    setWifiTimerStreamStatus(message, true);
                    setWifiTimerOperationMessage(message, true);
                })
                .finally((): void => {
                    if (wifiTimerStreamVolumeUpdateTimer !== null) {
                        window.clearTimeout(wifiTimerStreamVolumeUpdateTimer);
                        wifiTimerStreamVolumeUpdateTimer = null;
                    }
                    setWifiTimerStreamBusy(false);
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
