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
     * ★開かれているプレゼンテーションのリストを取得★
     * @returns {Array<{id: string, name: string, isRunning: boolean}>} プレゼンテーション情報の配列
     */
    getOpenPresentations() {
        const presentations = [];
        if (!this.connect()) { // 接続試行
            console.warn("[PowerPointControl] Cannot get presentations, not connected.");
            return presentations;
        }
        try {
            // ★ 実行中のスライドショーのファイルパス(FullName)を先にリストアップ ★
            let runningSlideShowPaths = new Set(); // 重複を避けるためSetを使用
            if (this.ppApp.SlideShowWindows && typeof this.ppApp.SlideShowWindows.Count === 'number') {
                const sswCount = this.ppApp.SlideShowWindows.Count;
                console.log(`[PPControl] Found ${sswCount} running slide show windows.`);
                for (let j = 1; j <= sswCount; j++) { // 1ベースインデックス
                    try {
                        // SlideShowWindowオブジェクトを取得 (Item(j) または (j) を試す)
                        // 前回 Presentations で Item(j) が必要だったので、こちらも Item(j) を使う
                        const ssw = this.ppApp.SlideShowWindows.Item(j);
                        // const ssw = this.ppApp.SlideShowWindows(j); // もし Item(j) でエラーならこちら

                        // そのウィンドウに対応するプレゼンテーションのフルパスを取得
                        if (ssw && ssw.Presentation && ssw.Presentation.FullName) {
                            runningSlideShowPaths.add(ssw.Presentation.FullName);
                        }
                    } catch (sswError) {
                        console.warn(`[PPControl] Error accessing SlideShowWindow at index ${j}:`, sswError.message);
                    }
                }
                console.log("[PPControl] Running slide show paths:", Array.from(runningSlideShowPaths));
            } else {
            console.warn("[PPControl] SlideShowWindows collection not available or empty.");
            }

            // Presentations コレクションを取得
            if (this.ppApp.Presentations && typeof this.ppApp.Presentations.Count === 'number') {
                const count = this.ppApp.Presentations.Count;
                console.log(`[PowerPointControl] Found ${count} presentations.`);
                // 各プレゼンテーション情報を取得 (COMコレクションは通常1ベースインデックス)
                for (let i = 1; i <= count; i++) {
                    try {
                        const pres = this.ppApp.Presentations.Item(i);
                        if (pres && pres.FullName) { // 有効なオブジェクトか確認
                            const isSlideShowRunning = runningSlideShowPaths.has(pres.FullName);

                            presentations.push({
                                id: pres.FullName, // フルパスをIDとして使用
                                name: pres.Name,   // ファイル名
                                isRunning: isSlideShowRunning // スライドショー実行中フラグ
                            });
                        }
                    } catch (e) {
                        console.warn(`[PPControl] Error accessing presentation at index ${i}:`, e.message);
                    }
                }
            } else {
                console.warn("[PPControl] Presentations collection not available.");
            }
        } catch (e) {
            console.error("[PPControl] Error getting presentations list:", e.message);
        }
        return presentations;
    }

    /**
     * ★操作対象のプレゼンテーションを設定★
     * @param {string} identifier - 対象プレゼンテーションの識別子 (FullName)
     */
    setTarget(identifier) {
        console.log(`[PPControl] Setting target presentation to: ${identifier}`);
        this.targetPresentationIdentifier = identifier;
    }
    
    /**
     * 現在実行中のスライドショーの View オブジェクトを取得試行 (内部利用)
     * @returns {object | null} View オブジェクトまたは null
     */
    _getSlideShowView() {
        if (!this.isWindows || !this.targetPresentationIdentifier) {
            // console.warn("[PPControl] Target presentation not set."); // ターゲットがまだない場合はログを出さない方が静かかも
            return null;
        }
        if (!this.connect()) return null; // 接続確認

        try {
            // SlideShowWindows コレクションを検索する方がより確実
            if (this.ppApp.SlideShowWindows && typeof this.ppApp.SlideShowWindows.Count === 'number') {
                const count = this.ppApp.SlideShowWindows.Count;
                for (let i = 1; i <= count; i++) { // 1ベースインデックス
                    try {
                        const ssw = this.ppApp.SlideShowWindows.Item(i);
                        // 対応するプレゼンテーションの SlideShowWindow かどうかを確認
                        if (ssw.Presentation && ssw.Presentation.FullName === this.targetPresentationIdentifier) {
                            // View オブジェクトが有効か確認
                            if (ssw.View && typeof ssw.View.Next === 'function' && typeof ssw.View.Previous === 'function') {
                                // console.log(`[PPControl] Found matching SlideShowView for target.`); // デバッグ用
                                return ssw.View; // 発見したらViewを返す
                            }
                        }
                    } catch(e) {
                        console.warn(`[PPControl] Error checking SlideShowWindow at index ${i}:`, e.message); 
                    }
                }
                console.warn(`[PPControl] No running SlideShowWindow found matching target: ${this.targetPresentationIdentifier}`);
            } else {
                console.warn("[PPControl] SlideShowWindows collection not available.");
            }
        } catch (e) {
            // エラー時は接続リセット推奨
            console.error("[PPControl] Error accessing SlideShowWindows collection:", e.message);
            this.ppApp = null;
        } 
        return null; // 見つからなかった場合
    }

    /** 次のスライド/アニメーションへ */
    next() { // ★ next メソッド ★
        if (!this.isWindows) return false;
        const view = this._getSlideShowView(); // Viewオブジェクトを取得
        if (view) {
            try {
                console.log("[PowerPointControl] Executing View.Next()");
                view.Next();
                return true;
            }
            catch (e) {
                console.error("[PowerPointControl] Error calling Next():", e.message);
             }
        } else {
            console.warn("[PowerPointControl] Cannot execute Next(): Slide show view not found.");
        }
        return false; // 失敗
    }

    /** 前のスライド/アニメーションへ */
    previous() { // ★ previous メソッド ★
        if (!this.isWindows) return false;
        const view = this._getSlideShowView(); // Viewオブジェクトを取得
        if (view) {
            try {
                console.log("[PowerPointControl] Executing View.Previous()");
                view.Previous();
                return true;
            }
            catch (e) {
                console.error("[PowerPointControl] Error calling Previous():", e.message);
            }
        } else {
            console.warn("[PowerPointControl] Cannot execute Previous(): Slide show view not found.");
        }
        return false; // 失敗
    }
}

// --- ★ クラスのインスタンスを作成してエクスポート ★ ---
const powerpointControlInstance = new PowerPointControl();
module.exports = powerpointControlInstance;
