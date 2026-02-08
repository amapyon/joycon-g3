type FileUrlUtilsApi = {
    toFileUrl: (path: string) => string;
    toPlayableMediaUrl: (path: string) => string;
};

/**
 * ファイルパスを file URL に変換する。
 * @param path パス
 * @returns file URL
 */
function convertToFileUrl(path: string): string {
    if (!path) {
        return '';
    }
    if (path.startsWith('file://')) {
        return path;
    }
    return `file://${path}`;
}

/**
 * 再生用URLに変換する。
 * @param path パス
 * @returns 再生用URL
 */
function convertToPlayableMediaUrl(path: string): string {
    if (!path) {
        return '';
    }
    if (path.startsWith('file://') || path.startsWith('http')) {
        return path;
    }
    return `file://${path.replace(/\\/g, '/')}`;
}

const fileUrlUtilsApi: FileUrlUtilsApi = {
    toFileUrl: convertToFileUrl,
    toPlayableMediaUrl: convertToPlayableMediaUrl,
};

const fileUrlUtilsRoot = globalThis as unknown as {
    fileUrlUtils?: FileUrlUtilsApi;
};
fileUrlUtilsRoot.fileUrlUtils = fileUrlUtilsApi;

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = fileUrlUtilsApi;
}
