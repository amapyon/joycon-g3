// main-renderer.js

// --- HTML要素への参照を取得 ---
const displaySelect = document.getElementById('display-select');
const launchButton = document.getElementById('launch-button');
const closeButton = document.getElementById('close-button'); // 閉じるボタン
const errorMessageDiv = document.getElementById('error-message');
// Joy-Conステータス表示用
const mainStatusLeft = document.getElementById('main-status-left');
const mainStatusRight = document.getElementById('main-status-right');
const pptSelect = document.getElementById('ppt-select'); // ★PPT選択要素の参照★

// --- イベントリスナー設定 ---

/**
 * ディスプレイリストを受信し、ドロップダウンメニューを生成するリスナー
 */
window.electronAPI.onAvailableDisplays((displays) => {
    console.log("Main Renderer: Received displays", displays);
    displaySelect.innerHTML = ''; // ドロップダウンをクリア

    if (displays && displays.length > 0) {
        displays.forEach(display => {
            const option = document.createElement('option');
            option.value = display.id; // valueにディスプレイIDを設定
            option.textContent = display.label; // 表示テキスト
            displaySelect.appendChild(option);
        });
        // UIを有効化
        displaySelect.disabled = false;
        launchButton.disabled = false;
        errorMessageDiv.textContent = ''; // エラーメッセージをクリア
    } else {
        // ディスプレイが見つからない場合
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "-- No Displays Found --";
        displaySelect.appendChild(option);
        displaySelect.disabled = true;
        launchButton.disabled = true;
        errorMessageDiv.textContent = 'Could not detect any displays.';
    }
    // カーソルウィンドウが開いていなければ閉じるボタンは隠す
    // (起動直後なので隠れた状態のまま)
    closeButton.style.display = 'none';
});

// ★プレゼンテーションリスト受信リスナーを追加★
window.electronAPI.onAvailablePresentations((presentations) => {
    console.log("Main Renderer: Received presentations:", presentations);
    pptSelect.innerHTML = ''; // ドロップダウンをクリア

    if (presentations && presentations.length > 0) {
         let firstRunningShowId = null; // 最初に実行中のスライドショーIDを記憶
         presentations.forEach((pres, index) => {
             const option = document.createElement('option');
             option.value = pres.id; // valueに識別子(FullName)を設定
             option.textContent = pres.name; // ファイル名を表示
             if (pres.isRunning) {
                 option.textContent += " (Slide Show Active)"; // 実行中表示
                 option.style.fontWeight = 'bold'; // 太字にするなど
                 if (!firstRunningShowId) {
                     firstRunningShowId = pres.id; // 最初の実行中IDを保持
                 }
             }
             pptSelect.appendChild(option);
         });
         pptSelect.disabled = false; // 選択可能に

         // スライドショー実行中のものが最初にあればそれを選択、なければ最初のものを選択
         const targetIdToSelect = firstRunningShowId || presentations[0].id;
         pptSelect.value = targetIdToSelect;
         // 初期ターゲットをメインプロセスに通知
         window.electronAPI.setTargetPresentation(targetIdToSelect);
         console.log(`Main Renderer: Initial target presentation set to: ${targetIdToSelect}`);

    } else {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "-- No Presentations Open --";
        pptSelect.appendChild(option);
        pptSelect.disabled = true; // 選択不可に
        // ターゲットなしを通知？ (任意)
        window.electronAPI.setTargetPresentation(null);
    }
});

// ★プレゼンテーション選択変更時のイベントリスナーを追加★
pptSelect.addEventListener('change', () => {
    const selectedId = pptSelect.value;
    if (selectedId) {
        console.log(`Main Renderer: Setting target presentation to: ${selectedId}`);
        window.electronAPI.setTargetPresentation(selectedId); // 選択をメインプロセスに通知
    } else {
         console.log(`Main Renderer: No presentation selected.`);
         window.electronAPI.setTargetPresentation(null); // ターゲット解除を通知
    }
});

/**
 * 「Launch Cursor Window」ボタンのクリックイベントリスナー
 */
launchButton.addEventListener('click', () => {
    const selectedDisplayId = displaySelect.value;
    if (selectedDisplayId) {
        console.log(`Main Renderer: Requesting launch on display ID: ${selectedDisplayId}`);
        errorMessageDiv.textContent = 'Launching cursor window...';
        // 起動中はUIを無効化
        launchButton.disabled = true;
        displaySelect.disabled = true;
        // mainプロセスに起動指示を送信
        window.electronAPI.launchCursorWindow(selectedDisplayId);
        // ★起動指示を出したら閉じるボタンを表示★
        closeButton.style.display = 'inline-block';
    } else {
        errorMessageDiv.textContent = 'Please select a display first.';
    }
});

/**
 * 「Close Cursor Window」ボタンのクリックイベントリスナー
 */
closeButton.addEventListener('click', () => {
    console.log("Main Renderer: Requesting to close cursor window...");
    errorMessageDiv.textContent = 'Closing cursor window...';
    window.electronAPI.closeCursorWindow(); // mainプロセスに閉じるよう指示
    // UIの状態更新は onCursorWindowClosed イベントで行う
});

/**
 * カーソルウィンドウが閉じた通知を受け取るリスナー
 */
window.electronAPI.onCursorWindowClosed(() => {
    console.log("Main Renderer: Cursor window closed notification received.");
    errorMessageDiv.textContent = 'Cursor window closed. Select a display to launch again.';
    // UIを再度有効化
    displaySelect.disabled = false;
    launchButton.disabled = false;
    // 閉じるボタンを隠す
    closeButton.style.display = 'none';
});

/**
 * カーソルウィンドウ起動エラーの通知を受け取るリスナー
 */
window.electronAPI.onLaunchError((message) => {
    console.error("Main Renderer: Launch Error received:", message);
    errorMessageDiv.textContent = `Error launching cursor window: ${message}`;
    // エラー発生時は再度選択できるようにUIを有効化
    launchButton.disabled = false;
    displaySelect.disabled = false;
    closeButton.style.display = 'none'; // エラー時は閉じるボタンも隠す
});

/**
 * Joy-Con接続状態の更新を受け取るリスナー
 */
window.electronAPI.onJoyConStatusUpdate((status) => {
    console.log('Main Renderer: Received status update:', status);
    // 左Joy-Conの状態を更新
    if (mainStatusLeft) {
        mainStatusLeft.textContent = status.leftConnected ? 'Left: Connected' : 'Left: Disconnected';
        // CSSクラスを付け替える (style.cssで定義されたスタイルが適用される)
        mainStatusLeft.className = status.leftConnected ? 'connected' : 'disconnected';
    }
    // 右Joy-Conの状態を更新
    if (mainStatusRight) {
        mainStatusRight.textContent = status.rightConnected ? 'Right: Connected' : 'Right: Disconnected';
        mainStatusRight.className = status.rightConnected ? 'connected' : 'disconnected';
    }
});

// --- 初期状態設定 ---
// 起動ボタンと閉じるボタンは最初は無効/非表示 (ディスプレイリスト受信後に有効化)
launchButton.disabled = true;
closeButton.style.display = 'none';
pptSelect.disabled = true; // ★PPT選択も最初は無効★

console.log('Main Renderer script loaded.');
