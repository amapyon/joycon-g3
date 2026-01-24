// powerpoint-control.ts
import winax from 'winax';

class PowerPointControl {
    ppApp: any = null;
    isWindows: boolean = process.platform === 'win32';
    targetPresentationIdentifier?: string;

    constructor() {
        if (!this.isWindows) {
            console.warn('[PowerPointControl] PowerPoint automation is only supported on Windows.');
        }
    }

    connect(): boolean {
        if (!this.isWindows) return false;
        if (this.ppApp && !this.ppApp.isNull) return true;
        try {
            this.ppApp = new winax.Object('PowerPoint.Application', { activate: true });
            if (!this.ppApp || this.ppApp.isNull) {
                throw new Error('Failed to create or connect to PowerPoint.Application object (maybe null).');
            }
            return true;
        } catch (e: any) {
            console.warn('[PowerPointControl] Could not connect to PowerPoint instance.', e.message);
            this.ppApp = null;
            return false;
        }
    }

    getOpenPresentations(): Array<{ id: string; name: string; isRunning: boolean }> {
        const presentations: Array<{ id: string; name: string; isRunning: boolean }> = [];
        if (!this.connect()) return presentations;
        try {
            let runningSlideShowPaths = new Set<string>();
            // 実行中のスライドショーウィンドウからパスを収集
            if (this.ppApp.SlideShowWindows && typeof this.ppApp.SlideShowWindows.Count === 'number') {
                for (let i = 1; i <= this.ppApp.SlideShowWindows.Count; i++) {
                    const slideShowWindow = this.ppApp.SlideShowWindows.Item(i);
                    if (slideShowWindow && slideShowWindow.Presentation) {
                        runningSlideShowPaths.add(slideShowWindow.Presentation.FullName);
                    }
                }
            }

            // 開いているすべてのプレゼンテーションを列挙
            if (this.ppApp.Presentations && typeof this.ppApp.Presentations.Count === 'number') {
                for (let i = 1; i <= this.ppApp.Presentations.Count; i++) {
                    const presentation = this.ppApp.Presentations.Item(i);
                    if (presentation) {
                        const id = presentation.FullName || presentation.Name; // FullNameがなければNameを使用
                        presentations.push({
                            id: id,
                            name: presentation.Name,
                            isRunning: runningSlideShowPaths.has(presentation.FullName),
                        });
                    }
                }
            }
        } catch (e: any) {
            console.error('[PPControl] Error getting presentations list:', e.message);
        }
        return presentations;
    }

    setTarget(identifier: string) {
        this.targetPresentationIdentifier = identifier;
        this.activateTarget();
    }

    activateTarget(): boolean {
        if (!this.isWindows || !this.targetPresentationIdentifier) return false;
        if (!this.connect()) return false;
        try {
            // 1. まず実行中のスライドショーウィンドウを探してアクティブにする
            if (this.ppApp.SlideShowWindows && typeof this.ppApp.SlideShowWindows.Count === 'number') {
                for (let i = 1; i <= this.ppApp.SlideShowWindows.Count; i++) {
                    const ssw = this.ppApp.SlideShowWindows.Item(i);
                    if (ssw && ssw.Presentation && (ssw.Presentation.FullName === this.targetPresentationIdentifier || ssw.Presentation.Name === this.targetPresentationIdentifier)) {
                        console.log(`[PPControl] Activating SlideShowWindow for: ${ssw.Presentation.Name}`);
                        ssw.Activate();
                        return true;
                    }
                }
            }

            // 2. スライドショーがない場合はプレゼンテーションウィンドウをアクティブにする
            if (this.ppApp.Presentations && typeof this.ppApp.Presentations.Count === 'number') {
                for (let i = 1; i <= this.ppApp.Presentations.Count; i++) {
                    const pres = this.ppApp.Presentations.Item(i);
                    if (pres && (pres.FullName === this.targetPresentationIdentifier || pres.Name === this.targetPresentationIdentifier)) {
                        if (pres.Windows && pres.Windows.Count > 0) {
                            console.log(`[PPControl] Activating Presentation Window for: ${pres.Name}`);
                            pres.Windows.Item(1).Activate();
                            return true;
                        }
                    }
                }
            }
        } catch (e: any) {
            console.error('[PPControl] Error activating target:', e.message);
        }
        return false;
    }

    _getSlideShowView(): any | null {
        if (!this.isWindows || !this.targetPresentationIdentifier) return null;
        if (!this.connect()) return null;
        try {
            if (this.ppApp.SlideShowWindows && typeof this.ppApp.SlideShowWindows.Count === 'number') {
                const count = this.ppApp.SlideShowWindows.Count;
                for (let i = 1; i <= count; i++) {
                    try {
                        const ssw = this.ppApp.SlideShowWindows.Item(i);
                        if (ssw && ssw.Presentation && (ssw.Presentation.FullName === this.targetPresentationIdentifier || ssw.Presentation.Name === this.targetPresentationIdentifier)) {
                            if (ssw.View) {
                                return ssw.View;
                            }
                        }
                    } catch (e: any) {
                        console.warn(`[PPControl] Error checking SlideShowWindow at index ${i}:`, e.message);
                    }
                }
            }
        } catch (e: any) {
            console.error('[PPControl] Error accessing SlideShowWindows collection:', e.message);
            this.ppApp = null;
        }
        return null;
    }

    _startSlideShow(): any | null {
        if (!this.isWindows || !this.targetPresentationIdentifier) return null;
        if (!this.connect()) return null;
        try {
            let targetPres: any = null;
            if (this.ppApp.Presentations && typeof this.ppApp.Presentations.Count === 'number') {
                const count = this.ppApp.Presentations.Count;
                for (let i = 1; i <= count; i++) {
                    const pres = this.ppApp.Presentations.Item(i);
                    if (pres && (pres.FullName === this.targetPresentationIdentifier || pres.Name === this.targetPresentationIdentifier)) {
                        targetPres = pres;
                        break;
                    }
                }
            }

            if (targetPres) {
                console.log(`[PPControl] Starting slide show for: ${targetPres.Name}`);
                
                // Get current slide index from active window if it matches
                let currentSlideIndex = 1;
                try {
                    if (this.ppApp.ActiveWindow && this.ppApp.ActiveWindow.Presentation && (this.ppApp.ActiveWindow.Presentation.FullName === targetPres.FullName || this.ppApp.ActiveWindow.Presentation.Name === targetPres.Name)) {
                        currentSlideIndex = this.ppApp.ActiveWindow.View.Slide.SlideIndex;
                    }
                } catch (e) {
                    // Fallback to start from beginning
                }

                const ssw = targetPres.SlideShowSettings.Run();
                if (ssw && ssw.View) {
                    if (currentSlideIndex > 1) {
                        try {
                            ssw.View.GotoSlide(currentSlideIndex);
                        } catch (e) {}
                    }
                    return ssw.View;
                }
            }
        } catch (e: any) {
            console.error('[PPControl] Error starting slide show:', e.message);
        }
        return null;
    }

    next(): boolean {
        if (!this.isWindows) return false;
        let view = this._getSlideShowView();
        if (!view) {
            view = this._startSlideShow();
            if (view) return true; // スライドショーを開始した場合は、その回はページ送りをスキップ
        }
        
        if (view) {
            try {
                view.Next();
                return true;
            } catch (e: any) {
                console.warn('[PowerPointControl] Next() failed:', e.message);
            }
        } else {
            console.warn('[PowerPointControl] Cannot execute Next(): Slide show view not found and could not be started.');
        }
        return false;
    }

    previous(): boolean {
        if (!this.isWindows) return false;
        let view = this._getSlideShowView();
        if (!view) {
            view = this._startSlideShow();
            if (view) return true; // スライドショーを開始した場合は、その回はページ戻りをスキップ
        }

        if (view) {
            try {
                view.Previous();
                return true;
            } catch (e: any) {
                console.warn('[PowerPointControl] Previous() failed:', e.message);
            }
        } else {
            console.warn('[PowerPointControl] Cannot execute Previous(): Slide show view not found and could not be started.');
        }
        return false;
    }
}

const powerpointControlInstance = new PowerPointControl();
export default powerpointControlInstance;
