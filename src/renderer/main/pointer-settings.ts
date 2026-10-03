((): void => {
    type MainRendererAccessApi = import('../../shared/main-renderer-types').MainRendererAccessApi;
    type LocalStorageStoreApi = import('../../shared/local-storage-store-types').LocalStorageStoreApi;
    type MainWindowApiAccessorApi = import('../../shared/main-window-api-types').MainWindowApiAccessorApi;
    type PointerMotionSettings = import('../../shared/pointer-motion-settings').PointerMotionSettings;
    type PointerMotionDiagnostics = import('../../shared/pointer-motion-settings').PointerMotionDiagnostics;

    const POINTER_MOVE_SPEED_MIN = 0.01;
    const POINTER_MOVE_SPEED_MAX = 0.12;
    const POINTER_GYRO_DEADZONE_MIN = 0;
    const POINTER_GYRO_DEADZONE_MAX = 300;
    const DEFAULT_POINTER_MOTION_SETTINGS: PointerMotionSettings = {
        moveSpeed: 0.05,
        gyroDeadzone: 120,
        xRotationCompensationStrength: 1,
        fixedXRotationDegrees: null,
        diagnosticsEnabled: false,
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
        const xRotationCompensationStrength = typeof value?.xRotationCompensationStrength === 'number'
            && Number.isFinite(value.xRotationCompensationStrength)
            ? Math.min(Math.max(value.xRotationCompensationStrength, 0.5), 1)
            : DEFAULT_POINTER_MOTION_SETTINGS.xRotationCompensationStrength;
        const fixedAnglePresets = [-60, -30, 0, 30, 60];
        const fixedXRotationDegrees = typeof value?.fixedXRotationDegrees === 'number'
            && fixedAnglePresets.includes(value.fixedXRotationDegrees)
            ? value.fixedXRotationDegrees
            : null;
        const diagnosticsEnabled = typeof value?.diagnosticsEnabled === 'boolean'
            ? value.diagnosticsEnabled
            : DEFAULT_POINTER_MOTION_SETTINGS.diagnosticsEnabled;

        return {
            moveSpeed: Math.round(moveSpeed * 100) / 100,
            gyroDeadzone,
            xRotationCompensationStrength,
            fixedXRotationDegrees,
            diagnosticsEnabled,
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
        elements.pointerCompensationStrengthSelect.value = String(settings.xRotationCompensationStrength);
        elements.pointerFixedAngleSelect.value = settings.fixedXRotationDegrees === null
            ? 'auto'
            : String(settings.fixedXRotationDegrees);
        elements.pointerCompensationStrengthSelect.disabled = settings.fixedXRotationDegrees === null;
        elements.pointerCompensationStrengthSelect.title = settings.fixedXRotationDegrees === null
            ? '重力基準補正では固定角度の強度は使用しません'
            : '固定X軸補正へ適用する強度です';
        elements.pointerDiagnosticsEnabledInput.checked = settings.diagnosticsEnabled;
        elements.pointerDiagnosticsPanel.style.display = settings.diagnosticsEnabled ? 'block' : 'none';
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
            xRotationCompensationStrength: Number(elements.pointerCompensationStrengthSelect.value),
            fixedXRotationDegrees: elements.pointerFixedAngleSelect.value === 'auto'
                ? null
                : Number(elements.pointerFixedAngleSelect.value),
            diagnosticsEnabled: elements.pointerDiagnosticsEnabledInput.checked,
        });
    };

    /**
     * 受信した診断値を画面表示用の文字列へ整形する。
     * @param diagnostics ポインター補正の診断値
     * @returns 診断表示文字列
     */
    const formatDiagnostics = (diagnostics: PointerMotionDiagnostics): string => {
        const leakage = diagnostics.axisLeakageRatio === null
            ? '--'
            : `${(diagnostics.axisLeakageRatio * 100).toFixed(1)}%`;
        const label = diagnostics.id === 'cursorLeft' ? 'L' : 'R';
        const mode = diagnostics.coordinateMode === 'gravity-frame' ? '重力基準' : '固定X軸';
        return `${label}: ${mode} / 推定 ${diagnostics.estimatedXRotationDegrees.toFixed(1)}° / `
            + `適用 ${diagnostics.appliedXRotationDegrees.toFixed(1)}° / `
            + `Y ${diagnostics.correctedGyroY.toFixed(0)} / Z ${diagnostics.correctedGyroZ.toFixed(0)} / `
            + `軸漏れ ${leakage}`;
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

        elements.pointerCompensationStrengthSelect.addEventListener('change', (): void => {
            const settings = readSettingsFromForm();
            applySettingsToForm(settings);
            persistSettings(settings);
        });

        elements.pointerFixedAngleSelect.addEventListener('change', (): void => {
            const settings = readSettingsFromForm();
            applySettingsToForm(settings);
            persistSettings(settings);
        });

        elements.pointerDiagnosticsEnabledInput.addEventListener('change', (): void => {
            const settings = readSettingsFromForm();
            applySettingsToForm(settings);
            persistSettings(settings);
        });

        electronAPI.onPointerMotionDiagnostics((diagnostics: PointerMotionDiagnostics): void => {
            const target = diagnostics.id === 'cursorLeft'
                ? elements.pointerDiagnosticsLeft
                : elements.pointerDiagnosticsRight;
            target.textContent = formatDiagnostics(diagnostics);
        });

        elements.pointerSettingsResetBtn.addEventListener('click', (): void => {
            applySettingsToForm(DEFAULT_POINTER_MOTION_SETTINGS);
            persistSettings(DEFAULT_POINTER_MOTION_SETTINGS);
        });
    };

    mainRenderer.initPointerSettingsSection = initPointerSettingsSection;
})();
