((): void => {
    type JoyConMainLogicApi = import('../../shared/joycon-main-logic-types').JoyConMainLogicApi;

    const mainRenderer = (window as unknown as { mainRenderer: MainRendererContext }).mainRenderer;
    const joyConMainLogic = (window as unknown as { joyConMainLogic: JoyConMainLogicApi }).joyConMainLogic;
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
        electronAPI.requestJoyConStatus();
    };

    mainRenderer.initJoyConSection = initJoyConSection;
})();
