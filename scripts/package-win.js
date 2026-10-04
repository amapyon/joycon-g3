const fs = require('fs');
const path = require('path');
const packager = require('electron-packager');
const { createHash } = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const appName = 'JoyCon Clicker';
const appDirName = `${appName}-win32-x64`;
const outputDir = path.join(rootDir, 'dist_packager');
const nextOutputDir = path.join(rootDir, 'dist_packager_next');
const cacheDir = path.join(rootDir, '.electron-cache');
const appOutputDir = path.join(outputDir, appDirName);
const backupDir = path.join(outputDir, `${appDirName}.backup`);

/**
 * 指定されたパスがリポジトリ内にあることを確認する。
 *
 * @param {string} targetPath 確認対象のパス。
 * @returns {string} 解決済みの絶対パス。
 */
function resolveInsideRoot(targetPath) {
    const resolvedPath = path.resolve(targetPath);
    const relativePath = path.relative(rootDir, resolvedPath);

    if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
        throw new Error(`リポジトリ外のパスは操作できません: ${resolvedPath}`);
    }

    return resolvedPath;
}

/**
 * ディレクトリが存在する場合に削除する。
 *
 * @param {string} targetPath 削除対象のディレクトリパス。
 * @returns {void}
 */
function removeDirectoryIfExists(targetPath) {
    const resolvedPath = resolveInsideRoot(targetPath);

    if (fs.existsSync(resolvedPath)) {
        fs.rmSync(resolvedPath, { recursive: true, force: true });
    }
}

/**
 * アプリ本体の実行ファイルが存在することを確認する。
 *
 * @param {string} targetDir 検索対象のディレクトリ。
 * @returns {void}
 */
function validatePackagedApp(targetDir) {
    const exePath = path.join(targetDir, `${appName}.exe`);
    if (!fs.existsSync(exePath) || !fs.statSync(exePath).isFile()) {
        throw new Error(`アプリ本体の exe が見つかりません: ${exePath}`);
    }
}

/**
 * ビルド済みファイルが配布物へ欠落・変更なく収録されたことを確認する。
 * @param packagedAppDir 配布用アプリのディレクトリ。
 * @returns {void}
 */
function verifyPackagedBuild(packagedAppDir) {
    const buildDir = path.join(rootDir, 'dist');
    const packagedBuildDir = path.join(packagedAppDir, 'resources', 'app', 'dist');
    let checkedFiles = 0;
    /**
     * ビルドのディレクトリを再帰的に比較する。
     * @param relativeDir ビルド内の相対ディレクトリ。
     * @returns {void}
     */
    function compareDirectory(relativeDir) {
        for (const entry of fs.readdirSync(path.join(buildDir, relativeDir), { withFileTypes: true })) {
            const relativeFile = path.join(relativeDir, entry.name);
            if (entry.isDirectory()) {
                compareDirectory(relativeFile);
            } else if (entry.isFile()) {
                const packagedFile = path.join(packagedBuildDir, relativeFile);
                if (!fs.existsSync(packagedFile) || !fs.statSync(packagedFile).isFile()) {
                    throw new Error(`配布物にビルド済みファイルがありません: ${relativeFile}`);
                }
                const expectedHash = createHash('sha256').update(fs.readFileSync(path.join(buildDir, relativeFile))).digest('hex');
                const actualHash = createHash('sha256').update(fs.readFileSync(packagedFile)).digest('hex');
                if (expectedHash !== actualHash) {
                    throw new Error(`配布物の内容が最新ビルドと一致しません: ${relativeFile}`);
                }
                checkedFiles += 1;
            }
        }
    }
    compareDirectory('');
    if (checkedFiles === 0) {
        throw new Error('ビルド済みファイルがありません。npm run build を実行してください。');
    }
}

/**
 * electron-packager で一時出力先へパッケージを作成する。
 *
 * @returns {Promise<string>} 実際に作成されたアプリディレクトリのパス。
 */
async function packageToNextOutput() {
    fs.mkdirSync(cacheDir, { recursive: true });

    const appPaths = await packager({
        dir: rootDir,
        name: appName,
        platform: 'win32',
        arch: 'x64',
        out: nextOutputDir,
        overwrite: true,
        icon: path.join(rootDir, 'assets', 'icon.ico'),
        download: {
            cacheRoot: cacheDir,
        },
        ignore: [
            /^\/dist_.*/,
            /^\/\.electron-cache(\/|$)/,
            /^\/\.packager-tmp(\/|$)/,
            /^\/\.pnpm-store(\/|$)/,
            /^\/joycon-validation-[^/]*\.json$/,
            /^\/node_modules\/(electron|electron-packager|electron-rebuild|\.bin)(\/|$)/,
            /^\/\.git$/,
            /^\/\.vscode$/,
            /^\/assets$/,
        ],
    });

    const appPath = appPaths[0];

    if (!appPath) {
        throw new Error('electron-packager の出力先を取得できませんでした。');
    }

    return appPath;
}

/**
 * 旧アプリを退避して新アプリへ切り替え、失敗時は旧アプリを復元する。
 *
 * @param {string} packagedAppDir 作成されたアプリディレクトリのパス。
 * @returns {void}
 */
function replacePackagedApp(packagedAppDir) {
    const resolvedPackagedAppDir = resolveInsideRoot(packagedAppDir);
    if (resolvedPackagedAppDir !== path.join(nextOutputDir, appDirName)) {
        throw new Error(`想定外のパッケージ出力先です: ${resolvedPackagedAppDir}`);
    }
    validatePackagedApp(resolvedPackagedAppDir);
    // 前回の退避データが残っている場合は、自動で削除せず確認を求める。
    if (fs.existsSync(backupDir)) {
        throw new Error(`前回の退避データを確認してください: ${backupDir}`);
    }
    fs.mkdirSync(outputDir, { recursive: true });
    const hadPreviousApp = fs.existsSync(appOutputDir);
    if (hadPreviousApp) {
        fs.renameSync(appOutputDir, backupDir);
    }
    let installed = false;
    try {
        fs.renameSync(resolvedPackagedAppDir, appOutputDir);
        installed = true;
        validatePackagedApp(appOutputDir);
    } catch (error) {
        try {
            // 新アプリは一時出力へ戻し、調査用に残す。
            if (installed) {
                fs.renameSync(appOutputDir, resolvedPackagedAppDir);
            }
            if (hadPreviousApp) {
                fs.renameSync(backupDir, appOutputDir);
            }
        } catch (restoreError) {
            throw new Error(`復元に失敗しました。退避先を保全してください: ${backupDir}\n更新エラー: ${error}\n復元エラー: ${restoreError}`);
        }
        throw error;
    }
    if (hadPreviousApp) {
        removeDirectoryIfExists(backupDir);
    }
}

/**
 * Windows x64 向けパッケージを安全に作成する。
 *
 * @returns {Promise<void>}
 */
async function main() {
    console.info(`Windowsパッケージ作成開始（Node ${process.version}）`);
    removeDirectoryIfExists(nextOutputDir);
    const packagedAppDir = await packageToNextOutput();
    verifyPackagedBuild(packagedAppDir);
    replacePackagedApp(packagedAppDir);
    removeDirectoryIfExists(nextOutputDir);
    console.info(`作成完了（最新ビルドとの一致を確認）: ${path.join(appOutputDir, `${appName}.exe`)}`);
}

/**
 * 未完了の非同期処理が残ったまま正常終了することを防ぐ。
 * @param task 実行するパッケージ処理。
 * @returns {Promise<void>} パッケージ処理の完了。
 */
async function runPackageCommand(task = main) {
    const onBeforeExit = () => {
        console.error('パッケージ作成が未完了のまま終了しました。ZIP展開ライブラリを更新するため npm install を実行してください。');
        process.exitCode = 1;
    };
    process.once('beforeExit', onBeforeExit);
    try {
        await task();
    } finally {
        process.removeListener('beforeExit', onBeforeExit);
    }
}

module.exports = { replacePackagedApp, packageToNextOutput, resolveInsideRoot, verifyPackagedBuild, runPackageCommand };

if (require.main === module) {
    runPackageCommand().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
