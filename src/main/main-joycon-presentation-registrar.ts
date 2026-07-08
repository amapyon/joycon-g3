import { JOYCON_MANAGER_EVENTS } from '../shared/joycon-event-channels';
import type { JoyConEventsContext } from './main-joycon-events-types';

/**
 * プレゼン送りイベントを登録する。
 * @param context イベント登録コンテキスト
 */
export function registerPresentationHandlers(context: JoyConEventsContext): void {
    const { joyConManager, powerpointControl, googleSlidesControl } = context.options;

    joyConManager.on(JOYCON_MANAGER_EVENTS.PPT_NEXT, (): void => {
        if (googleSlidesControl.hasTarget()) {
            googleSlidesControl.next();
            return;
        }
        const handled = powerpointControl.next();
        if (!handled && !powerpointControl.hasTarget()) {
            googleSlidesControl.next();
        }
    });

    joyConManager.on(JOYCON_MANAGER_EVENTS.PPT_PREV, (): void => {
        if (googleSlidesControl.hasTarget()) {
            googleSlidesControl.previous();
            return;
        }
        const handled = powerpointControl.previous();
        if (!handled && !powerpointControl.hasTarget()) {
            googleSlidesControl.previous();
        }
    });
}
