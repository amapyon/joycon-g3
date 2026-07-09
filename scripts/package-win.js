const fs = require('fs');
const path = require('path');
const packager = require('electron-packager');

const rootDir = path.resolve(__dirname, '..');
const appName = 'JoyCon Clicker';
const outputDir = path.join(rootDir, 'dist_packager');
const nextOutputDir = path.join(rootDir, 'dist_packager_next');
const cacheDir = path.join(rootDir, '.electron-cache');

/**
 * 指定されたパスがリポジトリ内にあることを確認する。
 *
 * @param {string} targetPath 確認対象のパス。
 * @returns {string} 解決済みの絶対パス。
 */
function resolveInsideRoot(targetPath) {
    const resolvedPath = path.resolve(targetPath);
    const relativePath = path.relative(rootDir, resolvedPath);

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
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
 * 指定されたディレクトリ配下から exe ファイルを探す。
 *
 * @param {string} targetDir 検索対象のディレクトリ。
 * @returns {string | null} 見つかった exe の絶対パス。
 */
function findExeFile(targetDir) {
    if (!fs.existsSync(targetDir)) {
        return null;
    }

    const entries = fs.readdirSync(targetDir, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(targetDir, entry.name);

        if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
            return entryPath;
        }

        if (entry.isDirectory()) {
            const nestedExePath = findExeFile(entryPath);

            if (nestedExePath) {
                return nestedExePath;
            }
        }
    }

    return null;
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
 * 作成済みの一時出力を正式な出力先へ反映する。
 *
 * @param {string} packagedAppDir 作成されたアプリディレクトリのパス。
 * @returns {void}
 */
function replaceOutputDirectory(packagedAppDir) {
    const resolvedPackagedAppDir = resolveInsideRoot(packagedAppDir);
    const packagedExePath = findExeFile(resolvedPackagedAppDir);

    if (!packagedExePath) {
        throw new Error(`作成済み exe が見つかりません: ${resolvedPackagedAppDir}`);
    }

    fs.mkdirSync(outputDir, { recursive: true });
    fs.cpSync(resolveInsideRoot(nextOutputDir), resolveInsideRoot(outputDir), {
        recursive: true,
        force: true,
    });
    removeDirectoryIfExists(nextOutputDir);
}

/**
 * Windows x64 向けパッケージを安全に作成する。
 *
 * @returns {Promise<void>}
 */
async function main() {
    removeDirectoryIfExists(nextOutputDir);
    const packagedAppDir = await packageToNextOutput();
    replaceOutputDirectory(packagedAppDir);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
