import { MediaDirectoryStore } from '../../main/media-directory-store';

export type FakeFileSystemState = {
    existingPaths: Set<string>;
    filesByDir: Record<string, string[]>;
    fileKindByPath: Record<string, 'file' | 'dir'>;
    mkdirCalls: string[];
};

export type OpenDialogResult = {
    canceled: boolean;
    filePaths: string[];
};

/**
 * MediaDirectoryStore テスト向けのモック状態を生成する。
 * @returns モック状態
 */
export function createFakeFileSystemState(): FakeFileSystemState {
    return {
        existingPaths: new Set<string>(),
        filesByDir: {},
        fileKindByPath: {},
        mkdirCalls: [],
    };
}

/**
 * モック依存を注入した MediaDirectoryStore を生成する。
 * @param state ファイルシステム状態
 * @param dialogResult ダイアログ結果
 * @param defaultDir 既定ディレクトリ
 * @param forcedDirname dirname の固定戻り値
 * @returns ストア
 */
export function createMediaDirectoryStoreForTest(
    state: FakeFileSystemState,
    dialogResult: OpenDialogResult = { canceled: true, filePaths: [] },
    defaultDir: string = 'C:/app/media',
    forcedDirname?: string,
): MediaDirectoryStore {
    return new MediaDirectoryStore(
        defaultDir,
        {
            existsSync: (targetPath: string): boolean => state.existingPaths.has(targetPath),
            mkdirSync: (targetPath: string): void => {
                state.mkdirCalls.push(targetPath);
                state.existingPaths.add(targetPath);
            },
            readdirSync: (targetPath: string): string[] => state.filesByDir[targetPath] ?? [],
            statSync: (targetPath: string): { isDirectory: () => boolean } => ({
                isDirectory: (): boolean => state.fileKindByPath[targetPath] === 'dir',
            }),
        },
        {
            join: (...parts: string[]): string => parts.join('/'),
            dirname: (targetPath: string): string => forcedDirname ?? targetPath.split('/').slice(0, -1).join('/'),
        },
        {
            showOpenDialog: async (): Promise<OpenDialogResult> => dialogResult,
        },
    );
}
