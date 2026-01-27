let screenWidth = 1200;
let screenHeight = 600;

/**
 * 画面サイズを更新する。
 * @param width 画面幅
 * @param height 画面高さ
 */
export function setScreenSize(width: number, height: number) {
    screenWidth = width;
    screenHeight = height;
}

/**
 * 現在の画面サイズを取得する。
 * @returns 画面サイズ
 */
export function getScreenSize() {
    return { width: screenWidth, height: screenHeight };
}
