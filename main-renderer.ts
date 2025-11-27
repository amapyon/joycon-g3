// main-renderer.ts
// TypeScript化: DOM型・window.electronAPI型を明示

interface Window {
    electronAPI: any;
}

const displaySelect = document.getElementById('display-select') as HTMLSelectElement;
const launchButton = document.getElementById('launch-button') as HTMLButtonElement;
const closeButton = document.getElementById('close-button') as HTMLButtonElement;
const errorMessageDiv = document.getElementById('error-message') as HTMLElement;
const mainStatusLeft = document.getElementById('main-status-left') as HTMLElement;
const mainStatusRight = document.getElementById('main-status-right') as HTMLElement;
const mainBatteryStatusLeft = document.getElementById('main-battery-status-left') as HTMLElement;
const mainBatteryStatusRight = document.getElementById('main-battery-status-right') as HTMLElement;
const pptSelect = document.getElementById('ppt-select') as HTMLSelectElement;
const calibrateButton = document.getElementById('calibrate-button') as HTMLButtonElement;
const calibrationStatus = document.getElementById('calibration-status') as HTMLElement;
const countdownInitialValueInput = document.getElementById('countdown-initial-value') as HTMLInputElement; // New

// PowerPointプレゼンテーションをロードしてUIを更新する関数
async function loadPowerPointPresentations() {
    pptSelect.innerHTML = '<option value="">-- Loading Presentations --</option>';
    pptSelect.disabled = true;
    try {
        const presentations = await window.electronAPI.getOpenPowerPointPresentations();
        pptSelect.innerHTML = ''; // Clear loading message
        if (presentations && presentations.length > 0) {
            presentations.forEach((ppt: { id: string; name: string; isRunning: boolean }) => {
                const option = document.createElement('option');
                option.value = ppt.id;
                option.text = ppt.name + (ppt.isRunning ? ' (Running)' : '');
                pptSelect.appendChild(option);
            });
            pptSelect.disabled = false;
            // 最初のプレゼンテーションを自動選択し、ターゲットとして設定
            if (presentations.length > 0) {
                pptSelect.value = presentations[0].id;
                window.electronAPI.setTargetPresentation(presentations[0].id);
            }
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.text = '-- No Presentations Found --';
            pptSelect.appendChild(option);
            pptSelect.disabled = true;
        }
    } catch (error) {
        console.error('Failed to load PowerPoint presentations:', error);
        const option = document.createElement('option');
        option.value = '';
        option.text = '-- Error Loading Presentations --';
        pptSelect.appendChild(option);
        pptSelect.disabled = true;
    }
}

window.electronAPI.onAvailableDisplays((displays: any[]) => {
    console.log('Available displays:', displays);
    displaySelect.innerHTML = '';
    if (displays && displays.length > 0) {
        displays.forEach((display) => {
            const option = document.createElement('option');
            option.value = display.id;
            // 物理ピクセルで表示
            const physicalWidth = display.size.width * (display.scaleFactor || 1);
            const physicalHeight = display.size.height * (display.scaleFactor || 1);
            option.text = (display.label || 'Display') + ' [' + physicalWidth + 'x' + physicalHeight + ' - ' + display.id + ']';
            displaySelect.appendChild(option);
        });
        displaySelect.disabled = false;
        launchButton.disabled = false;
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.text = '-- No Displays Found --';
        displaySelect.appendChild(option);
        displaySelect.disabled = true;
        launchButton.disabled = true;
    }
    closeButton.style.display = 'none';
});

// onAvailablePresentationsはメインプロセスからのプッシュ通知用として残しておく
window.electronAPI.onAvailablePresentations((presentations: any[]) => {
    console.log('Received updated available presentations:', presentations);
    // ここではUIを直接更新せず、loadPowerPointPresentationsを呼び出すことで一貫性を保つ
    loadPowerPointPresentations();
});

pptSelect.addEventListener('change', () => {
    const selectedId = pptSelect.value;
    if (selectedId) {
        window.electronAPI.setTargetPresentation(selectedId);
    }
});

launchButton.addEventListener('click', () => {
    const selectedDisplayId = displaySelect.value;
    if (selectedDisplayId) {
        window.electronAPI.launchCursorWindow(selectedDisplayId);
        launchButton.disabled = true;
        displaySelect.disabled = true;
        closeButton.style.display = '';
        errorMessageDiv.textContent = '';
    }
});

closeButton.addEventListener('click', () => {
    errorMessageDiv.textContent = 'Closing cursor window...';
    window.electronAPI.closeCursorWindow();
});

window.electronAPI.onCursorWindowClosed(() => {
    errorMessageDiv.textContent = 'Cursor window closed. Select a display to launch again.';
    displaySelect.disabled = false;
    launchButton.disabled = false;
    closeButton.style.display = 'none';
});

window.electronAPI.onLaunchError((message: string) => {
    errorMessageDiv.textContent = `Error launching cursor window: ${message}`;
    launchButton.disabled = false;
    displaySelect.disabled = false;
    closeButton.style.display = 'none';
});

window.electronAPI.onJoyConStatusUpdate((status: { leftConnected: boolean; rightConnected: boolean }) => {
    console.log('JoyCon status:', status);
    if (mainStatusLeft) {
        mainStatusLeft.textContent = status.leftConnected ? 'Left: Connected' : 'Left: Disconnected';
        mainStatusLeft.className = status.leftConnected ? 'connected' : 'disconnected';
    }
    if (mainStatusRight) {
        mainStatusRight.textContent = status.rightConnected ? 'Right: Connected' : 'Right: Disconnected';
        mainStatusRight.className = status.rightConnected ? 'connected' : 'disconnected';
    }
});

window.electronAPI.onJoyConBatteryStatusUpdate(({ isLeft, level }: { isLeft: boolean; level: number }) => {
    if (isLeft) {
        mainBatteryStatusLeft.textContent = `${level}/8`;
    } else {
        mainBatteryStatusRight.textContent = `${level}/8`;
    }
});

calibrateButton.addEventListener('click', () => {
    calibrationStatus.textContent = 'Calibrating... Keep Joy-Cons still!';
    calibrateButton.disabled = true;
    window.electronAPI.startCalibration();
});

window.electronAPI.onCalibrationStatusUpdate((statusInfo: { id: string; status: string }) => {
    let message = `Calibration ${statusInfo.status}.`;
    if (statusInfo.status === 'complete') {
        message = 'Calibration complete!';
        calibrateButton.disabled = false;
    } else if (statusInfo.status === 'failed') {
        message = 'Calibration failed.';
        calibrateButton.disabled = false;
    }
    calibrationStatus.textContent = message;
});

// Add event listener for countdown initial value input
countdownInitialValueInput.addEventListener('change', () => {
    const value = parseInt(countdownInitialValueInput.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 3600) {
        console.log(`[main-renderer] Sending countdown initial value: ${value}`); // ADDED LOG
        window.electronAPI.sendCountdownInitialValue(value);
    } else {
        // Optionally, reset to a default or show an error
        countdownInitialValueInput.value = '10';
        console.log(`[main-renderer] Invalid countdown value, sending default: 10`); // ADDED LOG
        window.electronAPI.sendCountdownInitialValue(10);
    }
});

launchButton.disabled = true;
closeButton.style.display = 'none';
pptSelect.disabled = true;

console.log('Main Renderer script loaded.');
window.electronAPI.requestJoyConStatus();
loadPowerPointPresentations(); // 初期ロード時にPowerPointプレゼンテーションを読み込む
