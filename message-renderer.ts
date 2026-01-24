{
    interface Window {
        electronAPI: any;
    }

    const messageDisplay = document.getElementById('messageDisplay');

    let currentFontSize = parseInt(localStorage.getItem('messageFontSize') || '64');

    function updateFontSize(delta: number) {
        currentFontSize += delta;
        if (currentFontSize < 10) currentFontSize = 10;
        if (currentFontSize > 1000) currentFontSize = 1000;
        
        console.log(`[MessageRenderer] Updating font size to: ${currentFontSize}px (delta: ${delta})`);
        
        if (messageDisplay) {
            messageDisplay.style.fontSize = `${currentFontSize}px`;
        }
        localStorage.setItem('messageFontSize', String(currentFontSize));
    }

    // Initial font size
    if (messageDisplay) {
        messageDisplay.style.fontSize = `${currentFontSize}px`;
    }

    window.addEventListener('wheel', (e: WheelEvent) => {
        // e.preventDefault(); // Might be needed if inside a scrollable
        const delta = e.deltaY < 0 ? 5 : -5;
        updateFontSize(delta);
    });

    (window as any).electronAPI.onUpdateMessageText((text: string) => {
        console.log(`[MessageRenderer] Received text: ${text}`);
        if (messageDisplay) {
            messageDisplay.textContent = text || '';
        }
    });

    const wheelZone = document.getElementById('wheel-zone');

    window.addEventListener('wheel', (e: WheelEvent) => {
        // 全域でもホイールを許可するか、特定のゾーンに限定するか
        // タイマーに合わせてゾーンに限定する場合：
        if (e.target === wheelZone || wheelZone?.contains(e.target as Node)) {
            const delta = e.deltaY < 0 ? 5 : -5;
            updateFontSize(delta);
        }
    });

    (window as any).electronAPI.onUpdateMessageText((text: string) => {
        console.log(`[MessageRenderer] Received text: ${text}`);
        if (messageDisplay) {
            messageDisplay.textContent = text || '';
        }
    });

    console.log('[MessageRenderer] Initialized.');
}
