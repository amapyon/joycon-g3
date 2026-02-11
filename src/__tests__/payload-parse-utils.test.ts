import {
    isCursorId,
    isFiniteNumber,
    isRecord,
    parseNumberArrayPayload,
    parseNumberPayload,
} from '../main/payload-parse-utils';

describe('payload-parse-utils', (): void => {
    describe('isRecord', (): void => {
        it('オブジェクトを true と判定する', (): void => {
            expect(isRecord({ key: 'value' })).toBe(true);
        });

        it('null やプリミティブを false と判定する', (): void => {
            expect(isRecord(null)).toBe(false);
            expect(isRecord('text')).toBe(false);
            expect(isRecord(1)).toBe(false);
        });
    });

    describe('isCursorId', (): void => {
        it('有効なカーソル ID を true と判定する', (): void => {
            expect(isCursorId('cursorLeft')).toBe(true);
            expect(isCursorId('cursorRight')).toBe(true);
        });

        it('無効な ID を false と判定する', (): void => {
            expect(isCursorId('L')).toBe(false);
            expect(isCursorId('')).toBe(false);
        });
    });

    describe('isFiniteNumber', (): void => {
        it('有限数を true と判定する', (): void => {
            expect(isFiniteNumber(0)).toBe(true);
            expect(isFiniteNumber(12.5)).toBe(true);
        });

        it('NaN や Infinity を false と判定する', (): void => {
            expect(isFiniteNumber(Number.NaN)).toBe(false);
            expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false);
            expect(isFiniteNumber(Number.NEGATIVE_INFINITY)).toBe(false);
        });
    });

    describe('parseNumberPayload', (): void => {
        it('有限数を返す', (): void => {
            expect(parseNumberPayload(15)).toBe(15);
        });

        it('不正値を null として返す', (): void => {
            expect(parseNumberPayload('15')).toBeNull();
            expect(parseNumberPayload(Number.NaN)).toBeNull();
        });
    });

    describe('parseNumberArrayPayload', (): void => {
        it('有限数のみの配列を返す', (): void => {
            expect(parseNumberArrayPayload([1, 2, 3])).toEqual([1, 2, 3]);
        });

        it('不正要素を含む配列を null として返す', (): void => {
            expect(parseNumberArrayPayload([1, Number.NaN])).toBeNull();
            expect(parseNumberArrayPayload([1, '2'])).toBeNull();
        });

        it('配列以外を null として返す', (): void => {
            expect(parseNumberArrayPayload({ value: 1 })).toBeNull();
        });
    });
});
