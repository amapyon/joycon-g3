((): void => {
    const mainRenderer = (window as unknown as { mainRenderer: MainRendererContext }).mainRenderer;
    const { electronAPI, elements } = mainRenderer;

    /**
     * Joy-Con セクションを初期化する。
     * @returns なし
     */
    const initJoyConSection = (): void => {
        electronAPI.onJoyConStatusUpdate((status: JoyConStatus): void => {
            if (elements.mainStatusLeftText && elements.joyconLeftActionBtn) {
                elements.mainStatusLeftText.textContent = status.leftConnected ? 'L: 🟢' : 'L: ⚪';
                elements.mainStatusLeftText.className = status.leftConnected ? 'connected' : 'disconnected';
                elements.joyconLeftActionBtn.textContent = status.leftConnected ? 'OFF' : 'ON';
                elements.joyconLeftActionBtn.style.backgroundColor = status.leftConnected ? '#dc3545' : '#28a745';
                elements.joyconLeftActionBtn.style.color = 'white';
                elements.joyconLeftActionBtn.style.padding = '2px 10px';
                if (!status.leftConnected && elements.mainBatteryStatusLeft) {
                    elements.mainBatteryStatusLeft.textContent = '';
                }
            }

            if (elements.mainStatusRightText && elements.joyconRightActionBtn) {
                elements.mainStatusRightText.textContent = status.rightConnected ? 'R: 🟢' : 'R: ⚪';
                elements.mainStatusRightText.className = status.rightConnected ? 'connected' : 'disconnected';
                elements.joyconRightActionBtn.textContent = status.rightConnected ? 'OFF' : 'ON';
                elements.joyconRightActionBtn.style.backgroundColor = status.rightConnected ? '#dc3545' : '#28a745';
                elements.joyconRightActionBtn.style.color = 'white';
                elements.joyconRightActionBtn.style.padding = '2px 10px';
                if (!status.rightConnected && elements.mainBatteryStatusRight) {
                    elements.mainBatteryStatusRight.textContent = '';
                }
            }
        });

        elements.joyconLeftActionBtn.addEventListener('click', (): void => {
            const isConnected = elements.mainStatusLeftText.classList.contains('connected');
            if (isConnected) {
                electronAPI.shutdownJoyCon(true);
            } else {
                electronAPI.connectJoyCon(true);
            }
        });

        elements.joyconRightActionBtn.addEventListener('click', (): void => {
            const isConnected = elements.mainStatusRightText.classList.contains('connected');
            if (isConnected) {
                electronAPI.shutdownJoyCon(false);
            } else {
                electronAPI.connectJoyCon(false);
            }
        });

        electronAPI.onJoyConBatteryStatusUpdate(({ isLeft, level }: BatteryStatus): void => {
            let icon = '';
            let percentage = 0;

            switch (level) {
            case 0:
                icon = '🪫';
                percentage = 0;
                break;
            case 1:
                icon = '🔋';
                percentage = 25;
                break;
            case 2:
                icon = '🔋';
                percentage = 50;
                break;
            case 3:
                icon = '🔋';
                percentage = 75;
                break;
            case 4:
                icon = '🔋';
                percentage = 100;
                break;
            default:
                icon = '❓';
                percentage = 0;
            }

            const displayText = `${icon} ${percentage}%`;

            if (isLeft) {
                elements.mainBatteryStatusLeft.textContent = displayText;
            } else {
                elements.mainBatteryStatusRight.textContent = displayText;
            }
        });

        elements.calibrateButton.addEventListener('click', (): void => {
            elements.calibrationStatus.textContent = 'Calibrating... Keep Joy-Cons still!';
            elements.calibrateButton.disabled = true;
            electronAPI.startCalibration();
        });

        electronAPI.onCalibrationStatusUpdate((statusInfo: CalibrationStatus): void => {
            let message = `Calibration ${statusInfo.status}.`;
            if (statusInfo.status === 'complete') {
                message = 'Calibration complete!';
                elements.calibrateButton.disabled = false;
            } else if (statusInfo.status === 'failed') {
                message = 'Calibration failed.';
                elements.calibrateButton.disabled = false;
            }
            elements.calibrationStatus.textContent = message;
        });

        electronAPI.requestJoyConStatus();
    };

    mainRenderer.initJoyConSection = initJoyConSection;
})();
