// @ts-check
// Regression guard for removing the obsolete "The idea behind Done, Counted, and Returned"
// explainer disclosure from Weekly Detail (practiceView). It taught a pre-refactor model
// (Done/Counted/Returned as four mutually exclusive statuses, with an example timeline
// literally showing a "↩ Returned" status chip) that the Last 7 Days summary redesign moved
// away from — Return is now secondary context on a Regular/Smaller completion, not a fourth
// bucket. The philosophy it existed to teach ("a miss is data, returning is the skill") is
// already communicated elsewhere on this page (the "Return, don't redesign" intro / "Why we
// track this way" disclosure, and the real Insights "Returns"/"Recent Returns" data), so the
// explainer was removed entirely rather than rewritten into newer terminology.
import { test, expect, boot, seedState, dailyHabit } from './helpers.js';

const AT = '2026-09-16T20:00:00';
const WED = '2026-09-16';

test.describe('Weekly Detail: obsolete "Done, Counted, and Returned" explainer removed', () => {
  test('1&4&5. no obsolete explainer copy, heading, or example timeline remains anywhere on the page', async ({page}) => {
    await boot(page, {view: 'practiceView', at: AT, state: seedState({habits: [dailyHabit], logs: {[WED]: {'h-daily': 'done'}}})});
    const view = page.locator('#practiceView');
    await expect(view).not.toContainText('The idea behind Done, Counted, and Returned');
    await expect(view).not.toContainText('Builds the muscle of re-entry');
    await expect(view).not.toContainText('You returned next day');
    await expect(view.locator('.example-row')).toHaveCount(0);
    await expect(view.locator('.status-chip')).toHaveCount(0);
  });

  test('6. no user-facing "Counted" terminology remains on this page', async ({page}) => {
    await boot(page, {view: 'practiceView', at: AT, state: seedState({habits: [dailyHabit], logs: {[WED]: {'h-daily': 'counted'}}})});
    await expect(page.locator('#practiceView')).not.toContainText('Counted');
  });

  test('7&8. no explainer-specific focusable control or dead ARIA relationship remains', async ({page}) => {
    await boot(page, {view: 'practiceView', at: AT, state: seedState({habits: [dailyHabit]})});
    // Exactly two <details class="settings-disclosure"> remain (Detailed history, and the
    // top-level goal-plan intro is a different class) — the removed explainer's <details> is gone.
    const summaries = page.locator('#practiceView summary');
    const count = await summaries.count();
    for (let i = 0; i < count; i++) {
      await expect(summaries.nth(i)).not.toContainText('idea behind');
    }
  });

  test('2&3&9. Last 7 Days, Regular/Smaller/Not today, and Detailed History remain unchanged and correct', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: AT,
      state: seedState({habits: [dailyHabit], logs: {[WED]: {'h-daily': 'done'}}}),
    });
    const overview = page.locator('#practiceOverview');
    await expect(overview.locator('.overview-legend-row', {hasText: 'Regular'})).toContainText('1');
    await expect(overview.locator('.overview-legend-row', {hasText: 'Smaller'})).toContainText('0');
    await expect(overview.locator('.overview-legend-row', {hasText: 'Not today'})).toContainText('0');
    await page.locator('#practiceDetailDisclosure summary').first().click();
    await expect(page.locator('#practiceHistoryList')).toContainText('Full version');
  });

  test('13&14. "Worth noticing" and the Insights metric grid remain unchanged', async ({page}) => {
    await boot(page, {view: 'practiceView', at: AT, state: seedState({habits: [dailyHabit]})});
    await expect(page.locator('#practiceInsightSection')).toContainText('Worth noticing');
    await page.locator('#practiceDetailDisclosure summary').first().click();
    await expect(page.locator('#metricEngagement')).toBeVisible();
    await expect(page.locator('#metricReturns')).toBeVisible();
    await expect(page.locator('#metricReturnTime')).toBeVisible();
    await expect(page.locator('#metricLongestActive')).toBeVisible();
  });

  test('12. legacy status:"returned" logs remain supported (no crash, still shown as a Return)', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: AT,
      state: seedState({habits: [dailyHabit], logs: {[WED]: {'h-daily': 'returned'}}}),
    });
    await expect(page.locator('#practiceOverview .overview-returns')).toContainText('1 return');
  });

  for (const width of [360, 390, 402, 430]) {
    test(`${width}px: Weekly Detail renders with no gap/overflow where the explainer used to be`, async ({page}) => {
      await page.setViewportSize({width, height: 844});
      await boot(page, {view: 'practiceView', at: AT, state: seedState({habits: [dailyHabit], logs: {[WED]: {'h-daily': 'done'}}})});
      await expect(page.locator('#practiceOverview')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
      // The last element in the view is now the Detailed history disclosure — nothing trails it.
      const lastChildTag = await page.evaluate(() => document.getElementById('practiceView').lastElementChild.tagName);
      expect(lastChildTag).toBe('DETAILS');
    });
  }
});
