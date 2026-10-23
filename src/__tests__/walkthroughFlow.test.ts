// T-25 (AC-41): the Maestro walkthrough is generated from the engine solution and must not drift.
import { walkthroughYaml } from '../testing/walkthroughFlow';
import { FAST_LINK } from '../testing/fastMode';

const fs = jest.requireActual('fs');
const path = jest.requireActual('path');
const FILE = path.join(process.cwd(), '.maestro', '06-walkthrough.yaml');

describe('walkthrough flow (AC-41)', () => {
  it('matches the engine solution (UPDATE_FLOWS=1 rewrites it)', () => {
    const yaml = walkthroughYaml();
    if (process.env.UPDATE_FLOWS === '1') fs.writeFileSync(FILE, yaml);
    expect(fs.readFileSync(FILE, 'utf8')).toBe(yaml);
  });

  it('runs in fast mode, plays the key steps and ends on the ending screen', () => {
    const yaml = walkthroughYaml();
    expect(yaml).toContain(`openLink: "${FAST_LINK}"`);
    expect(yaml).toContain('id: "hs-front.doormat"');
    expect(yaml).toContain('id: "chess-sq-g8"');
    expect(yaml).toContain('id: "keypad-digit-7"');
    expect(yaml).toContain('id: "hs-laundry.notebook"');
    // The timers: Papa cooking, Papa back at his desk, the parcel delivered; the sequence pads.
    for (const marker of ['dad-cooking', 'dad-at_desk', 'delivered', 'pad', 'pad-1987', 'pad-green']) expect(yaml).toContain(`id: "${marker}"`);
    expect(yaml).toContain('id: "keypad-digit-2"');
    expect(yaml).toContain('readme-2-game');
    expect(yaml).toContain('readme-3-ending');
    expect(yaml).toContain('id: "ending-captures"');
  });
});
