((): void => {
    const mainRenderer = (window as Window & { mainRenderer?: MainRendererContext }).mainRenderer;
    if (!mainRenderer) {
        throw new Error('mainRenderer is not available');
    }
    const { electronAPI, elements } = mainRenderer;

    /**
     * ディスプレイ一覧を UI に反映する。
     * @param displays ディスプレイ一覧
     * @returns なし
     */
    const updateDisplayOptions = (displays: DisplayInfo[]): void => {
        const { displaySelect, cursorToggleBtn } = elements;
        displaySelect.innerHTML = '';
        if (displays && displays.length > 0) {
            const storedDisplayIdRaw = localStorage.getItem('lastDisplayId');
            const storedDisplayId = storedDisplayIdRaw ? parseInt(storedDisplayIdRaw, 10) : null;
            const displayIds = displays.map((display: DisplayInfo): number => display.id);
            const fallbackDisplayId = displayIds.reduce(
                (min: number, id: number): number => (id < min ? id : min),
                displayIds[0],
            );
            const defaultDisplayId = storedDisplayId !== null && displayIds.includes(storedDisplayId)
                ? storedDisplayId
                : fallbackDisplayId;

            displays.forEach((display: DisplayInfo): void => {
                const option = document.createElement('option');
                option.value = String(display.id);
                const physicalWidth = display.size.width * (display.scaleFactor || 1);
                const physicalHeight = display.size.height * (display.scaleFactor || 1);
                option.text = (display.label || 'Display') + ' [' + physicalWidth + 'x' + physicalHeight + ' - ' + display.id + ']';
                displaySelect.appendChild(option);
            });
            displaySelect.disabled = false;
            cursorToggleBtn.disabled = false;
            displaySelect.value = String(defaultDisplayId);
            electronAPI.setTargetDisplay(defaultDisplayId);
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.text = '-- No Displays Found --';
            displaySelect.appendChild(option);
            displaySelect.disabled = true;
            cursorToggleBtn.disabled = true;
        }
    };

    /**
     * カーソルウィンドウ関連の UI を初期化する。
     * @returns なし
     */
    const initDisplaySection = (): void => {
        electronAPI.onAvailableDisplays((displays: DisplayInfo[]): void => {
            updateDisplayOptions(displays);
        });

        elements.displaySelect.addEventListener('change', (): void => {
            const selectedDisplayId = parseInt(elements.displaySelect.value, 10);
            if (!Number.isNaN(selectedDisplayId)) {
                electronAPI.setTargetDisplay(selectedDisplayId);
                localStorage.setItem('lastDisplayId', String(selectedDisplayId));
            }
        });

        elements.cursorToggleBtn.addEventListener('click', (): void => {
            const isRunning = elements.cursorToggleBtn.textContent === 'OFF';
            if (isRunning) {
                elements.errorMessageDiv.textContent = 'Closing cursor window...';
                electronAPI.closeCursorWindow();
            } else {
                const selectedDisplayId = elements.displaySelect.value;
                if (selectedDisplayId) {
                    electronAPI.launchCursorWindow(selectedDisplayId);
                    elements.cursorToggleBtn.disabled = true;
                    elements.displaySelect.disabled = true;
                    elements.errorMessageDiv.textContent = '';
                }
            }
        });

        electronAPI.onCursorWindowOpened((): void => {
            elements.cursorToggleBtn.textContent = 'OFF';
            elements.cursorToggleBtn.style.background = '#dc3545';
            elements.cursorToggleBtn.disabled = false;
            elements.displaySelect.disabled = true;
            elements.errorMessageDiv.textContent = '';
        });

        electronAPI.onCursorWindowClosed((): void => {
            elements.errorMessageDiv.textContent = 'Cursor window closed. Ready to launch again.';
            elements.displaySelect.disabled = false;
            elements.cursorToggleBtn.disabled = false;
            elements.cursorToggleBtn.textContent = 'ON';
            elements.cursorToggleBtn.style.background = '#28a745';
        });

        electronAPI.onLaunchError((message: string): void => {
            elements.errorMessageDiv.textContent = `Error: ${message}`;
            elements.cursorToggleBtn.disabled = false;
            elements.displaySelect.disabled = false;
            elements.cursorToggleBtn.textContent = 'ON';
            elements.cursorToggleBtn.style.background = '#28a745';
        });
    };

    mainRenderer.initDisplaySection = initDisplaySection;
})();
