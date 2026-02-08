type CursorId = 'cursorLeft' | 'cursorRight';

export type JoyConButtonStateSnapshot = {
    slPressed: boolean;
    srPressed: boolean;
    downPressed: boolean;
    leftPressed: boolean;
    rightPressed: boolean;
    xPressed: boolean;
    aPressed: boolean;
    yPressed: boolean;
    plusPressed: boolean;
    minusPressed: boolean;
    rStickPressed: boolean;
    homePressed: boolean;
};

type ButtonEvent = {
    name: string;
    payload?: Record<string, unknown>;
};

type ButtonEventResult = {
    events: ButtonEvent[];
    nextState: Partial<JoyConButtonStateSnapshot>;
};

/**
 * 立ち上がりエッジ時のみイベントを追加する。
 * @param events 追加先イベント配列
 * @param current 現在状態
 * @param previous 直前状態
 * @param event 追加するイベント
 */
function pushEdgeEvent(
    events: ButtonEvent[],
    current: boolean,
    previous: boolean,
    event: ButtonEvent,
): void {
    if (current && !previous) {
        events.push(event);
    }
}

/**
 * 左 Joy-Con のボタン入力からイベントと次状態を作成する。
 * @param buttonByte 左 Joy-Con ボタンバイト
 * @param sharedButtonByte 共通ボタンバイト
 * @param cursorId カーソル ID
 * @param lastState 直前のボタン状態
 * @returns 発行イベントと次状態
 */
export function buildLeftButtonEvents(
    buttonByte: number,
    sharedButtonByte: number,
    cursorId: CursorId,
    lastState: JoyConButtonStateSnapshot,
): ButtonEventResult {
    const DOWN_BUTTON_MASK = 0x01;
    const LEFT_BUTTON_MASK = 0x08;
    const RIGHT_BUTTON_MASK = 0x04;
    const SR_BUTTON_MASK = 0x10;
    const MINUS_BUTTON_MASK = 0x01;
    const currentDownPressed = (buttonByte & DOWN_BUTTON_MASK) !== 0;
    const currentLeftPressed = (buttonByte & LEFT_BUTTON_MASK) !== 0;
    const currentRightPressed = (buttonByte & RIGHT_BUTTON_MASK) !== 0;
    const currentSrPressed = (buttonByte & SR_BUTTON_MASK) !== 0;
    const currentMinusPressed = (sharedButtonByte & MINUS_BUTTON_MASK) !== 0;

    const events: ButtonEvent[] = [
        { name: 'button-down', payload: { pressed: currentDownPressed } },
        { name: 'button-sr', payload: { pressed: currentSrPressed } },
        { name: 'button-minus', payload: { pressed: currentMinusPressed } },
    ];

    pushEdgeEvent(events, currentDownPressed, lastState.downPressed, { name: 'button-down-pressed', payload: { id: cursorId } });
    pushEdgeEvent(events, currentLeftPressed, lastState.leftPressed, { name: 'ppt-next' });
    pushEdgeEvent(events, currentRightPressed, lastState.rightPressed, { name: 'ppt-prev' });
    pushEdgeEvent(events, currentSrPressed, lastState.srPressed, { name: 'button-sr-pressed', payload: { id: cursorId } });
    pushEdgeEvent(events, currentMinusPressed, lastState.minusPressed, { name: 'button-minus-pressed', payload: { id: cursorId } });

    return {
        events,
        nextState: {
            downPressed: currentDownPressed,
            leftPressed: currentLeftPressed,
            rightPressed: currentRightPressed,
            srPressed: currentSrPressed,
            minusPressed: currentMinusPressed,
        },
    };
}

/**
 * 右 Joy-Con のボタン入力からイベントと次状態を作成する。
 * @param buttonByte 右 Joy-Con ボタンバイト
 * @param sharedButtonByte 共通ボタンバイト
 * @param cursorId カーソル ID
 * @param lastState 直前のボタン状態
 * @returns 発行イベントと次状態
 */
export function buildRightButtonEvents(
    buttonByte: number,
    sharedButtonByte: number,
    cursorId: CursorId,
    lastState: JoyConButtonStateSnapshot,
): ButtonEventResult {
    const X_BUTTON_MASK = 0x02;
    const A_BUTTON_MASK = 0x08;
    const Y_BUTTON_MASK = 0x01;
    const PLUS_BUTTON_MASK = 0x02;
    const MINUS_BUTTON_MASK = 0x01;
    const R_STICK_BUTTON_MASK = 0x04;
    const SR_BUTTON_MASK = 0x10;
    const HOME_BUTTON_MASK = 0x10;

    const currentXPressed = (buttonByte & X_BUTTON_MASK) !== 0;
    const currentAPressed = (buttonByte & A_BUTTON_MASK) !== 0;
    const currentYPressed = (buttonByte & Y_BUTTON_MASK) !== 0;
    const currentPlusPressed = (sharedButtonByte & PLUS_BUTTON_MASK) !== 0;
    const currentMinusPressed = (sharedButtonByte & MINUS_BUTTON_MASK) !== 0;
    const currentRStickPressed = (sharedButtonByte & R_STICK_BUTTON_MASK) !== 0;
    const currentSrPressed = (buttonByte & SR_BUTTON_MASK) !== 0;
    const currentHomePressed = (sharedButtonByte & HOME_BUTTON_MASK) !== 0;

    const events: ButtonEvent[] = [
        { name: 'button-x', payload: { pressed: currentXPressed } },
        { name: 'button-plus', payload: { pressed: currentPlusPressed } },
        { name: 'button-minus', payload: { pressed: currentMinusPressed } },
        { name: 'button-sr', payload: { pressed: currentSrPressed } },
        { name: 'r-stick', payload: { pressed: currentRStickPressed } },
        { name: 'button-home', payload: { pressed: currentHomePressed } },
    ];

    pushEdgeEvent(events, currentXPressed, lastState.xPressed, { name: 'button-x-pressed', payload: { id: cursorId } });
    pushEdgeEvent(events, currentAPressed, lastState.aPressed, { name: 'ppt-next' });
    pushEdgeEvent(events, currentYPressed, lastState.yPressed, { name: 'ppt-prev' });
    pushEdgeEvent(events, currentPlusPressed, lastState.plusPressed, { name: 'button-plus-pressed', payload: { id: cursorId } });
    pushEdgeEvent(events, currentMinusPressed, lastState.minusPressed, { name: 'button-minus-pressed', payload: { id: cursorId } });
    pushEdgeEvent(events, currentSrPressed, lastState.srPressed, { name: 'button-sr-pressed', payload: { id: cursorId } });
    pushEdgeEvent(events, currentRStickPressed, lastState.rStickPressed, { name: 'r-stick-pressed', payload: { id: cursorId } });
    pushEdgeEvent(events, currentHomePressed, lastState.homePressed, { name: 'button-home-pressed', payload: { id: cursorId } });

    return {
        events,
        nextState: {
            xPressed: currentXPressed,
            aPressed: currentAPressed,
            yPressed: currentYPressed,
            plusPressed: currentPlusPressed,
            minusPressed: currentMinusPressed,
            srPressed: currentSrPressed,
            rStickPressed: currentRStickPressed,
            homePressed: currentHomePressed,
        },
    };
}
