((): void => {
    type MainRendererAccessApi = import('../../shared/main-renderer-types').MainRendererAccessApi;
    type LocalStorageStoreApi = import('../../shared/local-storage-store-types').LocalStorageStoreApi;
    type MainWindowApiAccessorApi = import('../../shared/main-window-api-types').MainWindowApiAccessorApi;
    type PointerMotionSettings = import('../../shared/pointer-motion-settings').PointerMotionSettings;

    const POINTER_MOVE_SPEED_MIN = 0.01;
    const POINTER_MOVE_SPEED_MAX = 0.12;
    const POINTER_GYRO_DEADZONE_MIN = 0;
    const POINTER_GYRO_DEADZONE_MAX = 300;
    const DEFAULT_POINTER_MOTION_SETTINGS: PointerMotionSettings = {
        moveSpeed: 0.05,
        gyroDeadzone: 120,
    };

    const mainWindowApiAccessor = (globalThis as typeof globalThis & {
        mainWindowApiAccessor?: MainWindowApiAccessorApi;
    }).mainWindowApiAccessor;
    if (!mainWindowApiAccessor) {
        throw new Error('mainWindowApiAccessor is not available');
    }

    const mainRendererAccess = mainWindowApiAccessor.getApi<MainRendererAccessApi>('mainRendererAccess');
    const localStorageStore = mainWindowApiAccessor.getApi<LocalStorageStoreApi>('localStorageStore');
    const mainRenderer = mainRendererAccess.getMainRenderer();
    const { electronAPI, elements } = mainRenderer;

    const POINTER_MOTION_SETTINGS_KEY = 'pointerMotionSettings';

    /**
     * ポインター移動設定を正規化する。
     * @param value 入力値
     * @returns 正規化済み設定
     */
    const normalizePointerMotionSettings = (value: Partial<PointerMotionSettings> | null | undefined): PointerMotionSettings => {
        const moveSpeed = typeof value?.moveSpeed === 'number' && !Number.isNaN(value.moveSpeed)
            ? Math.min(Math.max(value.moveSpeed, POINTER_MOVE_SPEED_MIN), POINTER_MOVE_SPEED_MAX)
            : DEFAULT_POINTER_MOTION_SETTINGS.moveSpeed;
        const gyroDeadzone = typeof value?.gyroDeadzone === 'number' && !Number.isNaN(value.gyroDeadzone)
            ? Math.round(Math.min(Math.max(value.gyroDeadzone, POINTER_GYRO_DEADZONE_MIN), POINTER_GYRO_DEADZONE_MAX))
            : DEFAULT_POINTER_MOTION_SETTINGS.gyroDeadzone;

        return {
            moveSpeed: Math.round(moveSpeed * 100) / 100,
            gyroDeadzone,
        };
    };

    /**
     * 速度ラベルを更新する。
     * @param moveSpeed 表示する速度
     */
    const updateMoveSpeedLabel = (moveSpeed: number): void => {
        elements.pointerMoveSpeedValue.textContent = moveSpeed.toFixed(2);
    };

    /**
     * 設定を UI に反映する。
     * @param settings 反映対象の設定
     */
    const applySettingsToForm = (settings: PointerMotionSettings): void => {
        elements.pointerMoveSpeedInput.value = settings.moveSpeed.toFixed(2);
        elements.pointerGyroDeadzoneInput.value = String(settings.gyroDeadzone);
        updateMoveSpeedLabel(settings.moveSpeed);
    };

    /**
     * 現在のフォーム入力値から設定を組み立てる。
     * @returns 正規化済み設定
     */
    const readSettingsFromForm = (): PointerMotionSettings => {
        return normalizePointerMotionSettings({
            moveSpeed: Number(elements.pointerMoveSpeedInput.value),
            gyroDeadzone: Number(elements.pointerGyroDeadzoneInput.value),
        });
    };

    /**
     * 設定を永続化し main プロセスへ通知する。
     * @param settings 保存対象の設定
     */
    const persistSettings = (settings: PointerMotionSettings): void => {
        localStorageStore.setJsonValue(POINTER_MOTION_SETTINGS_KEY, settings);
        electronAPI.updatePointerMotionSettings(settings);
    };

    /**
     * ポインター設定 UI を初期化する。
     */
    const initPointerSettingsSection = (): void => {
        const storedSettings = localStorageStore.getJsonValue<PointerMotionSettings>(
            POINTER_MOTION_SETTINGS_KEY,
            DEFAULT_POINTER_MOTION_SETTINGS,
        );
        const initialSettings = normalizePointerMotionSettings(storedSettings);

        applySettingsToForm(initialSettings);
        persistSettings(initialSettings);

        elements.pointerMoveSpeedInput.addEventListener('input', (): void => {
            const settings = readSettingsFromForm();
            applySettingsToForm(settings);
            persistSettings(settings);
        });

        elements.pointerGyroDeadzoneInput.addEventListener('change', (): void => {
            const settings = readSettingsFromForm();
            applySettingsToForm(settings);
            persistSettings(settings);
        });

        elements.pointerSettingsResetBtn.addEventListener('click', (): void => {
            applySettingsToForm(DEFAULT_POINTER_MOTION_SETTINGS);
            persistSettings(DEFAULT_POINTER_MOTION_SETTINGS);
        });
    };

    mainRenderer.initPointerSettingsSection = initPointerSettingsSection;
})();
