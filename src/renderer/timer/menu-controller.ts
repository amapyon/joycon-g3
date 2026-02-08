type TimerMenuItem =
    | { type: 'preset'; time: number; label: string }
    | { type: 'add-minute'; label: string };

type MenuVisibilityDecision = {
    menuVisible: boolean;
    timerVisible: boolean;
    updateMenuDisplay: boolean;
    renderPresets: boolean;
    stopCountdown: boolean;
    resetTimerText: boolean;
};

type MenuControllerOptions = {
    countdownMenuElement: HTMLElement | null;
    countdownMenuValueElement: HTMLElement | null;
    timerPresetsContainer: HTMLElement | null;
    formatTime: (seconds: number) => string;
    getDisplaySeconds: () => number;
    onSelectPreset: (seconds: number) => void;
    onAddMinute: () => void;
    onHideTimer: (resetText: boolean) => void;
    onShowTimer: () => void;
    onStopCountdown: () => void;
    onPresetFocus: (seconds: number) => void;
};

type MenuControllerPresetLabelApi = {
    formatTimerPresetLabel: (seconds: number) => string;
};

const menuControllerApiResolverUtils = ((): { resolveApi: <T>(globalKey: string, requirePath: string) => T } => {
    const root = globalThis as unknown as {
        rendererApiResolverUtils?: { resolveApi: <T>(globalKey: string, requirePath: string) => T };
    };
    if (root.rendererApiResolverUtils) {
        return root.rendererApiResolverUtils;
    }
    if (typeof require !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- CommonJS 形式の読み込みが必要
        return require('../api-resolver-utils') as { resolveApi: <T>(globalKey: string, requirePath: string) => T };
    }
    throw new Error('rendererApiResolverUtils API is not available');
})();

const menuControllerPresetLabelApi: MenuControllerPresetLabelApi = menuControllerApiResolverUtils.resolveApi<MenuControllerPresetLabelApi>('timerPresetLabel', './preset-label-utils');

/**
 * タイマーメニューの表示と操作を管理する。
 */
class MenuController {
    private readonly countdownMenuElement: HTMLElement | null;
    private readonly countdownMenuValueElement: HTMLElement | null;
    private readonly timerPresetsContainer: HTMLElement | null;
    private readonly formatTime: (seconds: number) => string;
    private readonly getDisplaySeconds: () => number;
    private readonly onSelectPreset: (seconds: number) => void;
    private readonly onAddMinute: () => void;
    private readonly onHideTimer: (resetText: boolean) => void;
    private readonly onShowTimer: () => void;
    private readonly onStopCountdown: () => void;
    private readonly onPresetFocus: (seconds: number) => void;
    private isVisible: boolean;
    private selectedPresetIndex: number;
    private menuItems: TimerMenuItem[];

    /**
     * メニューコントローラを生成する。
     * @param options 表示制御とコールバック
     */
    public constructor(options: MenuControllerOptions) {
        this.countdownMenuElement = options.countdownMenuElement;
        this.countdownMenuValueElement = options.countdownMenuValueElement;
        this.timerPresetsContainer = options.timerPresetsContainer;
        this.formatTime = options.formatTime;
        this.getDisplaySeconds = options.getDisplaySeconds;
        this.onSelectPreset = options.onSelectPreset;
        this.onAddMinute = options.onAddMinute;
        this.onHideTimer = options.onHideTimer;
        this.onShowTimer = options.onShowTimer;
        this.onStopCountdown = options.onStopCountdown;
        this.onPresetFocus = options.onPresetFocus;
        this.isVisible = false;
        this.selectedPresetIndex = -1;
        this.menuItems = [];
    }

    /**
     * メニュー表示状態を取得する。
     * @returns 表示中かどうか
     */
    public getIsVisible(): boolean {
        return this.isVisible;
    }

    /**
     * プリセット一覧を更新する。
     * @param presets プリセット秒数
     */
    public setPresets(presets: number[]): void {
        this.menuItems = MenuController.buildMenuItems(presets);
    }

    /**
     * メニューの表示状態を設定する。
     * @param visible 表示するかどうか
     */
    public setVisible(visible: boolean): void {
        const decision = MenuController.decideVisibility(visible);
        this.isVisible = visible;

        if (this.countdownMenuElement) {
            this.countdownMenuElement.style.visibility = decision.menuVisible ? 'visible' : 'hidden';
        }

        if (visible) {
            if (decision.updateMenuDisplay) {
                this.updateMenuDisplay();
            }
            if (decision.stopCountdown) {
                this.onStopCountdown();
            }
            if (!decision.timerVisible) {
                this.onHideTimer(decision.resetTimerText);
            }
            if (decision.renderPresets) {
                this.renderPresets();
            }
            return;
        }

        this.onShowTimer();
    }

    /**
     * メニュー表示を切り替える。
     */
    public toggleVisible(): void {
        this.setVisible(!this.isVisible);
    }

    /**
     * メニュー表示値を更新する。
     */
    public updateMenuDisplay(): void {
        if (!this.countdownMenuValueElement) {
            return;
        }
        this.countdownMenuValueElement.textContent = this.formatTime(this.getDisplaySeconds());
    }

    /**
     * メニュー項目を描画する。
     */
    public renderPresets(): void {
        if (!this.timerPresetsContainer) {
            return;
        }
        this.timerPresetsContainer.innerHTML = '';
        this.menuItems.forEach((item: TimerMenuItem, index: number): void => {
            const btn = document.createElement(item.type === 'preset' ? 'div' : 'button');
            btn.className = item.type === 'preset' ? 'menu-preset-btn menu-item-btn' : 'menu-action-btn menu-item-btn';
            if (index === this.selectedPresetIndex) {
                btn.classList.add('focused');
            }
            btn.textContent = item.label;
            if (item.type === 'preset') {
                btn.dataset.time = String(item.time);
                btn.addEventListener('click', (): void => {
                    this.onSelectPreset(item.time);
                });
            } else {
                btn.addEventListener('click', (): void => {
                    this.onAddMinute();
                });
            }
            this.timerPresetsContainer?.appendChild(btn);
        });
    }

    /**
     * フォーカスを移動する。
     * @param direction 移動方向
     */
    public navigate(direction: number): void {
        if (!this.isVisible || this.menuItems.length === 0) {
            return;
        }

        if (this.selectedPresetIndex === -1) {
            this.selectedPresetIndex = 0;
        } else {
            this.selectedPresetIndex += direction;
            if (this.selectedPresetIndex < 0) {
                this.selectedPresetIndex = this.menuItems.length - 1;
            }
            if (this.selectedPresetIndex >= this.menuItems.length) {
                this.selectedPresetIndex = 0;
            }
        }

        this.updatePresetFocus();
    }

    /**
     * 選択されたメニュー項目を実行する。
     */
    public selectCurrent(): void {
        if (!this.isVisible || this.selectedPresetIndex === -1) {
            return;
        }
        const item = this.menuItems[this.selectedPresetIndex];
        if (!item) {
            return;
        }
        if (item.type === 'preset') {
            this.onSelectPreset(item.time);
            return;
        }
        this.onAddMinute();
    }

    /**
     * フォーカス表示と選択情報を更新する。
     */
    private updatePresetFocus(): void {
        const btns = this.timerPresetsContainer?.querySelectorAll('.menu-item-btn');
        if (!btns) {
            return;
        }
        btns.forEach((btn: Element, index: number): void => {
            if (index === this.selectedPresetIndex) {
                btn.classList.add('focused');
                const item = this.menuItems[index];
                if (item && item.type === 'preset') {
                    this.onPresetFocus(item.time);
                    this.updateMenuDisplay();
                }
            } else {
                btn.classList.remove('focused');
            }
        });
    }

    /**
     * メニュー項目を生成する。
     * @param presets プリセット一覧
     * @returns メニュー項目
     */
    private static buildMenuItems(presets: number[]): TimerMenuItem[] {
        const items: TimerMenuItem[] = presets.map((time: number) => ({
            type: 'preset',
            time,
            label: menuControllerPresetLabelApi.formatTimerPresetLabel(time),
        }));

        items.push({ type: 'add-minute', label: '+1分' });
        return items;
    }

    /**
     * 表示切替の挙動を決定する。
     * @param visible 表示するかどうか
     * @returns 反映する挙動
     */
    private static decideVisibility(visible: boolean): MenuVisibilityDecision {
        if (visible) {
            return {
                menuVisible: true,
                timerVisible: false,
                updateMenuDisplay: true,
                renderPresets: true,
                stopCountdown: false,
                resetTimerText: false,
            };
        }

        return {
            menuVisible: false,
            timerVisible: true,
            updateMenuDisplay: false,
            renderPresets: false,
            stopCountdown: false,
            resetTimerText: false,
        };
    }
}

const menuControllerRoot = globalThis as unknown as {
    menuController?: { MenuController: typeof MenuController };
};

menuControllerRoot.menuController = { MenuController };

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = { MenuController };
}
