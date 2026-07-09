((): void => {
    type MainRendererAccessApi = import('../../shared/main-renderer-types').MainRendererAccessApi;
    type MainWindowApiAccessorApi = import('../../shared/main-window-api-types').MainWindowApiAccessorApi;
    type LocalStorageStoreApi = import('../../shared/local-storage-store-types').LocalStorageStoreApi;
    type StorageKeys = typeof import('../../shared/storage-keys').storageKeys;
    const storageKeys = (globalThis as typeof globalThis & { storageKeys?: StorageKeys }).storageKeys;
    if (!storageKeys) {
        throw new Error('storageKeys is not available');
    }

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
    /**
     * contenteditable の末尾に付与される改行タグを除去する。
     * @param html 入力HTML
     * @returns 整形後のHTML
     */
    const normalizeMessageHtml = (html: string): string => {
        return html.replace(/<br\s*\/?>$/i, '');
    };

    /**
     * 選択範囲の文字色を適用する。
     * @param input 対象入力欄
     * @param color 色コード
     * @returns なし
     */
    const applyColorToMessageInput = (input: HTMLDivElement, color: string): void => {
        input.focus();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            document.execCommand('foreColor', false, color);
        } else {
            document.execCommand('selectAll', false);
            document.execCommand('foreColor', false, color);
        }
        input.dispatchEvent(new Event('input'));
    };

    /**
     * メッセージ入力セクションを初期化する。
     * @returns なし
     */
    const initMessageSection = (): void => {
        const isAlwaysOnTop = localStorageStore.getString(storageKeys.messageAlwaysOnTop, '1') !== '0';
        const storedMessageHtml = localStorageStore.getString(storageKeys.messageHtml, '');
        elements.messageInput.innerHTML = storedMessageHtml;
        elements.messageAlwaysOnTopInput.checked = isAlwaysOnTop;
        electronAPI.setMessageAlwaysOnTop(isAlwaysOnTop);
        electronAPI.sendMessageText(storedMessageHtml);

        elements.messageInput.addEventListener('input', (): void => {
            const text = normalizeMessageHtml(elements.messageInput.innerHTML);
            localStorageStore.setString(storageKeys.messageHtml, text);
            electronAPI.sendMessageText(text);
        });

        elements.toggleMessageButton.addEventListener('click', (): void => {
            electronAPI.toggleMessageWindow();
        });

        elements.messageAlwaysOnTopInput.addEventListener('change', (): void => {
            const alwaysOnTop = elements.messageAlwaysOnTopInput.checked;
            localStorageStore.setString(storageKeys.messageAlwaysOnTop, alwaysOnTop ? '1' : '0');
            electronAPI.setMessageAlwaysOnTop(alwaysOnTop);
        });

        elements.messageInput.addEventListener('contextmenu', (e: MouseEvent): void => {
            e.preventDefault();
            elements.colorContextMenu.style.display = 'block';
            elements.colorContextMenu.style.left = `${e.clientX}px`;
            elements.colorContextMenu.style.top = `${e.clientY}px`;
        });

        window.addEventListener('click', (e: MouseEvent): void => {
            const target = e.target as Node | null;
            if (target && !elements.colorContextMenu.contains(target)) {
                elements.colorContextMenu.style.display = 'none';
            }
        });

        const swatches = document.querySelectorAll('.color-swatch') as NodeListOf<HTMLElement>;
        swatches.forEach((swatch: HTMLElement): void => {
            swatch.addEventListener('mousedown', (e: MouseEvent): void => {
                e.preventDefault();
                const color = swatch.dataset.color;
                if (color) {
                    applyColorToMessageInput(elements.messageInput, color);
                }
                elements.colorContextMenu.style.display = 'none';
            });
        });

        const styleButtons = document.querySelectorAll('.style-btn') as NodeListOf<HTMLButtonElement>;
        styleButtons.forEach((btn: HTMLButtonElement): void => {
            btn.addEventListener('mousedown', (e: MouseEvent): void => {
                e.preventDefault();
                const cmd = btn.dataset.cmd;
                if (cmd) {
                    elements.messageInput.focus();
                    document.execCommand(cmd, false);
                    elements.messageInput.dispatchEvent(new Event('input'));
                }
                elements.colorContextMenu.style.display = 'none';
            });
        });
    };

    mainRenderer.initMessageSection = initMessageSection;
})();
