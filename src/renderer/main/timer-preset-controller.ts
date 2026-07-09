((): void => {
type MainRendererContext = import('../../shared/main-renderer-types').MainRendererContext;
type TimerMainLogicApi = import('../../shared/timer-main-logic-types').TimerMainLogicApi;
type ParseNumberUtilsApi = import('../../shared/parse-number-utils-types').ParseNumberUtilsApi;
type LocalStorageStoreApi = import('../../shared/local-storage-store-types').LocalStorageStoreApi;

type TimerPresetControllerDeps = {
    elements: MainRendererContext['elements'];
    state: MainRendererContext['state'];
    electronAPI: MainRendererContext['electronAPI'];
    timerMainLogic: TimerMainLogicApi;
    parseNumberUtils: ParseNumberUtilsApi;
    localStorageStore: LocalStorageStoreApi;
    timerPresetsStorageKey: string;
    applyCountdownInitialValue: (value: number, shouldNotify: boolean, shouldStart: boolean) => void;
};

type TimerPresetControllerApi = {
    renderPresets: () => void;
    renderPresetConfig: () => void;
    applyPresets: () => void;
    registerPresetEditHandlers: () => void;
};

/**
 * タイマープリセット制御を生成する。
 * @param deps 依存オブジェクト
 * @returns プリセット制御 API
 */
function createTimerPresetController(deps: TimerPresetControllerDeps): TimerPresetControllerApi {
    const {
        elements,
        state,
        electronAPI,
        timerMainLogic,
        parseNumberUtils,
        localStorageStore,
        timerPresetsStorageKey,
        applyCountdownInitialValue,
    } = deps;

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

    const togglePresetEditPanel = (): void => {
        const isHidden = elements.presetEditContainer.style.display === 'none';
        elements.presetEditContainer.style.display = isHidden ? 'block' : 'none';
        elements.togglePresetEditBtn.textContent = isHidden ? '✕ Close Edit' : '⚙ Edit Presets';
        elements.togglePresetEditBtn.style.background = isHidden ? '#dc3545' : '#6c757d';
    };

    const applyPresets = (): void => {
        state.currentPresets.sort((a: number, b: number): number => a - b);
        localStorageStore.setJsonValue(timerPresetsStorageKey, state.currentPresets);
        renderPresets();
        renderPresetConfig();
        electronAPI.updateTimerPresets(state.currentPresets);
    };

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

    return {
        renderPresets,
        renderPresetConfig,
        applyPresets,
        registerPresetEditHandlers,
    };
}

const root = globalThis as typeof globalThis & {
    mainTimerPresetController?: {
        createTimerPresetController: typeof createTimerPresetController;
    };
};
root.mainTimerPresetController = { createTimerPresetController };
})();
