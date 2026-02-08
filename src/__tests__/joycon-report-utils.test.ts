import { canParseStandardInputReport, classifyJoyConReport } from '../main/joycon-report-utils';

describe('Joy-Conレポートユーティリティ', (): void => {
    it('レポート ID を種別へ分類する', (): void => {
        expect(classifyJoyConReport(0x21)).toBe('subcommand-reply');
        expect(classifyJoyConReport(0x30)).toBe('standard-input');
        expect(classifyJoyConReport(0x00)).toBe('unsupported');
    });

    it('標準入力レポートの解析可否を判定する', (): void => {
        expect(canParseStandardInputReport(0x30, 25)).toBe(true);
        expect(canParseStandardInputReport(0x30, 24)).toBe(false);
        expect(canParseStandardInputReport(0x21, 40)).toBe(false);
    });
});
