export {};

declare global {
    interface Window {
        electronAPI: any;
    }
}

// cursor-renderer.ts
// Joy-Con姿勢データでカーソルを制御するレンダラースクリプト (TypeScript版)

interface CursorMap {
    xFrom: 'roll' | 'pitch' | 'yaw';
    yFrom: 'roll' | 'pitch' | 'yaw';
    xSign: number;
    ySign: number;
}

interface CursorData {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    sensitivityX: number;
    sensitivityY: number;
    smoothing: number;
    map: CursorMap;
    isVisible: boolean;
}

const cursorElements: Record<'cursor1' | 'cursor2', HTMLElement | null> = {
    cursor1: document.getElementById('cursor1'),
    cursor2: document.getElementById('cursor2'),
};

let windowWidth: number = window.innerWidth;
let windowHeight: number = window.innerHeight;

const defaultSensitivityX = 36;
const defaultSensitivityY = 36;
const defaultSmoothingFactor = 0.7;

const cursors: Record<'cursor1' | 'cursor2', CursorData> = {
    cursor1: {
        x: windowWidth / 2 || 100,
        y: windowHeight / 2 || 100,
        targetX: windowWidth / 2 || 100,
        targetY: windowHeight / 2 || 100,
        sensitivityX: defaultSensitivityX,
        sensitivityY: defaultSensitivityY,
        smoothing: defaultSmoothingFactor,
        map: { xFrom: 'roll', yFrom: 'pitch', xSign: -1, ySign: -1 },
        isVisible: false,
    },
    cursor2: {
        x: windowWidth / 2 || 100,
        y: windowHeight / 2 || 100,
        targetX: windowWidth / 2 || 100,
        targetY: windowHeight / 2 || 100,
        sensitivityX: defaultSensitivityX,
        sensitivityY: defaultSensitivityY,
        smoothing: defaultSmoothingFactor,
        map: { xFrom: 'roll', yFrom: 'pitch', xSign: 1, ySign: -1 },
        isVisible: false,
    },
};

function resetCursor(cursorId: 'cursor1' | 'cursor2') {
    const cursorData = cursors[cursorId];
    if (!cursorData) {
        console.error(`[${cursorId}] Cannot reset cursor: cursorData is null.`);
        return;
    }
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;
    if (
        typeof windowWidth !== 'number' ||
        typeof windowHeight !== 'number' ||
        Number.isNaN(windowWidth) ||
        Number.isNaN(windowHeight) ||
        windowWidth <= 0 ||
        windowHeight <= 0
    ) {
        console.error(`[${cursorId}] Cannot reset cursor: Invalid window dimensions! w=${windowWidth}, h=${windowHeight}. Using default position.`);
        cursorData.x = 100;
        cursorData.y = 100;
        cursorData.targetX = 100;
        cursorData.targetY = 100;
    } else {
        cursorData.x = centerX;
        cursorData.y = centerY;
        cursorData.targetX = centerX;
        cursorData.targetY = centerY;
    }
    if (Number.isNaN(cursorData.x) || Number.isNaN(cursorData.y)) {
        console.error(`[${cursorId}] NaN DETECTED after reset! x=${cursorData.x}, y=${cursorData.y}. Setting to default.`);
        cursorData.x = 100;
        cursorData.y = 100;
    }
    updateCursorElementPosition(cursorId);
}

function updateCursorElementPosition(cursorId: 'cursor1' | 'cursor2') {
    const cursorData = cursors[cursorId];
    const element = cursorElements[cursorId];
    if (element && cursorData && !Number.isNaN(cursorData.x) && !Number.isNaN(cursorData.y)) {
        const halfWidth = element.offsetWidth / 2;
        const halfHeight = element.offsetHeight / 2;
        if (!Number.isNaN(halfWidth) && !Number.isNaN(halfHeight) && halfWidth >= 0 && halfHeight >= 0) {
            element.style.left = `${cursorData.x - halfWidth}px`;
            element.style.top = `${cursorData.y - halfHeight}px`;
        } else {
            console.warn(`[${cursorId}] Invalid element dimensions.`);
        }
    } else {
        console.warn(`[${cursorId}] Skipping pos update.`);
    }
}

window.electronAPI.onJoyConAttitude((data: { id: 'cursor1' | 'cursor2'; roll: number; pitch: number; yaw?: number }) => {
    const cursorId = data.id;
    const cursorData = cursors[cursorId];
    if (!cursorData) return;
    const roll = data.roll;
    const pitch = data.pitch;
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;
    const sensitivityX = cursorData.sensitivityX;
    const sensitivityY = cursorData.sensitivityY;
    const mapping = cursorData.map;
    let targetX = centerX;
    let targetY = centerY;
    if (mapping.xFrom === 'roll') {
        targetX = centerX + roll * sensitivityX * mapping.xSign;
    } else if (mapping.xFrom === 'pitch') {
        targetX = centerX + pitch * sensitivityX * mapping.xSign;
    }
    if (mapping.yFrom === 'roll') {
        targetY = centerY + roll * sensitivityY * mapping.ySign;
    } else if (mapping.yFrom === 'pitch') {
        targetY = centerY + pitch * sensitivityY * mapping.ySign;
    }
    cursorData.targetX = targetX;
    cursorData.targetY = targetY;
});

window.electronAPI.onJoyConButtonX((data: { pressed: boolean }) => {
    const el = cursorElements.cursor2;
    const cd = cursors.cursor2;
    if (!el || !cd) return;
    cd.isVisible = data.pressed;
    el.style.visibility = cd.isVisible ? 'visible' : 'hidden';
});

window.electronAPI.onJoyConButtonDown((data: { pressed: boolean }) => {
    const el = cursorElements.cursor1;
    const cd = cursors.cursor1;
    if (!el || !cd) return;
    cd.isVisible = data.pressed;
    el.style.visibility = cd.isVisible ? 'visible' : 'hidden';
});

window.electronAPI.onJoyConButtonXPressed((data: { id: 'cursor1' | 'cursor2' }) => {
    console.log(`X Button press trigger for ${data.id}. Resetting.`);
    resetCursor(data.id);
});

window.electronAPI.onJoyConButtonDownPressed((data: { id: 'cursor1' | 'cursor2' }) => {
    console.log(`Down Button press trigger for ${data.id}. Resetting.`);
    resetCursor(data.id);
});

window.addEventListener('resize', () => {
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    console.log(`Cursor window resized to: ${windowWidth}x${windowHeight}`);
    resetCursor('cursor1');
    resetCursor('cursor2');
});

function renderLoop() {
    if (typeof windowWidth !== 'number' || typeof windowHeight !== 'number' || windowWidth <= 0 || windowHeight <= 0) {
        windowWidth = window.innerWidth;
        windowHeight = window.innerHeight;
        requestAnimationFrame(renderLoop);
        return;
    }
    for (const id in cursors) {
        const cursorData = cursors[id as 'cursor1' | 'cursor2'];
        const element = cursorElements[id as 'cursor1' | 'cursor2'];
        if (element && cursorData.isVisible) {
            const smoothing = cursorData.smoothing || 0.1;
            cursorData.x += (cursorData.targetX - cursorData.x) * smoothing;
            cursorData.y += (cursorData.targetY - cursorData.y) * smoothing;
            const halfWidth = element.offsetWidth / 2;
            const halfHeight = element.offsetHeight / 2;
            if (!Number.isNaN(halfWidth) && !Number.isNaN(halfHeight) && halfWidth >= 0 && halfHeight >= 0) {
                if (!Number.isNaN(cursorData.x) && !Number.isNaN(cursorData.y)) {
                    cursorData.x = Math.max(halfWidth, Math.min(windowWidth - halfWidth, cursorData.x));
                    cursorData.y = Math.max(halfHeight, Math.min(windowHeight - halfHeight, cursorData.y));
                    updateCursorElementPosition(id as 'cursor1' | 'cursor2');
                } else {
                    console.error(`[${id}] Skipping pos update due to NaN coord.`);
                }
            }
        }
    }
    requestAnimationFrame(renderLoop);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded.');
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    if (windowWidth > 0 && windowHeight > 0) {
        resetCursor('cursor1');
        resetCursor('cursor2');
    } else {
        console.warn('Initial window dimensions invalid. Retrying reset later.');
    }
    if (cursorElements.cursor1) {
        cursorElements.cursor1.style.visibility = 'hidden';
    }
    if (cursorElements.cursor2) {
        cursorElements.cursor2.style.visibility = 'hidden';
    }
    requestAnimationFrame(renderLoop);
    console.log('Cursor Renderer script initialized for attitude control.');
});
