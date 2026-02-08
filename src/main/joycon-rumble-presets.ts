import { createRumbleData } from './joycon-rumble-utils';

export const STRONG_RUMBLE_DATA = createRumbleData({
    left: { highFreq: 320, highAmp: 1.0, lowFreq: 160, lowAmp: 1.0 },
    right: { highFreq: 320, highAmp: 1.0, lowFreq: 160, lowAmp: 1.0 },
});

export const RUMBLE_OFF_DATA = createRumbleData({
    left: { highFreq: 320, highAmp: 0.0, lowFreq: 160, lowAmp: 0.0 },
    right: { highFreq: 320, highAmp: 0.0, lowFreq: 160, lowAmp: 0.0 },
});
