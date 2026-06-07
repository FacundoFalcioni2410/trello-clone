import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:8000';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@test.com`;
}

/**
 * E2E Test Suite for Trello Clone
 *
 * Prerequisites:
 *   npm run dev  (from project root, starts backend + frontend)
 */

test.beforeAll(async ({ request }) => {
  const response = await request.get(`${API_URL}/api/user`).catch(() => null);
  if (!response || response.status() === 0) {
    throw new Error('Backend is not running at http://localhost:8000. Start it with `npm run dev` from the project root.');
  }
});

test.describe('Authentication', () => {
  test('user can register and log in', async ({ page }) => {
    const email = uniqueEmail('e2e');

    await page.goto(`${BASE_URL}/login`);

    // Register a new user
    await page.click('text=Sign up');
    await page.fill('input#name', 'E2E Test User');
    await page.fill('input#email', email);
    await page.fill('input#password', 'password123');

    const registerResponse = page.waitForResponse((resp) =>
      resp.url().includes('/register') && resp.request().method() === 'POST'
    );
    await page.click('button:has-text("Create account")');
    await registerResponse;

    // Should redirect to boards page
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
    await expect(page.locator('text=Your boards')).toBeVisible();

    // Log out
    await page.click('text=Log out');
    await expect(page).toHaveURL(/.*login.*/);

    // Log back in
    await page.fill('input#email', email);
    await page.fill('input#password', 'password123');

    const loginResponse = page.waitForResponse((resp) =>
      resp.url().includes('/login') && resp.request().method() === 'POST'
    );
    await page.click('button:has-text("Sign in")');
    await loginResponse;

    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
    await expect(page.locator('text=Your boards')).toBeVisible();
  });
});

test.describe('Board Management', () => {
  test('user can create a board', async ({ page }) => {
    const email = uniqueEmail('board-creator');

    await page.goto(`${BASE_URL}/login`);
    await page.click('text=Sign up');
    await page.fill('input#name', 'Board Creator');
    await page.fill('input#email', email);
    await page.fill('input#password', 'password123');

    const registerResponse = page.waitForResponse((resp) =>
      resp.url().includes('/register') && resp.request().method() === 'POST'
    );
    await page.click('button:has-text("Create account")');
    await registerResponse;
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });

    // Create a board
    await page.click('text=Create board');
    await page.fill('input[placeholder="e.g. Marketing Q3"]', 'E2E Test Board');

    const createBoardResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/boards') && resp.request().method() === 'POST'
    );
    const boardsListResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/boards') && resp.request().method() === 'GET'
    );
    await page.click('button[type="submit"]:has-text("Create board")');
    await createBoardResponse;
    await boardsListResponse;

    // Board should appear
    await expect(page.locator('text=E2E Test Board')).toBeVisible();
  });

  test('user can navigate to a board', async ({ page }) => {
    const email = uniqueEmail('navigator');

    await page.goto(`${BASE_URL}/login`);
    await page.click('text=Sign up');
    await page.fill('input#name', 'Navigator');
    await page.fill('input#email', email);
    await page.fill('input#password', 'password123');

    const registerResponse = page.waitForResponse((resp) =>
      resp.url().includes('/register') && resp.request().method() === 'POST'
    );
    await page.click('button:has-text("Create account")');
    await registerResponse;
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });

    // Create a board
    await page.click('text=Create board');
    await page.fill('input[placeholder="e.g. Marketing Q3"]', 'Navigate Board');

    const createBoardResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/boards') && resp.request().method() === 'POST'
    );
    const boardsListResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/boards') && resp.request().method() === 'GET'
    );
    await page.click('button[type="submit"]:has-text("Create board")');
    await createBoardResponse;
    await boardsListResponse;
    await expect(page.locator('text=Navigate Board')).toBeVisible();

    // Navigate to board
    await page.click('text=Navigate Board');
    await page.waitForURL(/\/boards\/\d+/);
    await expect(page.locator('text=Navigate Board')).toBeVisible();
  });
});

test.describe('Card Management', () => {
  test('user can create a card', async ({ page }) => {
    const email = uniqueEmail('card-creator');

    await page.goto(`${BASE_URL}/login`);
    await page.click('text=Sign up');
    await page.fill('input#name', 'Card Creator');
    await page.fill('input#email', email);
    await page.fill('input#password', 'password123');

    const registerResponse = page.waitForResponse((resp) =>
      resp.url().includes('/register') && resp.request().method() === 'POST'
    );
    await page.click('button:has-text("Create account")');
    await registerResponse;
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });

    // Create a board
    await page.click('text=Create board');
    await page.fill('input[placeholder="e.g. Marketing Q3"]', 'Card Test Board');

    const createBoardResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/boards') && resp.request().method() === 'POST'
    );
    const boardsListResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/boards') && resp.request().method() === 'GET'
    );
    await page.click('button[type="submit"]:has-text("Create board")');
    await createBoardResponse;
    await boardsListResponse;

    await page.click('text=Card Test Board');
    await page.waitForURL(/\/boards\/\d+/);

    // Create a list
    await page.click('text=Add another list');
    await page.fill('input[placeholder="Enter list title..."]', 'To Do');
    await page.click('button:has-text("Add list")');
    await expect(page.locator('text=To Do')).toBeVisible();

    // Create a card
    await page.fill('input[placeholder="Enter a title for this card..."]', 'My first card');
    await page.click('button:has-text("Add card")');
    await expect(page.locator('p:has-text("My first card")')).toBeVisible();
  });

  test('user can add labels and checklist to a card', async ({ page }) => {
    const email = uniqueEmail('feature-tester');

    await page.goto(`${BASE_URL}/login`);
    await page.click('text=Sign up');
    await page.fill('input#name', 'Feature Tester');
    await page.fill('input#email', email);
    await page.fill('input#password', 'password123');

    const registerResponse = page.waitForResponse((resp) =>
      resp.url().includes('/register') && resp.request().method() === 'POST'
    );
    await page.click('button:has-text("Create account")');
    await registerResponse;
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });

    // Create a board
    await page.click('text=Create board');
    await page.fill('input[placeholder="e.g. Marketing Q3"]', 'Feature Board');

    const createBoardResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/boards') && resp.request().method() === 'POST'
    );
    const boardsListResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/boards') && resp.request().method() === 'GET'
    );
    await page.click('button[type="submit"]:has-text("Create board")');
    await createBoardResponse;
    await boardsListResponse;

    await page.click('text=Feature Board');
    await page.waitForURL(/\/boards\/\d+/);

    // Create a list
    await page.click('text=Add another list');
    await page.fill('input[placeholder="Enter list title..."]', 'List');
    await page.click('button:has-text("Add list")');

    // Create a card
    await page.fill('input[placeholder="Enter a title for this card..."]', 'Feature Card');
    await page.click('button:has-text("Add card")');
    await page.click('text=Feature Card');

    // Add a label
    await page.click('button:has-text("red")');
    await page.click('button:has-text("Save changes")');
    await page.waitForTimeout(500);
    await expect(page.locator('span[title="red"]')).toBeVisible();

    // Reopen card to add checklist (Save changes closes the modal)
    await page.click('p:has-text("Feature Card")');
    await expect(page.locator('input[placeholder="Add a checklist item..."]')).toBeVisible();

    // Add a checklist item
    await page.fill('input[placeholder="Add a checklist item..."]', 'Check item 1');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.locator('text=Check item 1')).toBeVisible();
  });
});

test.describe('Members', () => {
  test('owner can invite a member', async ({ page }) => {
    const ownerEmail = uniqueEmail('owner');
    const memberEmail = uniqueEmail('member');

    // Register the member user first so they exist in the system
    await page.goto(`${BASE_URL}/login`);
    await page.click('text=Sign up');
    await page.fill('input#name', 'Member User');
    await page.fill('input#email', memberEmail);
    await page.fill('input#password', 'password123');
    const memberRegResponse = page.waitForResponse((resp) =>
      resp.url().includes('/register') && resp.request().method() === 'POST'
    );
    await page.click('button:has-text("Create account")');
    await memberRegResponse;
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });

    // Now register the owner (navigate back to login, replacing the member session)
    await page.goto(`${BASE_URL}/login`);
    await page.click('text=Sign up');
    await page.fill('input#name', 'Owner');
    await page.fill('input#email', ownerEmail);
    await page.fill('input#password', 'password123');

    const registerResponse = page.waitForResponse((resp) =>
      resp.url().includes('/register') && resp.request().method() === 'POST'
    );
    await page.click('button:has-text("Create account")');
    await registerResponse;
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });

    // Create a board
    await page.click('text=Create board');
    await page.fill('input[placeholder="e.g. Marketing Q3"]', 'Member Board');

    const createBoardResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/boards') && resp.request().method() === 'POST'
    );
    const boardsListResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/boards') && resp.request().method() === 'GET'
    );
    await page.click('button[type="submit"]:has-text("Create board")');
    await createBoardResponse;
    await boardsListResponse;

    await page.click('text=Member Board');
    await page.waitForURL(/\/boards\/\d+/);

    // Invite member
    await page.click('text=Members');
    await page.fill('input[placeholder="Enter email to invite..."]', memberEmail);
    await page.click('button:has-text("Invite")');

    // Member should appear in list
    await expect(page.locator(`text=${memberEmail}`)).toBeVisible();
  });
});
