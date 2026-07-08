export {};
// eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
const { MenuController } = require('../renderer/timer/menu-controller') as {
    MenuController: {
        new (options: {
            countdownMenuElement: { style: { visibility: string } } | null;
            countdownMenuValueElement: { textContent: string } | null;
            timerPresetsContainer: { querySelectorAll: () => Array<{ classList: { add: () => void; remove: () => void } }> } | null;
            formatTime: (seconds: number) => string;
            getDisplaySeconds: () => number;
            onSelectPreset: (seconds: number) => void;
            onAddMinute: () => void;
            onHideTimer: (resetText: boolean) => void;
            onShowTimer: () => void;
            onStopCountdown: () => void;
            onPresetFocus: (seconds: number) => void;
            onSelectClock: () => void;
        }): {
            getIsVisible: () => boolean;
            setPresets: (presets: number[]) => void;
            setVisible: (visible: boolean) => void;
            toggleVisible: () => void;
            updateMenuDisplay: () => void;
            renderPresets: () => void;
            navigate: (direction: number) => void;
            selectCurrent: () => void;
        };
    };
};

type FakeElement = {
    style: { visibility: string };
};

type FakeTextElement = {
    textContent: string;
};

type FakePresetContainer = {
    innerHTML?: string;
    appendChild?: () => void;
    querySelectorAll: () => Array<{ classList: { add: () => void; remove: () => void } }>;
};

describe('メニューコントローラ', (): void => {
    beforeEach((): void => {
        (globalThis as unknown as {
            document?: {
                createElement: () => {
                    className: string;
                    classList: { add: () => void; remove: () => void };
                    textContent: string;
                    dataset: Record<string, string>;
                    addEventListener: () => void;
                };
            };
        }).document = {
            createElement: (): {
                className: string;
                classList: { add: () => void; remove: () => void };
                textContent: string;
                dataset: Record<string, string>;
                addEventListener: () => void;
            } => ({
                className: '',
                classList: {
                    add: (): void => {
                        return;
                    },
                    remove: (): void => {
                        return;
                    },
                },
                textContent: '',
                dataset: {},
                addEventListener: (): void => {
                    return;
                },
            }),
        };
    });

    it('表示切替でメニュー状態が更新される', (): void => {
        const menuElement: FakeElement = { style: { visibility: 'hidden' } };
        const valueElement: FakeTextElement = { textContent: '' };
        const hideCalls: boolean[] = [];
        const showCalls: boolean[] = [];

        const controller = new MenuController({
            countdownMenuElement: menuElement,
            countdownMenuValueElement: valueElement,
            timerPresetsContainer: null,
            formatTime: (seconds: number): string => `t:${seconds}`,
            getDisplaySeconds: (): number => 10,
            onSelectPreset: (): void => {
                return;
            },
            onAddMinute: (): void => {
                return;
            },
            onHideTimer: (resetText: boolean): void => {
                hideCalls.push(resetText);
            },
            onShowTimer: (): void => {
                showCalls.push(true);
            },
            onStopCountdown: (): void => {
                return;
            },
            onPresetFocus: (): void => {
                return;
            },
            onSelectClock: (): void => {
                return;
            },
        });

        controller.setVisible(true);
        expect(menuElement.style.visibility).toBe('visible');
        expect(valueElement.textContent).toBe('t:10');
        expect(hideCalls.length).toBe(1);

        controller.setVisible(false);
        expect(menuElement.style.visibility).toBe('hidden');
        expect(showCalls.length).toBe(1);
    });

    it('フォーカス移動が循環する', (): void => {
        let menuItemCount = 0;
        const presetFocusCalls: number[] = [];
        const presetContainer: FakePresetContainer = {
            innerHTML: '',
            appendChild: (): void => {
                return;
            },
            querySelectorAll: (): Array<{ classList: { add: () => void; remove: () => void } }> => {
                return Array.from({ length: menuItemCount }, () => ({
                    classList: {
                        add: (): void => {
                            return;
                        },
                        remove: (): void => {
                            return;
                        },
                    },
                }));
            },
        };

        const controller = new MenuController({
            countdownMenuElement: null,
            countdownMenuValueElement: null,
            timerPresetsContainer: presetContainer,
            formatTime: (seconds: number): string => String(seconds),
            getDisplaySeconds: (): number => 0,
            onSelectPreset: (): void => {
                return;
            },
            onAddMinute: (): void => {
                return;
            },
            onHideTimer: (): void => {
                return;
            },
            onShowTimer: (): void => {
                return;
            },
            onStopCountdown: (): void => {
                return;
            },
            onPresetFocus: (seconds: number): void => {
                presetFocusCalls.push(seconds);
            },
            onSelectClock: (): void => {
                return;
            },
        });

        controller.setPresets([10]);
        menuItemCount = 3;
        controller.setVisible(true);

        controller.navigate(1);
        controller.navigate(1);
        controller.navigate(1);
        controller.navigate(1);

        expect(presetFocusCalls).toEqual([10, 10]);
    });

    it('選択でプリセットと+1分と Clock が発火する', (): void => {
        let menuItemCount = 0;
        const selectedPresets: number[] = [];
        let addMinuteCount = 0;
        let clockCount = 0;
        const presetContainer: FakePresetContainer = {
            innerHTML: '',
            appendChild: (): void => {
                return;
            },
            querySelectorAll: (): Array<{ classList: { add: () => void; remove: () => void } }> => {
                return Array.from({ length: menuItemCount }, () => ({
                    classList: {
                        add: (): void => {
                            return;
                        },
                        remove: (): void => {
                            return;
                        },
                    },
                }));
            },
        };

        const controller = new MenuController({
            countdownMenuElement: null,
            countdownMenuValueElement: null,
            timerPresetsContainer: presetContainer,
            formatTime: (seconds: number): string => String(seconds),
            getDisplaySeconds: (): number => 0,
            onSelectPreset: (seconds: number): void => {
                selectedPresets.push(seconds);
            },
            onAddMinute: (): void => {
                addMinuteCount += 1;
            },
            onHideTimer: (): void => {
                return;
            },
            onShowTimer: (): void => {
                return;
            },
            onStopCountdown: (): void => {
                return;
            },
            onPresetFocus: (): void => {
                return;
            },
            onSelectClock: (): void => {
                clockCount += 1;
            },
        });

        controller.setPresets([15]);
        menuItemCount = 3;
        controller.setVisible(true);

        controller.navigate(1);
        controller.selectCurrent();
        controller.navigate(1);
        controller.selectCurrent();
        controller.navigate(1);
        controller.selectCurrent();

        expect(selectedPresets).toEqual([15]);
        expect(addMinuteCount).toBe(1);
        expect(clockCount).toBe(1);
    });
});
