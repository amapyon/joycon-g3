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
            // 実行中のスライドショーウィンドウからパスを収集
            if (ppApp.SlideShowWindows && typeof ppApp.SlideShowWindows.Count === 'number') {
                for (let i = 1; i <= ppApp.SlideShowWindows.Count; i++) {
                    const slideShowWindow = ppApp.SlideShowWindows.Item?.(i);
                    if (slideShowWindow && slideShowWindow.Presentation) {
                        const fullName = slideShowWindow.Presentation.FullName;
                        if (fullName) {
                            runningSlideShowPaths.add(fullName);
                        }
                    }
                }
            }

            // 開いているすべてのプレゼンテーションを列挙
            if (ppApp.Presentations && typeof ppApp.Presentations.Count === 'number') {
                for (let i = 1; i <= ppApp.Presentations.Count; i++) {
                    const presentation = ppApp.Presentations.Item?.(i);
                    if (presentation) {
                        const fullName = presentation.FullName;
                        const id = fullName || presentation.Name; // FullNameがなければNameを使用
                        if (!id) {
                            continue;
                        }
                        presentations.push({
                            id: id,
                            name: presentation.Name || id,
                            isRunning: fullName ? runningSlideShowPaths.has(fullName) : false,
                        });
                    }
                }
            }
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
            // 1. まず実行中のスライドショーウィンドウを探してアクティブにする
            if (ppApp.SlideShowWindows && typeof ppApp.SlideShowWindows.Count === 'number') {
                for (let i = 1; i <= ppApp.SlideShowWindows.Count; i++) {
                    const ssw = ppApp.SlideShowWindows.Item?.(i);
                    if (ssw && ssw.Presentation && (ssw.Presentation.FullName === this.targetPresentationIdentifier || ssw.Presentation.Name === this.targetPresentationIdentifier)) {
                        // console.log(`[PPControl] Activating SlideShowWindow for: ${ssw.Presentation.Name}`);
                        ssw.Activate?.();
                        return true;
                    }
                }
            }

            // 2. スライドショーがない場合はプレゼンテーションウィンドウをアクティブにする
            if (ppApp.Presentations && typeof ppApp.Presentations.Count === 'number') {
                for (let i = 1; i <= ppApp.Presentations.Count; i++) {
                    const pres = ppApp.Presentations.Item?.(i);
                    if (pres && (pres.FullName === this.targetPresentationIdentifier || pres.Name === this.targetPresentationIdentifier)) {
                        const windowCount = pres.Windows?.Count;
                        if (typeof windowCount === 'number' && windowCount > 0) {
                            // console.log(`[PPControl] Activating Presentation Window for: ${pres.Name}`);
                            pres.Windows?.Item?.(1)?.Activate?.();
                            return true;
                        }
                    }
                }
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
            if (ppApp.SlideShowWindows && typeof ppApp.SlideShowWindows.Count === 'number') {
                const count = ppApp.SlideShowWindows.Count;
                for (let i = 1; i <= count; i++) {
                    try {
                        const ssw = ppApp.SlideShowWindows.Item?.(i);
                        if (ssw && ssw.Presentation && (ssw.Presentation.FullName === this.targetPresentationIdentifier || ssw.Presentation.Name === this.targetPresentationIdentifier)) {
                            if (ssw.View) {
                                return ssw.View;
                            }
                        }
                    } catch (e: unknown) {
                        // console.warn(`[PPControl] Error checking SlideShowWindow at index ${i}:`, getErrorMessage(e));
                        void e;
                    }
                }
            }
        } catch (e: unknown) {
            // console.error('[PPControl] Error accessing SlideShowWindows collection:', getErrorMessage(e));
            void e;
            this.ppApp = null;
        }
        return null;
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
            let targetPres: Presentation | null = null;
            if (ppApp.Presentations && typeof ppApp.Presentations.Count === 'number') {
                const count = ppApp.Presentations.Count;
                for (let i = 1; i <= count; i++) {
                    const pres = ppApp.Presentations.Item?.(i);
                    if (pres && (pres.FullName === this.targetPresentationIdentifier || pres.Name === this.targetPresentationIdentifier)) {
                        targetPres = pres;
                        break;
                    }
                }
            }

            if (targetPres) {
                // console.log(`[PPControl] Starting slide show for: ${targetPres.Name}`);
                
                // Get current slide index from active window if it matches
                let currentSlideIndex = 1;
                try {
                    if (ppApp.ActiveWindow && ppApp.ActiveWindow.Presentation && (ppApp.ActiveWindow.Presentation.FullName === targetPres.FullName || ppApp.ActiveWindow.Presentation.Name === targetPres.Name)) {
                        const slideIndex = ppApp.ActiveWindow.View?.Slide?.SlideIndex;
                        if (typeof slideIndex === 'number') {
                            currentSlideIndex = slideIndex;
                        }
                    }
                } catch (e) {
                    // 取得に失敗した場合は先頭から開始
                    currentSlideIndex = 1;
                }

                const ssw = targetPres.SlideShowSettings?.Run?.();
                if (ssw && ssw.View) {
                    if (currentSlideIndex > 1) {
                        try {
                            ssw.View.GotoSlide?.(currentSlideIndex);
                        } catch (e) {
                            // 再開失敗時は初期位置で継続
                            currentSlideIndex = 1;
                        }
                    }
                    return ssw.View;
                }
            }
        } catch (e: unknown) {
            // console.error('[PPControl] Error starting slide show:', getErrorMessage(e));
            void e;
        }
        return null;
    }

    /**
     * 次のスライドへ進める。
     * @returns 実行成功かどうか
     */
    next(): boolean {
        if (!this.isWindows) return false;
        let view = this._getSlideShowView();
        if (!view) {
            view = this._startSlideShow();
            if (view) return true; // スライドショーを開始した場合は、その回はページ送りをスキップ
        }
        
        if (view && view.Next) {
            try {
                view.Next();
                return true;
            } catch (e: unknown) {
                // console.warn('[PowerPointControl] Next() failed:', getErrorMessage(e));
                void e;
            }
        } else {
            // console.warn('[PowerPointControl] Cannot execute Next(): Slide show view not found and could not be started.');
        }
        return false;
    }

    /**
     * 前のスライドへ戻る。
     * @returns 実行成功かどうか
     */
    previous(): boolean {
        if (!this.isWindows) return false;
        let view = this._getSlideShowView();
        if (!view) {
            view = this._startSlideShow();
            if (view) return true; // スライドショーを開始した場合は、その回はページ戻りをスキップ
        }

        if (view && view.Previous) {
            try {
                view.Previous();
                return true;
            } catch (e: unknown) {
                // console.warn('[PowerPointControl] Previous() failed:', getErrorMessage(e));
                void e;
            }
        } else {
            // console.warn('[PowerPointControl] Cannot execute Previous(): Slide show view not found and could not be started.');
        }
        return false;
    }
}

const powerpointControlInstance = new PowerPointControl();
export default powerpointControlInstance;
