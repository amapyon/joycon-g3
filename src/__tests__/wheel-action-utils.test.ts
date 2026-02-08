// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const wheelActionUtils = require('../renderer/wheel-action-utils') as {
    resolveWheelAction: (deltaY: number, shiftKey: boolean) => { kind: 'fontSize' | 'opacity'; delta: number };
};

describe('ホイール操作ユーティリティ', (): void => {
    it('ホイール操作の種別と増減量を判定する', (): void => {
        expect(wheelActionUtils.resolveWheelAction(-1, false)).toEqual({ kind: 'fontSize', delta: 5 });
        expect(wheelActionUtils.resolveWheelAction(1, false)).toEqual({ kind: 'fontSize', delta: -5 });
        expect(wheelActionUtils.resolveWheelAction(-1, true)).toEqual({ kind: 'opacity', delta: 0.05 });
        expect(wheelActionUtils.resolveWheelAction(1, true)).toEqual({ kind: 'opacity', delta: -0.05 });
    });
});
