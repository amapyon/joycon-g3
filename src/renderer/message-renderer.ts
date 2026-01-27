{
    interface Window {
        electronAPI: any;
    }

    const messageContent = document.getElementById('messageContent');

    let currentFontSize = parseInt(localStorage.getItem('messageFontSize') || '64');

    /**
     * メッセージのフォントサイズを更新する。
     * @param delta 増減量
     */
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

    let currentOpacity = parseFloat(localStorage.getItem('messageWindowOpacity') || '0.8'); // Initial default opacity
    // Set initial body opacity
    document.body.style.backgroundColor = `rgba(70, 70, 70, ${currentOpacity})`;

    /**
     * 透明度を更新する。
     * @param delta 増減量
     */
    function updateTransparency(delta: number) {
        currentOpacity += delta;
        if (currentOpacity < 0.1) currentOpacity = 0.1; // Minimum transparency
        if (currentOpacity > 1.0) currentOpacity = 1.0; // Maximum transparency

        document.body.style.backgroundColor = `rgba(70, 70, 70, ${currentOpacity})`;
        localStorage.setItem('messageWindowOpacity', String(currentOpacity));
    }

    window.addEventListener('wheel', (e: WheelEvent) => {
        if (e.target === wheelZone || wheelZone?.contains(e.target as Node)) {
            e.preventDefault(); // Prevent default scroll behavior

            if (e.shiftKey) {
                // Adjust transparency
                const delta = e.deltaY < 0 ? 0.05 : -0.05; // Scroll up increases opacity, down decreases
                updateTransparency(delta);
            } else {
                // Adjust font size (existing logic)
                const delta = e.deltaY < 0 ? 5 : -5;
                updateFontSize(delta);
            }
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
