import { readFileSync } from 'fs';
import * as path from 'path';
import { runInNewContext } from 'vm';

type PackageOptions = { ignore: RegExp[] };
type PackageApi = {
    replacePackagedApp: (directory: string) => void;
    packageToNextOutput: () => Promise<string>;
    resolveInsideRoot: (directory: string) => string;
};

/**
 * 実ファイルを変更せず、配布用アプリ更新を検証する環境を作る。
 * @returns 仮想ファイルとパッケージ処理
 */
function createPackageEnvironment(): {
    api: PackageApi;
    files: Set<string>;
    fs: { renameSync: jest.Mock; rmSync: jest.Mock; statSync: jest.Mock };
    packager: jest.Mock;
    root: string;
    source: string;
    output: string;
    backup: string;
    } {
    const root = path.resolve(__dirname, '../..');
    const source = path.join(root, 'dist_packager_next', 'JoyCon Clicker-win32-x64');
    const output = path.join(root, 'dist_packager', 'JoyCon Clicker-win32-x64');
    const backup = `${output}.backup`;
    const files = new Set<string>([
        source, path.join(source, 'JoyCon Clicker.exe'), path.join(source, 'new.dll'),
        output, path.join(output, 'JoyCon Clicker.exe'), path.join(output, 'obsolete.dll'),
        path.join(root, 'dist_packager', 'keep.txt'),
    ]);
    const fs = {
        existsSync: (target: string): boolean => files.has(target),
        statSync: jest.fn((target: string) => ({ isFile: (): boolean => path.extname(target) !== '' })),
        mkdirSync: jest.fn(),
        renameSync: jest.fn((from: string, to: string): void => {
            if (!files.has(from) || files.has(to)) throw new Error('移動できません');
            const moved = [...files].filter((value: string): boolean => value === from || value.startsWith(`${from}${path.sep}`));
            for (const value of moved) {
                files.delete(value);
                files.add(to + value.slice(from.length));
            }
        }),
        rmSync: jest.fn((target: string): void => {
            for (const value of [...files]) {
                if (value === target || value.startsWith(`${target}${path.sep}`)) files.delete(value);
            }
        }),
    };
    const packager = jest.fn(async (): Promise<string[]> => [source]);
    const moduleObject = { exports: {} as PackageApi };
    runInNewContext(readFileSync(path.join(root, 'scripts/package-win.js'), 'utf8'), {
        __dirname: path.join(root, 'scripts'), module: moduleObject,
        require: (name: string): unknown => {
            if (name === 'fs') return fs;
            if (name === 'path') return path;
            if (name === 'electron-packager') return packager;
            throw new Error(`想定外の依存: ${name}`);
        },
    });
    return { api: moduleObject.exports, files, fs, packager, root, source, output, backup };
}

describe('Windows配布用アプリの安全な更新', (): void => {
    it('旧ファイルを残さず新アプリへ切り替え、無関係な出力は保持する', (): void => {
        const env = createPackageEnvironment();
        env.api.replacePackagedApp(env.source);
        expect(env.files.has(path.join(env.output, 'new.dll'))).toBe(true);
        expect(env.files.has(path.join(env.output, 'obsolete.dll'))).toBe(false);
        expect(env.files.has(path.join(env.root, 'dist_packager', 'keep.txt'))).toBe(true);
        expect(env.files.has(env.backup)).toBe(false);
    });

    it('旧アプリがない初回も更新できる', (): void => {
        const env = createPackageEnvironment();
        env.fs.rmSync(env.output);
        env.api.replacePackagedApp(env.source);
        expect(env.files.has(path.join(env.output, 'new.dll'))).toBe(true);
        expect(env.files.has(env.backup)).toBe(false);
    });

    it('切り替えに失敗した場合は旧アプリを復元して新アプリを残す', (): void => {
        const env = createPackageEnvironment();
        const rename = env.fs.renameSync.getMockImplementation();
        env.fs.renameSync.mockImplementation((from: string, to: string): void => {
            if (from === env.source) throw new Error('切り替え失敗');
            rename?.(from, to);
        });
        expect(() => env.api.replacePackagedApp(env.source)).toThrow('切り替え失敗');
        expect(env.files.has(path.join(env.output, 'obsolete.dll'))).toBe(true);
        expect(env.files.has(path.join(env.source, 'new.dll'))).toBe(true);
        expect(env.files.has(env.backup)).toBe(false);
    });

    it('切り替え後の検査に失敗した場合も旧アプリへ戻す', (): void => {
        const env = createPackageEnvironment();
        env.fs.statSync.mockImplementation((target: string) => ({ isFile: (): boolean => !target.startsWith(env.output) }));
        expect(() => env.api.replacePackagedApp(env.source)).toThrow('exe');
        expect(env.files.has(path.join(env.output, 'obsolete.dll'))).toBe(true);
        expect(env.files.has(path.join(env.source, 'new.dll'))).toBe(true);
    });

    it('復元にも失敗した場合はバックアップを削除しない', (): void => {
        const env = createPackageEnvironment();
        const rename = env.fs.renameSync.getMockImplementation();
        env.fs.renameSync.mockImplementation((from: string, to: string): void => {
            if (from === env.source || from === env.backup) throw new Error('移動失敗');
            rename?.(from, to);
        });
        expect(() => env.api.replacePackagedApp(env.source)).toThrow('退避先を保全');
        expect(env.files.has(path.join(env.backup, 'obsolete.dll'))).toBe(true);
        expect(env.fs.rmSync).not.toHaveBeenCalled();
    });

    it('バックアップが既に残っている場合は上書きしない', (): void => {
        const env = createPackageEnvironment();
        env.files.add(env.backup);
        expect(() => env.api.replacePackagedApp(env.source)).toThrow('退避データ');
        expect(env.fs.renameSync).not.toHaveBeenCalled();
    });

    it('別名のexeだけでは更新を許可しない', (): void => {
        const env = createPackageEnvironment();
        env.files.delete(path.join(env.source, 'JoyCon Clicker.exe'));
        env.files.add(path.join(env.source, 'other.exe'));
        expect(() => env.api.replacePackagedApp(env.source)).toThrow('exe');
        expect(env.fs.renameSync).not.toHaveBeenCalled();
    });

    it('リポジトリ直下や想定外の出力先は操作しない', (): void => {
        const env = createPackageEnvironment();
        expect(() => env.api.resolveInsideRoot(env.root)).toThrow();
        expect(() => env.api.resolveInsideRoot(path.dirname(env.root))).toThrow();
        expect(() => env.api.replacePackagedApp(env.output)).toThrow('想定外');
        expect(env.fs.renameSync).not.toHaveBeenCalled();
    });

    it('測定原本とキャッシュは配布対象から除外し、回帰テスト用データとは区別する', async (): Promise<void> => {
        const env = createPackageEnvironment();
        await env.api.packageToNextOutput();
        const options = env.packager.mock.calls[0][0] as PackageOptions;
        const excluded = (file: string): boolean => options.ignore.some((pattern: RegExp): boolean => pattern.test(file));
        for (const file of ['/joycon-validation-123.json', '/.electron-cache/a', '/.packager-tmp/a', '/.pnpm-store/a', '/dist_packager_next/a']) {
            expect(excluded(file)).toBe(true);
        }
        expect(excluded('/src/__tests__/fixtures/joycon-r-motion.json')).toBe(false);
    });
});
