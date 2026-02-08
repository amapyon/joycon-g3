// powerpoint-control.ts
import winax from 'winax';

/**
 * PowerPoint を COM 経由で操作する。
 */
type SlideShowView = {
    Next?: () => void;
    Previous?: () => void;
    GotoSlide?: (index: number) => void;
    Slide?: { SlideIndex?: number };
};

type SlideShowWindow = {
    Presentation?: Presentation;
    View?: SlideShowView;
    Activate?: () => void;
};

type PresentationWindow = {
    Activate?: () => void;
};

type Presentation = {
    FullName?: string;
    Name?: string;
    SlideShowSettings?: { Run?: () => SlideShowWindow };
    Windows?: { Count?: number; Item?: (index: number) => PresentationWindow };
};

type PowerPointApp = {
    isNull?: boolean;
    SlideShowWindows?: { Count?: number; Item?: (index: number) => SlideShowWindow };
    Presentations?: { Count?: number; Item?: (index: number) => Presentation };
    ActiveWindow?: { Presentation?: Presentation; View?: { Slide?: { SlideIndex?: number } } };
};

/**
 * エラーメッセージを安全に取得する。
 * @param error 例外オブジェクト
 * @returns メッセージ文字列
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

class PowerPointControl {
    ppApp: PowerPointApp | null = null;
    isWindows: boolean = process.platform === 'win32';
    targetPresentationIdentifier?: string;

    /**
     * PowerPoint 制御を初期化する。
     */
    constructor() {
        if (!this.isWindows) {
            // console.warn('[PowerPointControl] PowerPoint automation is only supported on Windows.');
        }
    }

    /**
     * PowerPoint アプリケーションに接続する。
     * @returns 接続成功かどうか
     */
    connect(): boolean {
        if (!this.isWindows) return false;
        if (this.ppApp && !this.ppApp.isNull) return true;
        try {
            this.ppApp = new winax.Object('PowerPoint.Application', { activate: true }) as unknown as PowerPointApp;
            if (!this.ppApp || this.ppApp.isNull) {
                throw new Error('Failed to create or connect to PowerPoint.Application object (maybe null).');
            }
            return true;
        } catch (e: unknown) {
            // console.warn('[PowerPointControl] Could not connect to PowerPoint instance.', getErrorMessage(e));
            void e;
            this.ppApp = null;
            return false;
        }
    }

    /**
     * 対象プレゼンテーションかどうかを判定する。
     * @param presentation 判定対象
     * @returns 一致する場合は true
     */
    private isTargetPresentation(presentation?: Presentation): boolean {
        if (!presentation || !this.targetPresentationIdentifier) {
            return false;
        }
        return presentation.FullName === this.targetPresentationIdentifier || presentation.Name === this.targetPresentationIdentifier;
    }

    /**
     * スライドショーウィンドウ一覧を取得する。
     * @param ppApp PowerPoint アプリケーション
     * @returns スライドショーウィンドウ配列
     */
    private getSlideShowWindows(ppApp: PowerPointApp): SlideShowWindow[] {
        const windows: SlideShowWindow[] = [];
        const count = ppApp.SlideShowWindows?.Count;
        if (typeof count !== 'number') {
            return windows;
        }
        for (let i = 1; i <= count; i++) {
            const window = ppApp.SlideShowWindows?.Item?.(i);
            if (window) {
                windows.push(window);
            }
        }
        return windows;
    }

    /**
     * プレゼンテーション一覧を取得する。
     * @param ppApp PowerPoint アプリケーション
     * @returns プレゼンテーション配列
     */
    private getPresentations(ppApp: PowerPointApp): Presentation[] {
        const presentations: Presentation[] = [];
        const count = ppApp.Presentations?.Count;
        if (typeof count !== 'number') {
            return presentations;
        }
        for (let i = 1; i <= count; i++) {
            const presentation = ppApp.Presentations?.Item?.(i);
            if (presentation) {
                presentations.push(presentation);
            }
        }
        return presentations;
    }

    /**
     * 対象スライドショーウィンドウを探索する。
     * @param ppApp PowerPoint アプリケーション
     * @returns 対象ウィンドウ
     */
    private findTargetSlideShowWindow(ppApp: PowerPointApp): SlideShowWindow | null {
        const target = this.getSlideShowWindows(ppApp).find((window: SlideShowWindow): boolean => {
            return this.isTargetPresentation(window.Presentation);
        });
        return target ?? null;
    }

    /**
     * 対象プレゼンテーションを探索する。
     * @param ppApp PowerPoint アプリケーション
     * @returns 対象プレゼンテーション
     */
    private findTargetPresentation(ppApp: PowerPointApp): Presentation | null {
        const target = this.getPresentations(ppApp).find((presentation: Presentation): boolean => {
            return this.isTargetPresentation(presentation);
        });
        return target ?? null;
    }

    /**
     * アクティブウィンドウから再開スライド番号を取得する。
     * @param ppApp PowerPoint アプリケーション
     * @param targetPres 対象プレゼンテーション
     * @returns スライド番号
     */
    private getCurrentSlideIndex(ppApp: PowerPointApp, targetPres: Presentation): number {
        try {
            const activePresentation = ppApp.ActiveWindow?.Presentation;
            const activeSlideIndex = ppApp.ActiveWindow?.View?.Slide?.SlideIndex;
            const isSamePresentation = activePresentation
                && (activePresentation.FullName === targetPres.FullName || activePresentation.Name === targetPres.Name);
            if (isSamePresentation && typeof activeSlideIndex === 'number') {
                return activeSlideIndex;
            }
        } catch (e: unknown) {
            void e;
        }
        return 1;
    }

    /**
     * 開いているプレゼンテーション一覧を取得する。
     * @returns プレゼンテーション一覧
     */
    getOpenPresentations(): Array<{ id: string; name: string; isRunning: boolean }> {
        const presentations: Array<{ id: string; name: string; isRunning: boolean }> = [];
        if (!this.connect()) return presentations;
        const ppApp = this.ppApp;
        if (!ppApp) return presentations;
        try {
            const runningSlideShowPaths = new Set<string>();
            this.getSlideShowWindows(ppApp).forEach((slideShowWindow: SlideShowWindow): void => {
                const fullName = slideShowWindow.Presentation?.FullName;
                if (fullName) {
                    runningSlideShowPaths.add(fullName);
                }
            });

            this.getPresentations(ppApp).forEach((presentation: Presentation): void => {
                const fullName = presentation.FullName;
                const id = fullName || presentation.Name;
                if (!id) {
                    return;
                }
                presentations.push({
                    id: id,
                    name: presentation.Name || id,
                    isRunning: fullName ? runningSlideShowPaths.has(fullName) : false,
                });
            });
        } catch (e: unknown) {
            // console.error('[PPControl] Error getting presentations list:', getErrorMessage(e));
            void e;
        }
        return presentations;
    }

    /**
     * 操作対象のプレゼンテーションを設定する。
     * @param identifier プレゼンテーション識別子
     */
    setTarget(identifier: string): void {
        this.targetPresentationIdentifier = identifier;
        this.activateTarget();
    }

    /**
     * 操作対象のプレゼンテーションをアクティブ化する。
     * @returns アクティブ化に成功したかどうか
     */
    activateTarget(): boolean {
        if (!this.isWindows || !this.targetPresentationIdentifier) return false;
        if (!this.connect()) return false;
        const ppApp = this.ppApp;
        if (!ppApp) return false;
        try {
            const targetSlideShowWindow = this.findTargetSlideShowWindow(ppApp);
            if (targetSlideShowWindow) {
                // console.log(`[PPControl] Activating SlideShowWindow for: ${targetSlideShowWindow.Presentation?.Name}`);
                targetSlideShowWindow.Activate?.();
                return true;
            }

            const targetPresentation = this.findTargetPresentation(ppApp);
            const windowCount = targetPresentation?.Windows?.Count;
            if (targetPresentation && typeof windowCount === 'number' && windowCount > 0) {
                // console.log(`[PPControl] Activating Presentation Window for: ${targetPresentation.Name}`);
                targetPresentation.Windows?.Item?.(1)?.Activate?.();
                return true;
            }
        } catch (e: unknown) {
            // console.error('[PPControl] Error activating target:', getErrorMessage(e));
            void e;
        }
        return false;
    }

    /**
     * 現在のスライドショー表示を取得する。
     * @returns スライドショービュー
     */
    _getSlideShowView(): SlideShowView | null {
        if (!this.isWindows || !this.targetPresentationIdentifier) return null;
        if (!this.connect()) return null;
        const ppApp = this.ppApp;
        if (!ppApp) return null;
        try {
            const targetWindow = this.findTargetSlideShowWindow(ppApp);
            if (targetWindow?.View) {
                return targetWindow.View;
            }
        } catch (e: unknown) {
            // console.error('[PPControl] Error accessing SlideShowWindows collection:', getErrorMessage(e));
            void e;
            this.ppApp = null;
        }
        return null;
    }

    /**
     * 対象プレゼンテーションのスライドショーを開始しビューを返す。
     * @param ppApp PowerPoint アプリケーション
     * @returns スライドショービュー
     */
    private startTargetSlideShow(ppApp: PowerPointApp): SlideShowView | null {
        const targetPres = this.findTargetPresentation(ppApp);
        if (!targetPres) {
            return null;
        }

        // console.log(`[PPControl] Starting slide show for: ${targetPres.Name}`);
        const currentSlideIndex = this.getCurrentSlideIndex(ppApp, targetPres);
        const slideShowWindow = targetPres.SlideShowSettings?.Run?.();
        if (!slideShowWindow?.View) {
            return null;
        }

        if (currentSlideIndex > 1) {
            try {
                slideShowWindow.View.GotoSlide?.(currentSlideIndex);
            } catch (e: unknown) {
                void e;
                // 再開失敗時は初期位置で継続
            }
        }
        return slideShowWindow.View;
    }

    /**
     * 対象のスライドショーを開始する。
     * @returns スライドショービュー
     */
    _startSlideShow(): SlideShowView | null {
        if (!this.isWindows || !this.targetPresentationIdentifier) return null;
        if (!this.connect()) return null;
        const ppApp = this.ppApp;
        if (!ppApp) return null;
        try {
            return this.startTargetSlideShow(ppApp);
        } catch (e: unknown) {
            // console.error('[PPControl] Error starting slide show:', getErrorMessage(e));
            void e;
            return null;
        }
    }

    /**
     * スライドショービューを取得する。なければ開始を試みる。
     * @returns スライドショービュー
     */
    private resolveSlideShowView(): SlideShowView | null {
        const view = this._getSlideShowView();
        if (view) {
            return view;
        }
        return this._startSlideShow();
    }

    /**
     * スライド操作関数を実行する。
     * @param action 操作関数
     * @returns 実行成功かどうか
     */
    private runSlideAction(action: (view: SlideShowView) => void): boolean {
        if (!this.isWindows) return false;
        const view = this.resolveSlideShowView();
        if (!view) {
            return false;
        }
        try {
            action(view);
            return true;
        } catch (e: unknown) {
            void e;
            return false;
        }
    }

    /**
     * 次のスライドへ進める。
     * @returns 実行成功かどうか
     */
    next(): boolean {
        return this.runSlideAction((view: SlideShowView): void => {
            view.Next?.();
        });
    }

    /**
     * 前のスライドへ戻る。
     * @returns 実行成功かどうか
     */
    previous(): boolean {
        return this.runSlideAction((view: SlideShowView): void => {
            view.Previous?.();
        });
    }
}

const powerpointControlInstance = new PowerPointControl();
export default powerpointControlInstance;
