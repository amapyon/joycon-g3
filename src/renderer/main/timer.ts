((): void => {
    const mainRenderer = (window as unknown as { mainRenderer: MainRendererContext }).mainRenderer;
    const { electronAPI, elements, state } = mainRenderer;

    /**
     * プリセットの表示ラベルを作成する。
     * @param seconds 秒数
     * @returns 表示ラベル
     */
    const formatMainPresetLabel = (seconds: number): string => {
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs === 0 ? `${mins}m` : `${mins}m${secs}s`;
    };

    /**
     * カウントダウン初期値を反映して通知する。
     * @param value 秒数
     * @param shouldNotify メインプロセスへ通知するか
     * @param shouldStart タイマーを開始するか
     * @returns なし
     */
    const applyCountdownInitialValue = (value: number, shouldNotify: boolean, shouldStart: boolean): void => {
        elements.countdownInitialValueInput.value = String(value);
        localStorage.setItem('countdownInitialValue', String(value));
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
            btn.textContent = formatMainPresetLabel(time);
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
                const nextValue = parseInt(input.value, 10);
                state.currentPresets[index] = Number.isNaN(nextValue) ? 10 : nextValue;
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
        localStorage.setItem('timerPresets', JSON.stringify(state.currentPresets));
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
     * セレクトボックスの値を安全に反映する。
     * @param select セレクトボックス
     * @param val 設定する値
     * @returns なし
     */
    const setSelectValue = (select: HTMLSelectElement, val: string): void => {
        for (let i = 0; i < select.options.length; i += 1) {
            if (select.options[i].value === val) {
                select.selectedIndex = i;
                break;
            }
        }
    };

    /**
     * 通知設定をローカルストレージから復元する。
     * @returns なし
     */
    const restoreNotificationSettings = (): void => {
        const saved = localStorage.getItem('timerNotifications');
        if (saved) {
            const configs = JSON.parse(saved) as NotificationConfig[];
            if (configs[0]) {
                elements.sound1TimeInput.value = String(configs[0].time);
                setSelectValue(elements.sound1Select, configs[0].filename);
                elements.sound1RumbleToggle.checked = !!configs[0].rumble;
            }
            if (configs[1]) {
                elements.sound2TimeInput.value = String(configs[1].time);
                setSelectValue(elements.sound2Select, configs[1].filename);
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
        const configs: NotificationConfig[] = [
            {
                time: parseInt(elements.sound1TimeInput.value, 10) || 0,
                filename: elements.sound1Select.value,
                absolutePath: elements.sound1Select.value
                    ? (basePath + '/' + elements.sound1Select.value).replace(/\\/g, '/')
                    : '',
                rumble: elements.sound1RumbleToggle.checked,
            },
            {
                time: parseInt(elements.sound2TimeInput.value, 10) || 0,
                filename: elements.sound2Select.value,
                absolutePath: elements.sound2Select.value
                    ? (basePath + '/' + elements.sound2Select.value).replace(/\\/g, '/')
                    : '',
                rumble: elements.sound2RumbleToggle.checked,
            },
        ];
        localStorage.setItem('timerNotifications', JSON.stringify(configs));
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
     * サウンドファイルをプレビュー再生する。
     * @param filename ファイル名
     * @returns 処理完了を示す Promise
     */
    const previewSound = async (filename: string): Promise<void> => {
        if (!filename) {
            return;
        }
        const basePath = await electronAPI.getMediaBasePath();
        const absolutePath = (basePath + '/' + filename).replace(/\\/g, '/');
        const audioUrl = absolutePath.startsWith('file://') ? absolutePath : `file://${absolutePath}`;
        try {
            const audio = new Audio(audioUrl);
            void audio.play();
        } catch {
            return;
        }
    };

    /**
     * 秒数を表示用の文字列に整形する。
     * @param seconds 秒数
     * @returns 表示用文字列
     */
    const formatTimeForDisplay = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    /**
     * 保存済みのサウンドフォルダーを反映する。
     * @returns 処理完了を示す Promise
     */
    const applyStoredMediaDir = async (): Promise<void> => {
        const storedDir = localStorage.getItem('soundMediaDir') || '';
        if (!storedDir) {
            return;
        }
        const applied = await electronAPI.setMediaBasePath(storedDir);
        if (!applied) {
            localStorage.removeItem('soundMediaDir');
        }
    };

    /**
     * サウンド再生遅延を初期化する。
     * @returns なし
     */
    const initSoundPlayDelay = (): void => {
        const storedDelay = localStorage.getItem('soundPlayDelayMs');
        const defaultDelay = 200;
        const initialDelay = storedDelay ? parseInt(storedDelay, 10) : defaultDelay;
        const normalizedDelay = Number.isNaN(initialDelay) ? defaultDelay : Math.min(Math.max(initialDelay, 0), 5000);
        elements.soundPlayDelayInput.value = String(normalizedDelay);
        electronAPI.updateSoundPlayDelay(normalizedDelay);

        elements.soundPlayDelayInput.addEventListener('change', (): void => {
            const nextValue = parseInt(elements.soundPlayDelayInput.value, 10);
            if (Number.isNaN(nextValue)) {
                elements.soundPlayDelayInput.value = String(defaultDelay);
                localStorage.setItem('soundPlayDelayMs', String(defaultDelay));
                electronAPI.updateSoundPlayDelay(defaultDelay);
                return;
            }
            const clamped = Math.min(Math.max(nextValue, 0), 5000);
            elements.soundPlayDelayInput.value = String(clamped);
            localStorage.setItem('soundPlayDelayMs', String(clamped));
            electronAPI.updateSoundPlayDelay(clamped);
        });
    };

    /**
     * タイマーセクションを初期化する。
     * @returns なし
     */
    const initTimerSection = (): void => {
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

        renderPresets();
        initTimerActionButtons();
        initNotificationRumbleToggle();
        initSoundPlayDelay();
        renderPresetConfig();

        electronAPI.onUpdateTimerPresets((presets: number[]): void => {
            state.currentPresets = presets;
            localStorage.setItem('timerPresets', JSON.stringify(state.currentPresets));
            renderPresets();
            renderPresetConfig();
        });

        electronAPI.updateTimerPresets(state.currentPresets);

        [elements.sound1Select, elements.sound2Select, elements.sound1TimeInput, elements.sound2TimeInput]
            .forEach((el: HTMLSelectElement | HTMLInputElement): void => {
                el.addEventListener('change', (): void => {
                    void broadcastNotificationUpdate();
                });
            });

        elements.sound1PlayBtn.addEventListener('click', (): void => {
            void previewSound(elements.sound1Select.value);
        });

        elements.sound2PlayBtn.addEventListener('click', (): void => {
            void previewSound(elements.sound2Select.value);
        });

        elements.refreshSoundsBtn.addEventListener('click', (): void => {
            void loadMediaFiles();
        });

        elements.soundFolderSelectBtn.addEventListener('click', async (): Promise<void> => {
            await electronAPI.selectMediaFolder();
            const basePath = await electronAPI.getMediaBasePath();
            if (basePath) {
                localStorage.setItem('soundMediaDir', basePath);
            }
            void loadMediaFiles();
        });

        electronAPI.onUpdateTimerNotifications((configs: NotificationConfig[]): void => {
            localStorage.setItem('timerNotifications', JSON.stringify(configs));
        });

        void applyStoredMediaDir().then(() => loadMediaFiles());

        elements.toggleTimerWindowBtn.addEventListener('click', (): void => {
            electronAPI.toggleTimerWindow();
        });

        electronAPI.onMainTimerUpdate((remainingTime: number): void => {
            elements.mainCountdownDisplay.textContent = formatTimeForDisplay(remainingTime);
            elements.mainCountdownDisplay.style.color = remainingTime <= 0 ? '#dc3545' : '#007bff';
        });

        electronAPI.onUpdateCountdownInitialValue((value: number): void => {
            if (!Number.isNaN(value)) {
                applyCountdownInitialValue(value, false, false);
            }
        });

        elements.countdownInitialValueInput.addEventListener('change', (): void => {
            const value = parseInt(elements.countdownInitialValueInput.value, 10);
            if (!Number.isNaN(value) && value >= 1 && value <= 3600) {
                applyCountdownInitialValue(value, true, false);
            }
        });

        const savedInitialValue = localStorage.getItem('countdownInitialValue');
        if (savedInitialValue) {
            const value = parseInt(savedInitialValue, 10);
            if (!Number.isNaN(value)) {
                applyCountdownInitialValue(value, true, false);
            }
        }
    };

    mainRenderer.initTimerSection = initTimerSection;
})();
