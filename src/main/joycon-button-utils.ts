type CursorId = import('../shared/cursor-types').CursorId;

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

export type JoyConButtonEventPayload = { pressed: boolean } | { id: CursorId };

export type JoyConButtonEvent = {
    name: string;
    payload?: JoyConButtonEventPayload;
};

type ButtonEventResult = {
    events: JoyConButtonEvent[];
    nextState: Partial<JoyConButtonStateSnapshot>;
};

type ButtonStateKey = keyof JoyConButtonStateSnapshot;
type ButtonSource = 'button' | 'shared';

type ButtonBinding = {
    key: ButtonStateKey;
    source: ButtonSource;
    mask: number;
};

type ContinuousEventRule = {
    name: string;
    key: ButtonStateKey;
};

type EdgeEventRule = {
    key: ButtonStateKey;
    name: string;
    withCursorId?: boolean;
};

/**
 * ボタンバイトから状態マップを作成する。
 * @param buttonByte ボタンバイト
 * @param sharedButtonByte 共通ボタンバイト
 * @param bindings 解析定義
 * @returns 押下状態マップ
 */
function readPressedStates(
    buttonByte: number,
    sharedButtonByte: number,
    bindings: ButtonBinding[],
): Partial<Record<ButtonStateKey, boolean>> {
    const result: Partial<Record<ButtonStateKey, boolean>> = {};
    bindings.forEach((binding: ButtonBinding): void => {
        const sourceValue = binding.source === 'button' ? buttonByte : sharedButtonByte;
        result[binding.key] = (sourceValue & binding.mask) !== 0;
    });
    return result;
}

/**
 * 連続通知イベントを作成する。
 * @param pressedStates 押下状態マップ
 * @param rules イベント定義
 * @returns イベント配列
 */
function buildContinuousEvents(
    pressedStates: Partial<Record<ButtonStateKey, boolean>>,
    rules: ContinuousEventRule[],
): JoyConButtonEvent[] {
    return rules.map((rule: ContinuousEventRule): JoyConButtonEvent => {
        return { name: rule.name, payload: { pressed: !!pressedStates[rule.key] } };
    });
}

/**
 * 立ち上がりエッジイベントを追加する。
 * @param events 追加先イベント
 * @param pressedStates 押下状態マップ
 * @param lastState 直前状態
 * @param cursorId カーソル ID
 * @param rules イベント定義
 */
function appendEdgeEvents(
    input: {
        events: JoyConButtonEvent[];
        pressedStates: Partial<Record<ButtonStateKey, boolean>>;
        lastState: JoyConButtonStateSnapshot;
        cursorId: CursorId;
        rules: EdgeEventRule[];
    },
): void {
    input.rules.forEach((rule: EdgeEventRule): void => {
        const current = !!input.pressedStates[rule.key];
        const previous = !!input.lastState[rule.key];
        if (current && !previous) {
            input.events.push(rule.withCursorId ? { name: rule.name, payload: { id: input.cursorId } } : { name: rule.name });
        }
    });
}

/**
 * 押下状態マップから次状態を作成する。
 * @param pressedStates 押下状態マップ
 * @returns 次状態
 */
function toNextState(pressedStates: Partial<Record<ButtonStateKey, boolean>>): Partial<JoyConButtonStateSnapshot> {
    const nextState: Partial<JoyConButtonStateSnapshot> = {};
    Object.keys(pressedStates).forEach((key: string): void => {
        const typedKey = key as ButtonStateKey;
        nextState[typedKey] = !!pressedStates[typedKey];
    });
    return nextState;
}

/**
 * 右左共通のボタンイベント構築処理。
 * @param buttonByte ボタンバイト
 * @param sharedButtonByte 共通ボタンバイト
 * @param cursorId カーソル ID
 * @param lastState 直前状態
 * @param bindings 押下解析定義
 * @param continuousRules 連続通知定義
 * @param edgeRules エッジ通知定義
 * @returns 発行イベントと次状態
 */
function buildButtonEvents(
    input: {
        buttonByte: number;
        sharedButtonByte: number;
        cursorId: CursorId;
        lastState: JoyConButtonStateSnapshot;
        bindings: ButtonBinding[];
        continuousRules: ContinuousEventRule[];
        edgeRules: EdgeEventRule[];
    },
): ButtonEventResult {
    const pressedStates = readPressedStates(input.buttonByte, input.sharedButtonByte, input.bindings);
    const events = buildContinuousEvents(pressedStates, input.continuousRules);
    appendEdgeEvents({
        events,
        pressedStates,
        lastState: input.lastState,
        cursorId: input.cursorId,
        rules: input.edgeRules,
    });
    return { events, nextState: toNextState(pressedStates) };
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
    const bindings: ButtonBinding[] = [
        { key: 'downPressed', source: 'button', mask: 0x01 },
        { key: 'leftPressed', source: 'button', mask: 0x08 },
        { key: 'rightPressed', source: 'button', mask: 0x04 },
        { key: 'srPressed', source: 'button', mask: 0x10 },
        { key: 'minusPressed', source: 'shared', mask: 0x01 },
    ];
    const continuousRules: ContinuousEventRule[] = [
        { name: 'button-down', key: 'downPressed' },
        { name: 'button-sr', key: 'srPressed' },
        { name: 'button-minus', key: 'minusPressed' },
    ];
    const edgeRules: EdgeEventRule[] = [
        { key: 'downPressed', name: 'button-down-pressed', withCursorId: true },
        { key: 'leftPressed', name: 'ppt-next' },
        { key: 'rightPressed', name: 'ppt-prev' },
        { key: 'srPressed', name: 'button-sr-pressed', withCursorId: true },
        { key: 'minusPressed', name: 'button-minus-pressed', withCursorId: true },
    ];
    return buildButtonEvents({
        buttonByte,
        sharedButtonByte,
        cursorId,
        lastState,
        bindings,
        continuousRules,
        edgeRules,
    });
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
    const bindings: ButtonBinding[] = [
        { key: 'xPressed', source: 'button', mask: 0x02 },
        { key: 'aPressed', source: 'button', mask: 0x08 },
        { key: 'yPressed', source: 'button', mask: 0x01 },
        { key: 'plusPressed', source: 'shared', mask: 0x02 },
        { key: 'minusPressed', source: 'shared', mask: 0x01 },
        { key: 'rStickPressed', source: 'shared', mask: 0x04 },
        { key: 'srPressed', source: 'button', mask: 0x10 },
        { key: 'homePressed', source: 'shared', mask: 0x10 },
    ];
    const continuousRules: ContinuousEventRule[] = [
        { name: 'button-x', key: 'xPressed' },
        { name: 'button-plus', key: 'plusPressed' },
        { name: 'button-minus', key: 'minusPressed' },
        { name: 'button-sr', key: 'srPressed' },
        { name: 'r-stick', key: 'rStickPressed' },
        { name: 'button-home', key: 'homePressed' },
    ];
    const edgeRules: EdgeEventRule[] = [
        { key: 'xPressed', name: 'button-x-pressed', withCursorId: true },
        { key: 'aPressed', name: 'ppt-next' },
        { key: 'yPressed', name: 'ppt-prev' },
        { key: 'plusPressed', name: 'button-plus-pressed', withCursorId: true },
        { key: 'minusPressed', name: 'button-minus-pressed', withCursorId: true },
        { key: 'srPressed', name: 'button-sr-pressed', withCursorId: true },
        { key: 'rStickPressed', name: 'r-stick-pressed', withCursorId: true },
        { key: 'homePressed', name: 'button-home-pressed', withCursorId: true },
    ];
    return buildButtonEvents({
        buttonByte,
        sharedButtonByte,
        cursorId,
        lastState,
        bindings,
        continuousRules,
        edgeRules,
    });
}
