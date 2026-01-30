import { createStrongTripleRumblePattern } from '../main/rumble-pattern';

describe('振動パターン', (): void => {
    it('強めトリプルは 1 秒以内', (): void => {
        const steps = createStrongTripleRumblePattern();
        const total = steps.reduce((sum: number, step: { durationMs: number }) => sum + step.durationMs, 0);

        expect(steps.length).toBe(6);
        expect(total).toBeLessThanOrEqual(1000);
        expect(steps[0]).toEqual({ on: true, durationMs: 180 });
        expect(steps[steps.length - 1]).toEqual({ on: false, durationMs: 80 });
    });
});
