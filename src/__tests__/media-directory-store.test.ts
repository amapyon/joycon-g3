import { createFakeFileSystemState, createMediaDirectoryStoreForTest } from './test-utils/media-store-mocks';

describe('メディア保存先ストア', (): void => {
    it('存在しないディレクトリは作成してベースパスを返す', (): void => {
        const fsMock = createFakeFileSystemState();
        const store = createMediaDirectoryStoreForTest(fsMock);

        const basePath = store.getMediaBasePath();

        expect(basePath).toBe('C:/app/media');
        expect(fsMock.mkdirCalls).toEqual(['C:/app/media']);
    });

    it('拡張子で音声ファイルのみを返す', (): void => {
        const fsMock = createFakeFileSystemState();
        fsMock.existingPaths.add('C:/app/media');
        fsMock.filesByDir['C:/app/media'] = ['a.mp3', 'b.wav', 'c.ogg', 'note.txt'];
        fsMock.fileKindByPath['C:/app/media'] = 'dir';
        const store = createMediaDirectoryStoreForTest(fsMock);

        const files = store.getMediaFiles();

        expect(files).toEqual(['a.mp3', 'b.wav', 'c.ogg']);
    });

    it('ファイル選択時は親ディレクトリを保存先にする', async (): Promise<void> => {
        const fsMock = createFakeFileSystemState();
        fsMock.existingPaths.add('C:/picked');
        fsMock.fileKindByPath['C:/picked/notice.mp3'] = 'file';
        const store = createMediaDirectoryStoreForTest(
            fsMock,
            {
                canceled: false,
                filePaths: ['C:/picked/notice.mp3'],
            },
            'C:/app/media',
            'C:/picked',
        );

        const selectedDir = await store.selectMediaFolder();

        expect(selectedDir).toBe('C:/picked');
        expect(store.getMediaBasePath()).toBe('C:/picked');
    });
});
