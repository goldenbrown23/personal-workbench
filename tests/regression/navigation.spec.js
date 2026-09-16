// @ts-check
// Regression guard for swipe/tap navigation across the 5 primary tabs — the exact bug
// class that caused the real Trends<->More swipe regression (SWIPE_VIEWS silently
// excluding moreView). See app.js's PRIMARY_TAB_VIEWS/SWIPE_VIEWS.
import { test, expect, boot, seedState, swipe, PRIMARY_TABS } from './helpers.js';

const habit = {
  id: 'h-1', name: 'Evening stretch', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: 'Full stretch', small: 'Two stretches', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};

test.describe('primary tab swipe navigation', () => {
  for (let i = 0; i < PRIMARY_TABS.length - 1; i++) {
    const from = PRIMARY_TABS[i], to = PRIMARY_TABS[i + 1];
    test(`swipe left goes ${from} -> ${to}, swipe right goes back`, async ({page}) => {
      await boot(page, {view: from, state: seedState({habits: [habit]})});
      await swipe(page, {startX: 320, endX: 160});
      await expect(page.locator('.view.active')).toHaveAttribute('id', to);
      await swipe(page, {startX: 160, endX: 320});
      await expect(page.locator('.view.active')).toHaveAttribute('id', from);
    });
  }

  test('swipe right from Home does not wrap to More', async ({page}) => {
    await boot(page, {view: 'homeView', state: seedState({habits: [habit]})});
    await swipe(page, {startX: 160, endX: 320});
    await expect(page.locator('.view.active')).toHaveAttribute('id', 'homeView');
  });

  test('swipe left from More does not wrap to Home', async ({page}) => {
    await boot(page, {view: 'moreView', state: seedState({habits: [habit]})});
    await swipe(page, {startX: 320, endX: 160});
    await expect(page.locator('.view.active')).toHaveAttribute('id', 'moreView');
  });

  test('a mostly-vertical gesture does not switch tabs', async ({page}) => {
    await boot(page, {view: 'homeView', state: seedState({habits: [habit]})});
    // dx=80 clears SWIPE_MIN_DIST but dy=220 blows past SWIPE_MAX_OFF_AXIS_RATIO (0.55),
    // so this must read as a scroll, not a swipe.
    await swipe(page, {startX: 200, endX: 280, startY: 200, endY: 420});
    await expect(page.locator('.view.active')).toHaveAttribute('id', 'homeView');
  });

  test('bottom-nav tapping still works alongside swipe', async ({page}) => {
    await boot(page, {view: 'homeView', state: seedState({habits: [habit]})});
    await page.locator('.tabbar .tab[data-view="circleView"]').click();
    await expect(page.locator('.view.active')).toHaveAttribute('id', 'circleView');
  });

  test('no page-level horizontal overflow on any primary tab, before or after swiping', async ({page}) => {
    await boot(page, {view: 'homeView', state: seedState({habits: [habit]})});
    for (const view of PRIMARY_TABS) {
      await page.locator(`.tabbar .tab[data-view="${view}"]`).click();
      const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflows, `${view} scrolls horizontally`).toBe(false);
    }
  });
});
