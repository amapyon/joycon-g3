// powerpoint-control.js
// winax を使って PowerPoint のスライドショーを制御するクラス (Windows専用)

const winax = require('winax');

class PowerPointControl {
    constructor() {
        this.ppApp = null; // PowerPoint Application オブジェクトの参照
        this.isWindows = process.platform === 'win32'; // Windowsかどうか

        if (!this.isWindows) {
            console.warn("[PowerPointControl] PowerPoint automation is only supported on Windows.");
        }
        // アプリケーション起動時に一度接続を試みる (任意)
        // this.connect(); // コンストラクタで呼ぶ必要はない (main.jsで呼ぶため)
    }

    /**
     * PowerPoint Application オブジェクトへの接続を試みる (または維持する)
     * @returns {boolean} 接続に成功または既に接続済みなら true
     */
    connect() { // ★ connect メソッドの定義 ★
        if (!this.isWindows) return false; // Windows以外では何もしない

        // 既に有効な接続があれば再接続しない (isNull は winax のチェック)
        if (this.ppApp && !this.ppApp.isNull) {
            // console.log("[PowerPointControl] Already connected to PowerPoint.");
            return true;
        }

        try {
            console.log("[PowerPointControl] Attempting to connect to PowerPoint.Application...");
            // activate:true オプションで前面に出す試み
            this.ppApp = new winax.Object("PowerPoint.Application", { activate: true });
            if (!this.ppApp || this.ppApp.isNull) {
                throw new Error("Failed to create or connect to PowerPoint.Application object (maybe null).");
            }
            console.log("[PowerPointControl] Connected to PowerPoint Application object.");
            return true;
        } catch (e) {
            console.warn("[PowerPointControl] Could not connect to PowerPoint instance.", e.message);
            this.ppApp = null; // 失敗したら参照をクリア
            return false;
        }
    }

    /**
     * 現在実行中のスライドショーの View オブジェクトを取得試行 (内部利用)
     * @returns {object | null} View オブジェクトまたは null
     */
    _getSlideShowView() { // ★ _getSlideShowView メソッド ★
        if (!this.isWindows) return null;

        // 接続されていなければ接続試行 (connectメソッドを呼ぶ)
        if (!this.connect()) {
            return null;
        }

        try {
            // ActivePresentation -> SlideShowWindow -> View のパスで取得を試みる
            if (this.ppApp.Presentations && typeof this.ppApp.Presentations.Count === 'number' && this.ppApp.Presentations.Count > 0 && this.ppApp.ActivePresentation) {
                const pres = this.ppApp.ActivePresentation;
                if (pres.SlideShowWindow && pres.SlideShowWindow.View &&
                    typeof pres.SlideShowWindow.View.Next === 'function' &&
                    typeof pres.SlideShowWindow.View.Previous === 'function')
                {
                    return pres.SlideShowWindow.View; // Viewオブジェクトを返す
                } else { /* console.warn(...) */ }
            } else { /* console.warn(...) */ }
        } catch (e) { console.error("[PowerPointControl] Error accessing PowerPoint properties:", e.message); }
        return null; // 見つからなかった場合
    }

    /** 次のスライド/アニメーションへ */
    next() { // ★ next メソッド ★
        if (!this.isWindows) return false;
        const view = this._getSlideShowView(); // Viewオブジェクトを取得
        if (view) {
            try { console.log("[PowerPointControl] Executing View.Next()"); view.Next(); return true; }
            catch (e) { console.error("[PowerPointControl] Error calling Next():", e.message); }
        } else { console.warn("[PowerPointControl] Cannot execute Next(): Slide show view not found."); }
        return false; // 失敗
    }

    /** 前のスライド/アニメーションへ */
    previous() { // ★ previous メソッド ★
        if (!this.isWindows) return false;
        const view = this._getSlideShowView(); // Viewオブジェクトを取得
        if (view) {
            try { console.log("[PowerPointControl] Executing View.Previous()"); view.Previous(); return true; }
            catch (e) { console.error("[PowerPointControl] Error calling Previous():", e.message); }
        } else { console.warn("[PowerPointControl] Cannot execute Previous(): Slide show view not found."); }
        return false; // 失敗
    }
}

// --- ★ クラスのインスタンスを作成してエクスポート ★ ---
const powerpointControlInstance = new PowerPointControl();
module.exports = powerpointControlInstance;
