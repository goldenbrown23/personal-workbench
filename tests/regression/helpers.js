// @ts-check
// Shared helpers for the regression suite. Reuses the exact boot/seed pattern already
// established in tests/workbench.spec.js and tests/audit-integrity.spec.js — no parallel
// testing framework, just the same conventions collected in one place so the five
// regression spec files don't each redefine them.
import { test as base, expect } from '@playwright/test';

export const STORAGE_KEY = 'return_habit_tracker_v1';
export const VIEW_KEY = 'personal_workbench_last_view';
export const PRIMARY_TABS = ['homeView', 'todayView', 'circleView', 'weekView', 'moreView'];

// Shared habit fixtures reused verbatim across completion-status-integrity.spec.js,
// gentle-day-integrity.spec.js, and last-7-days-summary.spec.js — kept here once rather
// than redefined per file so the Goal Plan shapes they test against can't quietly drift
// out of sync between suites that all depend on the exact same "bare"/"full-only"/
// "full+small"/"weekly, no versions" combinations.
export const bareHabit = {
  id: 'h-bare', name: 'Night Face Wash', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: '', small: '', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
// Whitespace-only values must trim to "nothing configured" exactly like empty strings —
// the bug's root fields (homePrimaryTier's bareMin/smaller/full) already trim, but the
// fallback status they defaulted to was wrong regardless of how "empty" was spelled.
export const whitespaceOnlyHabit = {
  id: 'h-whitespace', name: 'Evening Reset', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: '   ', small: '  \t ', small2: ' ',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
export const fullOnlyHabit = {
  id: 'h-full-only', name: 'Wash Face', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: 'Wash face for 60 seconds', small: '', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
export const fullSmallHabit = {
  id: 'h-full-small', name: 'Wash Face Plus', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: 'Wash face for 60 seconds', small: 'Use a cleansing wipe', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
export const weeklyBareHabit = {
  id: 'h-weekly-bare', name: 'Call a Friend', icon: 'phone', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: '', small: '', small2: '',
  scheduleType: 'weekly', weekdays: [], weeklyTarget: 2, paused: false,
};
// Plain daily habit with a Full + Small version, used by both the Last 7 Days summary
// tests and the obsolete-explainer-removal tests.
export const dailyHabit = {
  id: 'h-daily', name: 'Morning walk', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: 'Full walk', small: 'Short walk', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};

export function seedState(overrides = {}) {
  return {
    habits: [], logs: {}, people: [], dayNotes: {},
    settings: {
      startScreen: 'last', compactMode: false, hapticsEnabled: false, backupReminderEnabled: false,
      guideOpened: true, firstUsedAt: '2026-01-01T00:00:00.000Z', lastBackupAt: null,
      backupRemindAfter: null, pinnedModules: [],
    },
    ...overrides,
  };
}

/**
 * Boots the app with deterministic seeded state and a fixed wall clock, unregistering
 * any leftover service worker/caches first — a stale SW previously masked real fixes by
 * serving old JS during manual QA, so every regression run starts genuinely clean rather
 * than relying on the browser profile being empty.
 */
export async function boot(page, {state = seedState(), view = 'homeView', at = '2026-09-14T10:00:00'} = {}) {
  await page.clock.setFixedTime(new Date(at));
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
    }
    if (window.caches) caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  });
  await page.addInitScript(([key, viewKey, value, startView]) => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    localStorage.clear();
    localStorage.setItem(key, value);
    localStorage.setItem(viewKey, startView);
  }, [STORAGE_KEY, VIEW_KEY, JSON.stringify(state), view]);
  await page.goto('/index.html');
  await expect(page.locator('.view.active')).toHaveAttribute('id', view);
  // The service worker's clients.claim() on first activation fires a controllerchange that
  // update.js reloads the page for (a real, one-time reload on fresh storage, not a bug).
  // Let it settle before any evaluate/locator call — see workbench.spec.js's boot() for the
  // same note; this is the source of that file's documented "Execution context was
  // destroyed" flake if skipped.
  await page.waitForTimeout(400);
  await expect(page.locator('.view.active')).toHaveAttribute('id', view);
}

export const readState = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);

/**
 * Dispatches the same synthetic touchstart/touchmove/touchend sequence app.js's swipe
 * handler listens for (see onSwipeStart/onSwipeMove/onSwipeEnd in src/js/app.js).
 * Playwright's built-in touchscreen API only supports tap, so a real drag has to be
 * built from raw Touch/TouchEvent objects. Defaults keep well clear of SWIPE_EDGE_GUARD
 * (24px) so the gesture isn't mistaken for iOS's own edge-swipe-back, which the handler
 * deliberately ignores.
 */
export async function swipe(page, {startX, endX, startY = 420, endY = startY, steps = 6, selector = '.app'} = {}) {
  await page.evaluate(([sel, startX, endX, startY, endY, steps]) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`swipe(): no element for selector ${sel}`);
    let seq = 1;
    const dispatch = (type, x, y) => {
      const touch = new Touch({identifier: 1, target: el, clientX: x, clientY: y, pageX: x, pageY: y});
      const isEnd = type === 'touchend';
      el.dispatchEvent(new TouchEvent(type, {
        bubbles: true, cancelable: true,
        touches: isEnd ? [] : [touch],
        targetTouches: isEnd ? [] : [touch],
        changedTouches: [touch],
      }));
      seq++;
    };
    dispatch('touchstart', startX, startY);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      dispatch('touchmove', startX + (endX - startX) * t, startY + (endY - startY) * t);
    }
    dispatch('touchend', endX, endY);
    void seq;
  }, [selector, startX, endX, startY, endY, steps]);
}

/**
 * A test fixture, not a manually-repeated listener: every regression test automatically
 * fails if the page logs a console.error or an uncaught exception during it, mirroring
 * workbench.spec.js's standalone "boots with no console errors" test but applied to every
 * test in this suite instead of just one boot check (issue #16 in the QA brief).
 */
export const test = base.extend({
  page: async ({page}, use) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(String(err)));
    await use(page);
    expect(errors, `unexpected console errors:\n${errors.join('\n')}`).toEqual([]);
  },
});

export { expect };
