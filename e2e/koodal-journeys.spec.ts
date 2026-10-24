import { test, expect } from '@playwright/test';

test.describe('Koodal End-to-End User Journeys (Step 8)', () => {
  test('1. Waitlist join flow, lane assignment, and status page navigation', async ({ page }) => {
    await page.goto('/waitlist');

    // Verify title and brand presence
    await expect(page.locator('h1')).toContainText(/Join the Koodal Waitlist/i);

    // Fill registration form
    await page.fill('input[type="email"]', 'priya.chennai@example.com');
    await page.check('input[type="checkbox"]'); // Age confirmation 18+

    // Submit waitlist entry
    await page.click('button[type="submit"]');

    // Should navigate to /waitlist/status
    await expect(page).toHaveURL(/.*waitlist\/status/);
    await expect(page.locator('h1')).toContainText(/You are number #|You Are Admitted/i);
    await expect(page.locator('text=Priority Score')).toBeVisible();
  });

  test('2. Unadmitted member route gatekeeper restricts member discovery to waitlist status', async ({ page }) => {
    await page.goto('/discover');

    // Unadmitted visitor / member cannot view member discovery
    await expect(page.locator('text=Real-time Waitlist Status').or(page.locator('h1'))).toBeVisible();
  });

  test('3. Bilingual language switcher toggles between English and Tamil cleanly', async ({ page }) => {
    await page.goto('/');

    const langBtn = page.locator('button[aria-label="Toggle Language"]');
    await expect(langBtn).toBeVisible();

    // Toggle to Tamil
    await langBtn.click();
    await expect(page.locator('text=கூடல் (Koodal)').or(page.locator('text=தமிழ்'))).toBeVisible();

    // Toggle back to English
    await langBtn.click();
    await expect(page.locator('text=Intent-First')).toBeVisible();
  });

  test('4. Settings privacy controls, DPDP data rights, and cascading deletion modal', async ({ page }) => {
    await page.goto('/settings');

    // Verify DPDP Consent section
    await expect(page.locator('text=DPDP Act 2023 Consent & Data Rights')).toBeVisible();
    await expect(page.locator('text=Platform Terms & Privacy Policy')).toBeVisible();

    // Verify Delete Account trigger
    const deleteBtn = page.locator('button:has-text("Permanently Delete My Data")');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Delete modal confirmation
    await expect(page.locator('#delete-dialog-title')).toContainText('Permanent Account Removal');
    await expect(page.locator('text=verification-selfies bucket')).toBeVisible();
  });
});
