// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const fileUrlUtils = require('../renderer/file-url-utils') as {
    toFileUrl: (path: string) => string;
    toPlayableMediaUrl: (path: string) => string;
};

describe('URL変換ユーティリティ', (): void => {
    it('toFileUrlがfile URLを生成する', (): void => {
        expect(fileUrlUtils.toFileUrl('C:/media/a.mp3')).toBe('file://C:/media/a.mp3');
        expect(fileUrlUtils.toFileUrl('file://C:/media/a.mp3')).toBe('file://C:/media/a.mp3');
        expect(fileUrlUtils.toFileUrl('')).toBe('');
    });

    it('toPlayableMediaUrlが再生用URLを生成する', (): void => {
        expect(fileUrlUtils.toPlayableMediaUrl('C:\\media\\a.mp3')).toBe('file://C:/media/a.mp3');
        expect(fileUrlUtils.toPlayableMediaUrl('file://C:/media/a.mp3')).toBe('file://C:/media/a.mp3');
        expect(fileUrlUtils.toPlayableMediaUrl('https://example.com/a.mp3')).toBe('https://example.com/a.mp3');
    });
});
