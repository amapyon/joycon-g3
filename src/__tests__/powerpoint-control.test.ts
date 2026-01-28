jest.mock('winax', () => ({
    Object: jest.fn(),
}));

import { getErrorMessage } from '../main/powerpoint-control';

describe('getErrorMessage', (): void => {
    it('Error インスタンスのメッセージを返す', (): void => {
        const error = new Error('boom');
        expect(getErrorMessage(error)).toBe('boom');
    });

    it('Error 以外の値は文字列化する', (): void => {
        expect(getErrorMessage('oops')).toBe('oops');
        expect(getErrorMessage(123)).toBe('123');
        expect(getErrorMessage({ value: 1 })).toBe('[object Object]');
    });
});
