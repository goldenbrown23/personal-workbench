// @ts-check
// Regression guard for the "3-dot menu floating above sheet" bug previously reported on
// Home's Do This Next card: the overflow button opens the shared statusModal editor
// (see .do-next-overflow's onclick in home.js), which must render above the card with a
// visible backdrop, lock body scroll while open, and leave no stale state after closing —
// including on a second open/close cycle, since stale MutationObserver/class state is
// exactly the kind of thing that only shows up the second time.
import { test, expect, boot, seedState } from './helpers.js';

const habit = {
  id: 'h-1', name: 'Evening stretch', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: 'Full stretch', small: 'Two stretches', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};

test('Do This Next overflow sheet stacks above the card and cleans up on close, twice', async ({page}) => {
  await boot(page, {view: 'homeView', at: '2026-09-14T20:00:00', state: seedState({habits: [habit]})});
  await expect(page.locator('#homeNow')).toContainText('Evening stretch');

  for (let round = 0; round < 2; round++) {
    await page.locator('#homeNow .do-next-overflow').click();

    const sheet = page.locator('#statusModal');
    await expect(sheet).toHaveClass(/show/);
    await expect(sheet).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/sheet-open/);

    // The sheet must render above the Home card, not behind it.
    const {sheetZ, cardZ, sheetVisible} = await page.evaluate(() => {
      const sheet = document.getElementById('statusModal');
      const card = document.querySelector('#homeNow');
      const sr = sheet.getBoundingClientRect();
      const topEl = document.elementFromPoint(sr.left + sr.width / 2, sr.top + 10);
      return {
        sheetZ: Number(getComputedStyle(sheet).zIndex) || 0,
        cardZ: Number(getComputedStyle(card).zIndex) || 0,
        sheetVisible: Boolean(topEl && sheet.contains(topEl)),
      };
    });
    expect(sheetVisible, 'the sheet is not the topmost element at its own bounding box').toBe(true);
    expect(sheetZ).toBeGreaterThanOrEqual(cardZ);

    await page.locator('#closeStatusModal').click();
    await expect(sheet).not.toHaveClass(/show/);
    await expect(page.locator('body')).not.toHaveClass(/sheet-open/);
    // No stale inert/aria-hidden mismatch and no stray focus trap left behind.
    await expect(sheet).toHaveAttribute('aria-hidden', 'true');
  }
});
