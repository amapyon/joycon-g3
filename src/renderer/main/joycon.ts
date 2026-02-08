((): void => {
    type JoyConMainLogicApi = import('../../shared/joycon-main-logic-types').JoyConMainLogicApi;
    type MainRendererContext = import('../../shared/main-renderer-types').MainRendererContext;
    type JoyConStatus = import('../../shared/main-renderer-types').JoyConStatus;
    type BatteryStatus = import('../../shared/main-renderer-types').BatteryStatus;
    type CalibrationStatus = import('../../shared/main-renderer-types').CalibrationStatus;

    const mainRenderer = (window as Window & { mainRenderer?: MainRendererContext }).mainRenderer;
    const joyConMainLogic = (window as Window & { joyConMainLogic?: JoyConMainLogicApi }).joyConMainLogic;
    if (!mainRenderer || !joyConMainLogic) {
        throw new Error('mainRenderer or joyConMainLogic is not available');
    }
    const { electronAPI, elements } = mainRenderer;

    /**
     * 接続状態表示と操作ボタン表示を更新する。
     * @param isLeft 左 Joy-Con かどうか
     * @param connected 接続状態
     */
    const updateStatusAndButton = (isLeft: boolean, connected: boolean): void => {
        const statusEl = isLeft ? elements.mainStatusLeftText : elements.mainStatusRightText;
        const actionBtn = isLeft ? elements.joyconLeftActionBtn : elements.joyconRightActionBtn;
        const sideLabel = isLeft ? 'L' : 'R';
        const view = joyConMainLogic.buildJoyConStatusView(sideLabel, connected);

        if (!(statusEl && actionBtn)) {
            return;
        }
        statusEl.textContent = view.text;
        statusEl.className = view.className;
        actionBtn.textContent = view.buttonText;
        actionBtn.style.backgroundColor = view.buttonBackgroundColor;
        actionBtn.style.color = 'white';
        actionBtn.style.padding = '2px 10px';
    };

    /**
     * 未接続時にバッテリー表示をクリアする。
     * @param isLeft 左 Joy-Con かどうか
     * @param connected 接続状態
     */
    const clearBatteryIfDisconnected = (isLeft: boolean, connected: boolean): void => {
        const batteryEl = isLeft ? elements.mainBatteryStatusLeft : elements.mainBatteryStatusRight;
        if (connected || !batteryEl) {
            return;
        }
        batteryEl.textContent = '';
    };

    /**
     * 接続状態に応じて Joy-Con 表示を更新する。
     * @param isLeft 左 Joy-Con かどうか
     * @param connected 接続状態
     */
    const applyConnectionState = (isLeft: boolean, connected: boolean): void => {
        updateStatusAndButton(isLeft, connected);
        clearBatteryIfDisconnected(isLeft, connected);
    };

    /**
     * バッテリー値を表示用文字列へ変換する。
     * @param level バッテリーレベル
     * @returns 表示文字列
     */
    const bindJoyConActionButton = (isLeft: boolean): void => {
        const button = isLeft ? elements.joyconLeftActionBtn : elements.joyconRightActionBtn;
        const statusEl = isLeft ? elements.mainStatusLeftText : elements.mainStatusRightText;
        button.addEventListener('click', (): void => {
            const isConnected = statusEl.classList.contains('connected');
            if (joyConMainLogic.shouldConnectOnActionClick(isConnected)) {
                electronAPI.connectJoyCon(isLeft);
                return;
            }
            electronAPI.shutdownJoyCon(isLeft);
        });
    };

    /**
     * キャリブレーション関連ハンドラを登録する。
     */
    const bindCalibrationHandlers = (): void => {
        elements.calibrateButton.addEventListener('click', (): void => {
            elements.calibrationStatus.textContent = 'Calibrating... Keep Joy-Cons still!';
            elements.calibrateButton.disabled = true;
            electronAPI.startCalibration();
        });

        electronAPI.onCalibrationStatusUpdate((statusInfo: CalibrationStatus): void => {
            const statusView = joyConMainLogic.resolveCalibrationStatusView(statusInfo.status);
            if (statusView.enableCalibrateButton) {
                elements.calibrateButton.disabled = false;
            }
            elements.calibrationStatus.textContent = statusView.message;
        });
    };

    /**
     * Joy-Con 状態の再同期を要求する。
     */
    const requestJoyConStatusSync = (): void => {
        electronAPI.requestJoyConStatus();
    };

    /**
     * 起動直後に状態取得を複数回要求し、初期表示の取りこぼしを防ぐ。
     */
    const scheduleInitialJoyConStatusSync = (): void => {
        requestJoyConStatusSync();
        [1000, 3000].forEach((delayMs: number): void => {
            setTimeout((): void => {
                requestJoyConStatusSync();
            }, delayMs);
        });
    };

    /**
     * ウィンドウ復帰時に Joy-Con 状態を再取得する。
     */
    const registerJoyConStatusResyncHandlers = (): void => {
        window.addEventListener('focus', (): void => {
            requestJoyConStatusSync();
        });
        document.addEventListener('visibilitychange', (): void => {
            if (document.visibilityState === 'visible') {
                requestJoyConStatusSync();
            }
        });
    };

    /**
     * Joy-Con セクションを初期化する。
     * @returns なし
     */
    const initJoyConSection = (): void => {
        electronAPI.onJoyConStatusUpdate((status: JoyConStatus): void => {
            applyConnectionState(true, status.leftConnected);
            applyConnectionState(false, status.rightConnected);
        });

        bindJoyConActionButton(true);
        bindJoyConActionButton(false);

        electronAPI.onJoyConBatteryStatusUpdate(({ isLeft, level }: BatteryStatus): void => {
            const displayText = joyConMainLogic.formatBatteryText(level);
            if (isLeft) {
                elements.mainBatteryStatusLeft.textContent = displayText;
            } else {
                elements.mainBatteryStatusRight.textContent = displayText;
            }
        });

        bindCalibrationHandlers();
        registerJoyConStatusResyncHandlers();
        scheduleInitialJoyConStatusSync();
    };

    mainRenderer.initJoyConSection = initJoyConSection;
})();
