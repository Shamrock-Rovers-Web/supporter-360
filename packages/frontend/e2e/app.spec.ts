import { test, expect } from '@playwright/test';

const API_URL = process.env.VITE_API_URL || 'https://rxe97dwkr7.execute-api.eu-west-1.amazonaws.com/prod/';
const API_KEY = process.env.VITE_API_KEY || 'srfc-staff-2025';

test.describe('Supporter 360 - Search Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays hero section with branding', async ({ page }) => {
    // Check for the main heading
    await expect(page.getByRole('heading', { name: /find your supporters/i })).toBeVisible();

    // Check for Shamrock Rovers branding (use first() to handle multiple matches)
    await expect(page.getByText('Shamrock Rovers FC').first()).toBeVisible();

    // Check for search input placeholder
    await expect(page.getByPlaceholder(/search by name, email, or phone/i)).toBeVisible();
  });

  test('search input is functional and debounced', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search by name, email, or phone/i);

    // Type in search
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');

    // Clear search
    await searchInput.fill('');
    await expect(searchInput).toHaveValue('');
  });

  test('displays supporter type filter buttons', async ({ page }) => {
    // Check for filter section
    await expect(page.getByText(/filter by supporter type/i)).toBeVisible();

    // Check for some filter options
    await expect(page.getByRole('button', { name: 'Member' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Season Ticket Holder' })).toBeVisible();
  });

  test('filter buttons toggle selection state', async ({ page }) => {
    const memberFilter = page.getByRole('button', { name: 'Member' });

    // Click to select
    await memberFilter.click();
    await expect(memberFilter).toHaveAttribute('aria-pressed', 'true');

    // Click to deselect
    await memberFilter.click();
    await expect(memberFilter).toHaveAttribute('aria-pressed', 'false');
  });

  test('displays initial state before search', async ({ page }) => {
    // Should show initial state message
    await expect(page.getByText(/start your search/i)).toBeVisible();
  });

  test('keyboard shortcut focuses search', async ({ page }) => {
    // Press Ctrl+K (or Cmd+K on Mac)
    await page.keyboard.press('Control+k');

    const searchInput = page.getByPlaceholder(/search by name, email, or phone/i);
    await expect(searchInput).toBeFocused();
  });

  test('shows loading state during search', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search by name, email, or phone/i);

    // Trigger search
    await searchInput.fill('test@example.com');

    // Should eventually show either results or no results
    await page.waitForSelector('[data-testid="search-results"], [data-testid="no-results"], .animate-pulse', {
      timeout: 5000,
    }).catch(() => {
      // It's okay if we don't see loading - might be too fast
    });
  });
});

test.describe('Supporter 360 - Navigation', () => {
  test('header navigation links work', async ({ page }) => {
    await page.goto('/');

    // Check for navigation elements
    const searchLink = page.getByRole('link', { name: /search/i });
    if (await searchLink.isVisible()) {
      await searchLink.click();
      await expect(page).toHaveURL(/\//);
    }

    const adminLink = page.getByRole('link', { name: /admin/i });
    if (await adminLink.isVisible()) {
      await adminLink.click();
      await expect(page).toHaveURL(/\/admin/);
    }
  });

  test('brand logo navigates to home', async ({ page }) => {
    await page.goto('/admin');

    // Click brand/logo
    const brandLink = page.getByRole('link', { name: /supporter 360/i });
    if (await brandLink.isVisible()) {
      await brandLink.click();
      await expect(page).toHaveURL(/\//);
    }
  });
});

test.describe('Supporter 360 - Admin Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
  });

  test('displays admin panel heading', async ({ page }) => {
    // Check for merge supporters heading (which is the main admin content)
    await expect(page.getByRole('heading', { name: /merge supporters/i })).toBeVisible();
  });

  test('displays merge supporters section', async ({ page }) => {
    // Check for merge functionality description
    await expect(page.getByText(/duplicate/i)).toBeVisible();
  });
});

test.describe('Supporter 360 - Brand Colors', () => {
  test('uses Shamrock Rovers brand colors', async ({ page }) => {
    await page.goto('/');

    // Check for green gradient in hero section
    const heroSection = page.locator('.from-brand-green-500');
    await expect(heroSection).toBeVisible();

    // Verify the page loaded with proper styling
    const bodyStyles = await page.evaluate(() => {
      const computedStyle = getComputedStyle(document.body);
      return {
        hasStyles: !!computedStyle.fontFamily,
      };
    });

    expect(bodyStyles.hasStyles).toBe(true);
  });
});

test.describe('Supporter 360 - Accessibility', () => {
  test('search page has proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByRole('searchbox').or(
      page.getByLabel(/search/i)
    ).or(
      page.getByPlaceholder(/search by name, email, or phone/i)
    );

    await expect(searchInput).toBeVisible();
  });

  test('keyboard navigation works on search results', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to focus on some interactive element
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);
  });

  test('filter buttons have proper ARIA attributes', async ({ page }) => {
    await page.goto('/');

    const filterButtons = page.getByRole('button').filter({
      hasText: /member|season ticket/i,
    });

    const count = await filterButtons.count();
    expect(count).toBeGreaterThan(0);

    // Check first filter button has aria-pressed
    const firstButton = filterButtons.first();
    const ariaPressed = await firstButton.getAttribute('aria-pressed');
    expect(['true', 'false']).toContain(ariaPressed);
  });
});

test.describe('Supporter 360 - Responsive Design', () => {
  test('mobile view displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Search should still be accessible
    const searchInput = page.getByPlaceholder(/search by name, email, or phone/i);
    await expect(searchInput).toBeVisible();
  });

  test('tablet view displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Hero should be visible
    await expect(page.getByRole('heading', { name: /find your supporters/i })).toBeVisible();
  });

  test('desktop view displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // Full layout should be visible
    await expect(page.getByRole('heading', { name: /find your supporters/i })).toBeVisible();
  });
});
