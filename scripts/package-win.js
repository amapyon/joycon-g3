const fs = require('fs');
const path = require('path');
const packager = require('electron-packager');

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
    removeDirectoryIfExists(nextOutputDir);
    const packagedAppDir = await packageToNextOutput();
    replacePackagedApp(packagedAppDir);
    removeDirectoryIfExists(nextOutputDir);
}

module.exports = { replacePackagedApp, packageToNextOutput, resolveInsideRoot };

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
