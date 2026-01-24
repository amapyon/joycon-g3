{
    interface Window {
        electronAPI: any;
    }

    const messageContent = document.getElementById('messageContent');

    let currentFontSize = parseInt(localStorage.getItem('messageFontSize') || '64');

    function updateFontSize(delta: number) {
        currentFontSize += delta;
        if (currentFontSize < 10) currentFontSize = 10;
        if (currentFontSize > 1000) currentFontSize = 1000;
        
        console.log(`[MessageRenderer] Updating font size to: ${currentFontSize}px (delta: ${delta})`);
        
        if (messageContent) {
            messageContent.style.fontSize = `${currentFontSize}px`;
        }
        localStorage.setItem('messageFontSize', String(currentFontSize));
    }

    // Initial font size
    if (messageContent) {
        messageContent.style.fontSize = `${currentFontSize}px`;
    }

    const wheelZone = document.getElementById('wheel-zone');
    window.addEventListener('wheel', (e: WheelEvent) => {
        if (e.target === wheelZone || wheelZone?.contains(e.target as Node)) {
            const delta = e.deltaY < 0 ? 5 : -5;
            updateFontSize(delta);
        }
    });

    (window as any).electronAPI.onUpdateMessageText((text: string) => {
        console.log(`[MessageRenderer] Received text: ${text}`);
        if (messageContent) {
            messageContent.innerHTML = text || '';
        }
    });

    console.log('[MessageRenderer] Initialized.');
}
