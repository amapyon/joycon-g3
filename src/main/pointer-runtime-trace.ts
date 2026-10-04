import type { CursorId } from '../shared/cursor-types';
import type { PointerRuntimeEvent } from '../shared/pointer-runtime-trace';

let enabled = false;
let sequence = 0;
type TraceEntry = { sequence: number; event: PointerRuntimeEvent };
const events: TraceEntry[] = [];
const lastRead: Record<CursorId, number> = { cursorLeft: 0, cursorRight: 0 };

/** @param value 検証モードの有効状態。切り替え時は古い測定を破棄する。 */
export function setRuntimeTraceEnabled(value: boolean): void {
    if (enabled === value) return;
    enabled = value;
    events.length = 0;
    lastRead.cursorLeft = sequence;
    lastRead.cursorRight = sequence;
}

/** @param event 保存する測定。検証時だけ有限件数を保持する。 */
export function appendRuntimeTrace(event: PointerRuntimeEvent): void {
    if (!enabled) return;
    events.push({ sequence: ++sequence, event });
    if (events.length > 256) events.shift();
}

/** @param id 対象カーソル。 @returns 前回の送信後に発生した測定イベント。 */
export function readRuntimeTrace(id: CursorId): PointerRuntimeEvent[] {
    const result = events.filter((entry: TraceEntry): boolean => entry.sequence > lastRead[id] && (!entry.event.id || entry.event.id === id)).map((entry: TraceEntry): PointerRuntimeEvent => entry.event);
    lastRead[id] = sequence;
    return result;
}
