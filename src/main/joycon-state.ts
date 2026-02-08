import { JoyConButtonStateSnapshot } from './joycon-button-utils';

export type ButtonState = JoyConButtonStateSnapshot;

/**
 * Joy-Con ボタン状態の初期値を生成する。
 * @returns 初期化済みボタン状態
 */
export function createInitialButtonState(): ButtonState {
    return {
        slPressed: false,
        srPressed: false,
        downPressed: false,
        leftPressed: false,
        rightPressed: false,
        xPressed: false,
        aPressed: false,
        yPressed: false,
        plusPressed: false,
        minusPressed: false,
        rStickPressed: false,
        homePressed: false,
    };
}
