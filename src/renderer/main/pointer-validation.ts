((): void => {
    type Diagnostics = import('../../shared/pointer-motion-settings').PointerMotionDiagnostics;
    type Vector = import('../../shared/pointer-motion-settings').PointerValidationVector;
    type RendererAccess = import('../../shared/main-renderer-types').MainRendererAccessApi;
    type Storage = import('../../shared/local-storage-store-types').LocalStorageStoreApi;
    type Accessor = import('../../shared/main-window-api-types').MainWindowApiAccessorApi;
    type Labels = { device: string; posture: string; action: string; note: string };
    type Recording = { schemaVersion: number; labels: Labels; startedAt: string; samples: Diagnostics[] };

    const accessor = (globalThis as typeof globalThis & { mainWindowApiAccessor?: Accessor }).mainWindowApiAccessor;
    if (!accessor) {
        throw new Error('mainWindowApiAccessor is not available');
    }
    const { electronAPI } = accessor.getApi<RendererAccess>('mainRendererAccess').getMainRenderer();
    const storage = accessor.getApi<Storage>('localStorageStore');
    const device = document.getElementById('pointer-validation-device') as HTMLSelectElement;
    const posture = document.getElementById('pointer-validation-posture') as HTMLSelectElement;
    const action = document.getElementById('pointer-validation-action') as HTMLSelectElement;
    const note = document.getElementById('pointer-validation-note') as HTMLInputElement;
    const live = document.getElementById('pointer-validation-live') as HTMLElement;
    const status = document.getElementById('pointer-validation-status') as HTMLElement;
    const result = document.getElementById('pointer-validation-result') as HTMLTextAreaElement;
    const start = document.getElementById('pointer-validation-start') as HTMLButtonElement;
    const stop = document.getElementById('pointer-validation-stop') as HTMLButtonElement;
    const exportButton = document.getElementById('pointer-validation-export') as HTMLButtonElement;
    const copy = document.getElementById('pointer-validation-copy') as HTMLButtonElement;
    const enabled = document.getElementById('pointer-diagnostics-enabled') as HTMLInputElement;
    const labelControls = [device, posture, action, note];
    const storageKey = 'pointerValidationLabels';
    const latest: Partial<Record<string, { data: Diagnostics; receivedAt: number }>> = {};
    let recording: Recording | null = null;
    let startedAt = 0;
    let timer: ReturnType<typeof setInterval> | null = null;
    let lastRenderAt = 0;

    /**
     * フォームから実験ラベルを取得する。
     * @returns 記録対象のラベル
     */
    const readLabels = (): Labels => ({ device: device.value, posture: posture.value, action: action.value, note: note.value });

    /**
     * 3軸値を単位に応じた精度で整形する。
     * @param value 3軸値
     * @param digits 小数桁数
     * @returns X・Y・Z 成分の文字列
     */
    const formatVector = (value: Vector | null, digits: number): string => value
        ? `X ${value.x.toFixed(digits)} / Y ${value.y.toFixed(digits)} / Z ${value.z.toFixed(digits)}`
        : '未確定';

    /**
     * 選択デバイスの最新値と受信状態を画面へ表示する。
     */
    const renderLive = (): void => {
        const entry = latest[device.value];
        if (!enabled.checked) {
            live.textContent = '検証モード停止中';
            return;
        }
        if (!entry?.data.sample) {
            live.textContent = `${device.selectedOptions[0].text}: データ待ち（Joy-Conを接続してください）`;
            return;
        }
        const sample = entry.data.sample;
        const stale = performance.now() - entry.receivedAt > 1000;
        live.textContent = [
            `${device.selectedOptions[0].text}: ${stale ? '受信が途切れています（最終値）' : '受信中'} / ポインター${sample.cursorVisible ? '表示' : '非表示'} / ${sample.isCalibrating ? 'キャリブレーション中（補正値は参考）' : '測定中'}`,
            `補正方式: ${entry.data.coordinateMode === 'gravity-frame' ? '重力基準' : '固定X軸・代替処理'} / 推定保持角 ${entry.data.estimatedXRotationDegrees.toFixed(1)}° / 更新間隔 ${(sample.deltaTimeSeconds * 1000).toFixed(1)} ms`,
            `生加速度: ${formatVector(sample.rawAccel, 0)}`,
            `加速度(G): ${formatVector(sample.accelG, 3)} / 大きさ ${sample.accelerationMagnitudeG.toFixed(3)} G`,
            `生ジャイロ: ${formatVector(sample.rawGyro, 0)}`,
            `バイアス補正後(°/s): ${formatVector(sample.gyroDps, 2)}`,
            `推定重力（共通本体座標）: ${formatVector(sample.gravity, 3)}`,
            `縦回転軸（共通本体座標）: ${formatVector(sample.verticalAxis, 3)}`,
            `画面成分・閾値前（生値相当）: 横 ${sample.projectedGyroRaw.z.toFixed(1)} / 縦 ${sample.projectedGyroRaw.y.toFixed(1)}`,
            `画面成分・閾値後（生値相当）: 横 ${sample.filteredGyroRaw.z.toFixed(1)} / 縦 ${sample.filteredGyroRaw.y.toFixed(1)}`,
            `符号: 横 ${sample.signs.x} / 縦 ${sample.signs.y} / 予定移動(px): 横 ${sample.requestedDeltaPixels.x.toFixed(2)} / 縦 ${sample.requestedDeltaPixels.y.toFixed(2)}`,
            `実移動(px): 横 ${sample.actualDeltaPixels.x.toFixed(2)} / 縦 ${sample.actualDeltaPixels.y.toFixed(2)} （非表示・補正中は0）`,
        ].join('\n');
    };

    /**
     * 記録を終了して、共有可能な JSON と受信件数を表示する。
     */
    const finishRecording = (): void => {
        if (!recording) {
            return;
        }
        if (timer !== null) {
            clearInterval(timer);
            timer = null;
        }
        const samples = recording.samples;
        const runtimeEvents = samples.flatMap((value: Diagnostics) => value.runtimeEvents ?? []);
        result.value = JSON.stringify({
            ...recording,
            finishedAt: new Date().toISOString(),
            runtimeEvents,
            units: { raw: 'センサー生値', accelG: 'G（1/4096換算）', gyroDps: '°/s（2000/32768換算、バイアス補正済み）', gravity: '共通本体座標の単位ベクトル', projectedGyroRaw: '補正後・デッドゾーン前の生値相当', filteredGyroRaw: 'デッドゾーン後の生値相当', deltaPixels: '論理ピクセル、予定値は表示状態に関係なく算出、実値は画面端の制限後' },
            summary: {
                count: samples.length,
                visibleCount: samples.filter((value: Diagnostics): boolean => value.sample?.cursorVisible === true).length,
                calibratingCount: samples.filter((value: Diagnostics): boolean => value.sample?.isCalibrating === true).length,
                firstTimestampMs: samples[0]?.sample?.timestampMs ?? null,
                lastTimestampMs: samples[samples.length - 1]?.sample?.timestampMs ?? null,
            },
        }, null, 2);
        status.textContent = samples.length > 0
            ? `${samples.length}件記録しました。JSON保存または結果をコピーで共有できます。`
            : 'データを受信できませんでした。選択したJoy-Conの接続を確認してください。';
        recording = null;
        start.disabled = false;
        stop.disabled = true;
        labelControls.forEach((control: HTMLInputElement | HTMLSelectElement): void => { control.disabled = false; });
        exportButton.disabled = samples.length === 0;
        copy.disabled = samples.length === 0;
    };

    /**
     * 準備時間を含む有限時間の記録を開始する。
     */
    const startRecording = (): void => {
        if (recording) {
            return;
        }
        if (!enabled.checked) {
            enabled.checked = true;
            enabled.dispatchEvent(new Event('change'));
        }
        recording = { schemaVersion: 2, labels: readLabels(), startedAt: new Date().toISOString(), samples: [] };
        startedAt = performance.now() + 2000;
        start.disabled = true;
        stop.disabled = false;
        labelControls.forEach((control: HTMLInputElement | HTMLSelectElement): void => { control.disabled = true; });
        status.textContent = '準備中：2秒後に記録を開始します。';
        timer = setInterval((): void => {
            const elapsed = performance.now() - startedAt;
            if (!enabled.checked || elapsed >= 5000) {
                finishRecording();
                return;
            }
            status.textContent = elapsed < 0
                ? `準備中：${(-elapsed / 1000).toFixed(1)}秒後に開始`
                : `記録中：残り${((5000 - elapsed) / 1000).toFixed(1)}秒 / ${recording?.samples.length ?? 0}件`;
        }, 100);
    };

    const saved = storage.getJsonValue<Partial<Labels>>(storageKey, {});
    labelControls.forEach((control: HTMLInputElement | HTMLSelectElement, index: number): void => {
        const key = (['device', 'posture', 'action', 'note'] as const)[index];
        const value = saved?.[key];
        if (typeof value === 'string' && (control instanceof HTMLInputElement || Array.from(control.options).some((option: HTMLOptionElement): boolean => option.value === value))) {
            control.value = value;
        }
        control.addEventListener('change', (): void => {
            storage.setJsonValue(storageKey, readLabels());
            renderLive();
        });
    });
    start.addEventListener('click', startRecording);
    stop.addEventListener('click', finishRecording);
    enabled.addEventListener('change', (): void => {
        if (!enabled.checked) {
            finishRecording();
        }
        renderLive();
    });
    copy.addEventListener('click', async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(result.value);
            status.textContent = '結果をコピーしました。チャットへ貼り付けてください。';
        } catch {
            result.focus();
            result.select();
            status.textContent = '下の結果を選択しました。Ctrl+Cでコピーしてください。';
        }
    });
    exportButton.addEventListener('click', (): void => {
        const url = URL.createObjectURL(new Blob([result.value], { type: 'application/json;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `joycon-validation-${Date.now()}.json`;
        link.click();
        setTimeout((): void => URL.revokeObjectURL(url), 1000);
    });
    electronAPI.onPointerMotionDiagnostics((data: Diagnostics): void => {
        if (!enabled.checked || !data.sample) {
            return;
        }
        const now = performance.now();
        latest[data.id] = { data, receivedAt: now };
        if (recording && data.id === recording.labels.device && now >= startedAt && now < startedAt + 5000 && recording.samples.length < 1000) {
            recording.samples.push(data);
        }
        if (now - lastRenderAt >= 100) {
            lastRenderAt = now;
            renderLive();
        }
    });
    const liveTimer = setInterval(renderLive, 1000);
    window.addEventListener('beforeunload', (): void => {
        clearInterval(liveTimer);
        if (timer !== null) {
            clearInterval(timer);
        }
    });
})();
