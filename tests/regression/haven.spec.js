// @ts-check
// Regression guard for "Your Haven" (src/js/haven.js, the illustrated room on Home):
// room interactions must never touch habit/person state, "starting" a habit must stay
// distinct from completing it, room preferences (lamp/calm) must survive a reload, and
// normal tab navigation plus prefers-reduced-motion must keep working with the room
// present. See CLAUDE.md's "Room interactions are not habit completions".
import { test, expect, boot, seedState, readState } from './helpers.js';

const habit = {
  id: 'h-1', name: 'Take vitamins', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: 'Take vitamins', small: '', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
const MORNING = '2026-09-16T08:00:00';
const TODAY = '2026-09-16';

test.describe('Your Haven: room interactions never touch habit/person state', () => {
  test('tapping the lamp does not change the saved habit state', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING, state: seedState({habits: [habit]})});
    const before = await readState(page);
    await page.locator('.haven-hotspot[data-spot="lamp"]').click();
    await page.waitForTimeout(100);
    expect(await readState(page)).toEqual(before);
  });

  test('tapping a cat, the chair, and the bed never writes a log entry', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING, state: seedState({habits: [habit]})});
    for (const spot of ['cat-laleh', 'chair', 'bed', 'cat-zerin', 'window']) {
      await page.locator(`.haven-hotspot[data-spot="${spot}"]`).click();
      await page.waitForTimeout(500);
    }
    const after = await readState(page);
    expect(Object.keys(after.logs)).toHaveLength(0);
    expect(after.habits.map(h => h.id)).toEqual(['h-1']);
    expect(after.habits[0].full).toBe('Take vitamins'); // unchanged — not normalized away
  });
});

test.describe('Your Haven: starting vs. completing a habit stay distinct', () => {
  test('"Help me start" reveals the existing Do This Next card without logging anything', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING, state: seedState({habits: [habit]})});
    await expect(page.locator('#homeInvite')).toBeVisible();
    await page.locator('#homeInvite button:has-text("Help me start")').click();
    await expect(page.locator('#homeNow')).toContainText('Take vitamins');
    const after = await readState(page);
    expect(Object.keys(after.logs)).toHaveLength(0);
  });

  test('"Just visiting" hides the action card and still logs nothing', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING, state: seedState({habits: [habit]})});
    await page.locator('#homeInvite button:has-text("Just visiting")').click();
    await expect(page.locator('#homeNow')).toBeHidden();
    const after = await readState(page);
    expect(Object.keys(after.logs)).toHaveLength(0);
  });

  test('completing the habit through the existing Done button still logs it normally', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING, state: seedState({habits: [habit]})});
    await page.locator('#homeNow .do-next-btn.primary').click();
    const after = await readState(page);
    expect(after.logs[TODAY]['h-1'].status).toBe('done');
  });
});

test.describe('Your Haven: room preferences survive reload', () => {
  test('lamp state persists across a reload', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING});
    const lamp = page.locator('.haven-hotspot[data-spot="lamp"]');
    await lamp.click();
    await expect(lamp).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await page.waitForTimeout(400);
    await expect(page.locator('.haven-hotspot[data-spot="lamp"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('calm mode persists across a reload and stops ambient animation', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING});
    await page.locator('#havenCalmToggle').click();
    await expect(page.locator('#havenScene')).toHaveClass(/is-calm/);
    await page.reload();
    await page.waitForTimeout(400);
    await expect(page.locator('#havenScene')).toHaveClass(/is-calm/);
  });

  test('room preferences are not part of the exported/imported backup payload', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING});
    await page.locator('.haven-hotspot[data-spot="lamp"]').click();
    const havenKeyInState = await page.evaluate(() => JSON.stringify(state).includes('lampOn'));
    expect(havenKeyInState).toBe(false);
  });
});

test.describe('Your Haven: navigation and reduced motion keep working', () => {
  test('bottom-tab navigation away from and back to Home still works with the room present', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING});
    await page.locator('.tab[data-view="todayView"]').click();
    await expect(page.locator('.view.active')).toHaveAttribute('id', 'todayView');
    await page.locator('.tab[data-view="homeView"]').click();
    await expect(page.locator('.view.active')).toHaveAttribute('id', 'homeView');
  });

  test('prefers-reduced-motion walks the character without a CSS transition', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await boot(page, {view: 'homeView', at: MORNING});
    const transition = await page.evaluate(async () => {
      havenHandleTap('chair');
      await new Promise(r => setTimeout(r, 60));
      return document.getElementById('havenCharacter').style.transition;
    });
    expect(transition).toBe('none');
  });

  test('the room is paused (no running ambient animation) while a different tab is active', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING});
    await page.locator('.tab[data-view="todayView"]').click();
    await expect(page.locator('#havenScene')).toHaveClass(/is-paused/);
    await page.locator('.tab[data-view="homeView"]').click();
    await expect(page.locator('#havenScene')).not.toHaveClass(/is-paused/);
  });
});
