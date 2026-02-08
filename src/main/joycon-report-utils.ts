export type JoyConReportKind = 'subcommand-reply' | 'standard-input' | 'unsupported';

/**
 * レポート ID からレポート種別を判定する。
 * @param reportId レポート ID
 * @returns レポート種別
 */
export function classifyJoyConReport(reportId: number): JoyConReportKind {
    if (reportId === 0x21) {
        return 'subcommand-reply';
    }
    if (reportId === 0x30) {
        return 'standard-input';
    }
    return 'unsupported';
}

/**
 * 標準入力レポートを解析可能か判定する。
 * @param reportId レポート ID
 * @param dataLength 入力バッファ長
 * @returns 解析可能な場合は true
 */
export function canParseStandardInputReport(reportId: number, dataLength: number): boolean {
    return classifyJoyConReport(reportId) === 'standard-input' && dataLength >= 25;
}
