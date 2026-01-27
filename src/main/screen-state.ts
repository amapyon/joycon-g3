let screenWidth = 1200;
let screenHeight = 600;

export function setScreenSize(width: number, height: number) {
    screenWidth = width;
    screenHeight = height;
}

export function getScreenSize() {
    return { width: screenWidth, height: screenHeight };
}
