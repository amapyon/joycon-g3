export type WheelAction = { kind: 'opacity'; delta: number } | { kind: 'fontSize'; delta: number };

export type WheelActionUtilsApi = {
    resolveWheelAction: (deltaY: number, shiftKey: boolean) => WheelAction;
};
