import { BrowserWindow, dialog } from 'electron';
import fs from 'fs';
import path from 'path';

type DirectoryStat = {
    isDirectory: () => boolean;
};

type FileSystemAdapter = {
    existsSync: (targetPath: string) => boolean;
    mkdirSync: (targetPath: string, options: { recursive: true }) => void;
    readdirSync: (targetPath: string) => string[];
    statSync: (targetPath: string) => DirectoryStat;
};

type PathAdapter = {
    join: (...parts: string[]) => string;
    dirname: (targetPath: string) => string;
};

type OpenDialogResult = {
    canceled: boolean;
    filePaths: string[];
};

type DialogAdapter = {
    showOpenDialog: (owner: BrowserWindow | undefined, options: {
        title: string;
        properties: Array<'openFile' | 'openDirectory'>;
        filters: Array<{ name: string; extensions: string[] }>;
    }) => Promise<OpenDialogResult>;
};

/**
 * メディア保存先の状態と入出力を管理する。
 */
export class MediaDirectoryStore {
    private readonly defaultMediaDir: string;

    private selectedMediaDir: string;

    /**
     * メディア保存先ストアを初期化する。
     * @param initialDir 初期ディレクトリ
     * @param fileSystem ファイルシステム操作
     * @param pathApi パス操作
     * @param dialogApi ダイアログ操作
     */
    public constructor(
        initialDir: string,
        private readonly fileSystem: FileSystemAdapter,
        private readonly pathApi: PathAdapter,
        private readonly dialogApi: DialogAdapter,
    ) {
        this.defaultMediaDir = initialDir;
        this.selectedMediaDir = initialDir;
    }

    /**
     * メディアフォルダーを選択する。
     * @param owner 親ウィンドウ
     * @returns 選択したフォルダーパス（キャンセル時は空文字）
     */
    public async selectMediaFolder(owner?: BrowserWindow): Promise<string> {
        const result = await this.dialogApi.showOpenDialog(owner, {
            title: 'Select Sound Folder or File',
            properties: ['openFile', 'openDirectory'],
            filters: [
                { name: 'Audio', extensions: ['mp3', 'wav', 'ogg'] },
                { name: 'All Files', extensions: ['*'] },
            ],
        });
        if (result.canceled || result.filePaths.length === 0) {
            return '';
        }

        const selectedPath = result.filePaths[0];
        const stats = this.fileSystem.statSync(selectedPath);
        const nextDir = stats.isDirectory() ? selectedPath : this.pathApi.dirname(selectedPath);
        if (!this.fileSystem.existsSync(nextDir)) {
            return '';
        }

        this.selectedMediaDir = nextDir;
        return this.selectedMediaDir;
    }

    /**
     * メディアのベースパスを設定する。
     * @param dir 設定するディレクトリ
     * @returns 設定に成功したかどうか
     */
    public setMediaBasePath(dir: string): boolean {
        if (!dir) {
            return false;
        }
        if (!this.fileSystem.existsSync(dir)) {
            return false;
        }
        this.selectedMediaDir = dir;
        return true;
    }

    /**
     * メディアのベースパスを取得する。
     * @returns ベースパス
     */
    public getMediaBasePath(): string {
        return this.ensureMediaDir(this.selectedMediaDir);
    }

    /**
     * メディアファイル一覧を取得する。
     * @returns メディアファイル名一覧
     */
    public getMediaFiles(): string[] {
        const mediaDir = this.ensureMediaDir(this.selectedMediaDir);
        try {
            const files = this.fileSystem.readdirSync(mediaDir);
            return files.filter((file: string): boolean => /\.(mp3|wav|ogg)$/i.test(file));
        } catch {
            return [];
        }
    }

    /**
     * デフォルト依存を使ったストアを作成する。
     * @returns メディア保存先ストア
     */
    public static createDefault(): MediaDirectoryStore {
        const initialDir = path.join(process.cwd(), 'media');
        return new MediaDirectoryStore(
            initialDir,
            {
                existsSync: (targetPath: string): boolean => fs.existsSync(targetPath),
                mkdirSync: (targetPath: string, options: { recursive: true }): void => {
                    fs.mkdirSync(targetPath, options);
                },
                readdirSync: (targetPath: string): string[] => fs.readdirSync(targetPath),
                statSync: (targetPath: string): DirectoryStat => fs.statSync(targetPath),
            },
            {
                join: (...parts: string[]): string => path.join(...parts),
                dirname: (targetPath: string): string => path.dirname(targetPath),
            },
            {
                showOpenDialog: (
                    owner: BrowserWindow | undefined,
                    options: {
                        title: string;
                        properties: Array<'openFile' | 'openDirectory'>;
                        filters: Array<{ name: string; extensions: string[] }>;
                    },
                ): Promise<OpenDialogResult> => dialog.showOpenDialog(owner, options),
            },
        );
    }

    /**
     * ディレクトリを検証し、必要であれば作成する。
     * @param dir 対象ディレクトリ
     * @returns 利用可能なディレクトリ
     */
    private ensureMediaDir(dir: string): string {
        const targetDir = dir || this.defaultMediaDir;
        if (!this.fileSystem.existsSync(targetDir)) {
            try {
                this.fileSystem.mkdirSync(targetDir, { recursive: true });
            } catch {
                return this.defaultMediaDir;
            }
        }
        return targetDir;
    }
}
