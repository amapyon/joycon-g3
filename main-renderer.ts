// main-renderer.ts
// TypeScript化: DOM型・window.electronAPI型を明示

export {};

declare global {
    interface Window {
        electronAPI: any;
    }
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

window.electronAPI.onAvailableDisplays((displays: any[]) => {
    displaySelect.innerHTML = '';
    if (displays && displays.length > 0) {
        displays.forEach((display) => {
            const option = document.createElement('option');
            option.value = display.id;
            option.text = display.id + ': ' + (display.name || 'Display');
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

window.electronAPI.onAvailablePresentations((presentations: any[]) => {
    pptSelect.innerHTML = '';
    if (presentations && presentations.length > 0) {
        presentations.forEach((ppt) => {
            const option = document.createElement('option');
            option.value = ppt.id;
            option.text = ppt.name + (ppt.isRunning ? ' (Running)' : '');
            pptSelect.appendChild(option);
        });
        pptSelect.disabled = false;
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.text = '-- No Presentations --';
        pptSelect.appendChild(option);
        pptSelect.disabled = true;
    }
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

launchButton.disabled = true;
closeButton.style.display = 'none';
pptSelect.disabled = true;

console.log('Main Renderer script loaded.');
