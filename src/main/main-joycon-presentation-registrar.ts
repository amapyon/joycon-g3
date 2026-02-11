import { JOYCON_MANAGER_EVENTS } from '../shared/joycon-event-channels';
import type { JoyConEventsContext } from './main-joycon-events-types';

/**
 * プレゼン送りイベントを登録する。
 * @param context イベント登録コンテキスト
 */
export function registerPresentationHandlers(context: JoyConEventsContext): void {
    const { joyConManager, powerpointControl, googleSlidesControl } = context.options;

    joyConManager.on(JOYCON_MANAGER_EVENTS.PPT_NEXT, (): void => {
        const handled = powerpointControl.next();
        if (!handled) {
            googleSlidesControl.next();
        }
    });

    joyConManager.on(JOYCON_MANAGER_EVENTS.PPT_PREV, (): void => {
        const handled = powerpointControl.previous();
        if (!handled) {
            googleSlidesControl.previous();
        }
    });
}
