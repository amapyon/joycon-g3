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
            if (this.ppApp.SlideShowWindows && typeof this.ppApp.SlideShowWindows.Count === 'number') {
                // ...省略...
            }
            if (this.ppApp.Presentations && typeof this.ppApp.Presentations.Count === 'number') {
                // ...省略...
            }
        } catch (e: any) {
            console.error('[PPControl] Error getting presentations list:', e.message);
        }
        return presentations;
    }

    setTarget(identifier: string) {
        this.targetPresentationIdentifier = identifier;
    }

    _getSlideShowView(): any | null {
        if (!this.isWindows || !this.targetPresentationIdentifier) return null;
        if (!this.connect()) return null;
        try {
            if (this.ppApp.SlideShowWindows && typeof this.ppApp.SlideShowWindows.Count === 'number') {
                // ...省略...
            }
        } catch (e: any) {
            console.error('[PPControl] Error accessing SlideShowWindows collection:', e.message);
            this.ppApp = null;
        }
        return null;
    }

    next(): boolean {
        if (!this.isWindows) return false;
        const view = this._getSlideShowView();
        if (view) {
            try {
                view.Next();
                return true;
            } catch (e: any) {
                console.warn('[PowerPointControl] Next() failed:', e.message);
            }
        } else {
            console.warn('[PowerPointControl] Cannot execute Next(): Slide show view not found.');
        }
        return false;
    }

    previous(): boolean {
        if (!this.isWindows) return false;
        const view = this._getSlideShowView();
        if (view) {
            try {
                view.Previous();
                return true;
            } catch (e: any) {
                console.warn('[PowerPointControl] Previous() failed:', e.message);
            }
        } else {
            console.warn('[PowerPointControl] Cannot execute Previous(): Slide show view not found.');
        }
        return false;
    }
}

const powerpointControlInstance = new PowerPointControl();
export default powerpointControlInstance;
