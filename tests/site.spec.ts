import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync, readFileSync } from 'node:fs';

const PROJECT_DIR = 'src/content/projects';
const projects = readdirSync(PROJECT_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ id: f.slice(0, -5), ...JSON.parse(readFileSync(`${PROJECT_DIR}/${f}`, 'utf8')) }));
const caseStudies = projects.filter((p) => p.caseStudy?.problem);

async function openChaos(page: Page) {
  await page.locator('#chaos-trigger').click();
  await expect(page.locator('#chaos-console')).toBeVisible();
}

async function runCommand(page: Page, cmd: string) {
  await page.locator('#cc-cmd').fill(cmd);
  await page.locator('#cc-cmd').press('Enter');
}

async function openMenuIfCollapsed(page: Page) {
  const menu = page.locator('#menu-btn');
  if (await menu.isVisible()) await menu.click();
}

test.describe('homepage content', () => {
  test('has hero, required core sections and contact', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Syed Moiz' })).toBeVisible();
    for (const id of ['about', 'projects', 'operate', 'skills', 'experience', 'contact']) {
      await expect(page.locator(`section#${id}`)).toHaveCount(1);
    }
    await expect(page.getByRole('heading', { level: 2, name: 'My projects' })).toBeAttached();
    await expect(page.getByRole('heading', { level: 2, name: 'Skills & tech superpowers' })).toBeAttached();
    await expect(page.getByRole('heading', { level: 2, name: 'About me' })).toBeAttached();
    await expect(page.getByRole('link', { name: 'symoiz.dev@gmail.com', exact: true })).toHaveAttribute('href', 'mailto:symoiz.dev@gmail.com');
    await expect(page.locator('a[href="https://www.linkedin.com/in/symoiz"]').first()).toBeAttached();
  });

  test('features DevOps projects and keeps data engineering off the homepage', async ({ page }) => {
    await page.goto('/');
    const titles = await page.locator('#projects .carousel .project-title').allTextContents();
    expect(titles.slice(0, 5).map((t) => t.trim())).toEqual(['DLQ Judge', 'IncidentLens', 'ErrorSaathi', 'AWS 3-Tier Architecture', 'InfraPilot AI']);
    await expect(page.locator('#projects').getByText('Snowflake Data Platform')).toHaveCount(0);
    await expect(page.locator('#projects').getByText('AWS IoT Data Pipeline')).toHaveCount(0);
  });

  test('every project card shows a status badge', async ({ page }) => {
    await page.goto('/projects/');
    const cards = page.locator('.project-card');
    await expect(cards).toHaveCount(projects.length);
    await expect(page.locator('.project-card .status')).toHaveCount(projects.length);
  });

  test('unconfirmed demo links are never rendered', async ({ page }) => {
    const unconfirmed = projects.flatMap((p) => Object.values(('unconfirmedLinks' in p && p.unconfirmedLinks) || {}));
    expect(unconfirmed.length).toBeGreaterThan(0);
    for (const path of ['/', '/projects/']) {
      await page.goto(path);
      for (const url of unconfirmed) await expect(page.locator(`a[href="${url}"]`)).toHaveCount(0);
    }
  });

  test('creative feature hint is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#chaos-trigger')).toBeVisible();
    await expect(page.getByRole('button', { name: /try breaking production/i })).toBeVisible();
  });

  test('no horizontal scroll', async ({ page }) => {
    for (const path of ['/', '/projects/', '/projects/dlq-judge/']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe('navigation', () => {
  test('primary nav links resolve to sections and pages', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator('#primary-nav a').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    for (const href of hrefs.filter((h) => h.startsWith('#'))) await expect(page.locator(href)).toHaveCount(1);
    await openMenuIfCollapsed(page);
    await page.locator('#primary-nav').getByRole('link', { name: 'Experience' }).click();
    await expect(page).toHaveURL(/#experience$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Experience & education' })).toBeInViewport();
  });

  test('section anchors from the previous version still exist', async ({ page }) => {
    await page.goto('/');
    for (const id of ['top', 'about', 'skills', 'projects', 'experience', 'contact']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });

  test('every internal link returns 200', async ({ page, request }) => {
    const seen = new Set<string>();
    for (const path of ['/', '/projects/', ...caseStudies.map((c) => `/projects/${c.id}/`)]) {
      await page.goto(path);
      const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
      hrefs.forEach((h) => seen.add(h.split('#')[0] || '/'));
    }
    for (const href of seen) {
      const res = await request.get(href);
      expect(res.status(), href).toBe(200);
    }
  });

  test('/lock redirects to the admin, which asks for GitHub sign-in', async ({ page, request }) => {
    const res = await request.get('/lock', { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers()['location']).toBe('/keystatic');
    await page.goto('/lock');
    await expect(page.getByText('Log in with GitHub')).toBeVisible({ timeout: 15_000 });
  });

  test('theme toggle switches and persists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

test.describe('reference-style interactions', () => {
  test('hero is a centred glass card over a full-screen photo', async ({ page }) => {
    await page.goto('/');
    const hero = await page.locator('.hero').boundingBox();
    const vp = page.viewportSize()!;
    expect(hero!.height).toBeGreaterThanOrEqual(vp.height - 2);
    const card = await page.locator('.hero-card').boundingBox();
    expect(Math.abs(card!.x + card!.width / 2 - vp.width / 2)).toBeLessThan(4);
    await expect(page.getByRole('link', { name: 'View my work' })).toBeVisible();
  });

  test('carousel next and previous buttons move the track', async ({ page }) => {
    await page.goto('/');
    const track = page.locator('[data-track]');
    await track.scrollIntoViewIfNeeded();
    await expect(page.locator('[data-prev]')).toBeDisabled();
    await page.locator('[data-next]').click();
    await expect.poll(() => track.evaluate((t) => t.scrollLeft)).toBeGreaterThan(50);
    await expect(page.locator('[data-prev]')).toBeEnabled();
    await expect(page.locator('.carousel-dot')).toHaveCount(await page.locator('.carousel-slide').count());
  });

  test('cursor effects run for mouse users only', async ({ page, isMobile }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    if (isMobile) {
      await expect(page.locator('.hero')).not.toHaveClass(/has-ripple/);
    } else {
      await expect(page.locator('.hero')).toHaveClass(/has-ripple/);
      await page.mouse.move(400, 300);
      await page.mouse.move(460, 340, { steps: 6 });
      expect(await page.locator('#hero-ripple').evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(100);
    }
    await expect(page.locator('#tile-field')).toHaveCount(1);
  });

  test('preloader clears', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#preloader')).toHaveCount(0, { timeout: 4000 });
  });
});

test.describe('projects page', () => {
  test('filters by engineering area', async ({ page }) => {
    await page.goto('/projects/');
    await page.getByRole('button', { name: 'Networking' }).click();
    await expect(page.getByRole('button', { name: 'Networking' })).toHaveAttribute('aria-pressed', 'true');
    const visible = page.locator('.project-card:visible .project-title');
    await expect(visible.first()).toBeVisible();
    for (const t of await visible.allTextContents()) {
      const p = projects.find((x) => x.name === t.trim())!;
      expect(p.domains, t).toContain('networking');
    }
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await expect(page.locator('.project-card:visible')).toHaveCount(projects.length);
  });
});

test.describe('case studies', () => {
  for (const c of caseStudies) {
    test(`${c.id} renders sections and status`, async ({ page }) => {
      await page.goto(`/projects/${c.id}/`);
      await expect(page.getByRole('heading', { level: 1, name: c.name })).toBeVisible();
      await expect(page.locator('.case-status .status')).toBeVisible();
      for (const id of ['problem', 'decisions', 'security', 'deployment', 'results']) {
        await expect(page.locator(`section#${id}`)).toHaveCount(1);
      }
      await expect(page.getByRole('link', { name: 'Repository' }).first()).toHaveAttribute('href', c.links.repo!);
    });
  }

  test('architecture diagram explains a component on focus', async ({ page }) => {
    await page.goto('/projects/dlq-judge/');
    const node = page.locator('[data-node="bedrock"]');
    await node.focus();
    await expect(page.locator('[data-arch-title]')).toHaveText('Amazon Bedrock');
    await expect(page.locator('.arch-edge.is-on')).not.toHaveCount(0);
  });

  test('DLQ Judge reports its benchmark honestly', async ({ page }) => {
    await page.goto('/projects/dlq-judge/');
    await expect(page.locator('#results')).toContainText('does not yet beat simple rules');
  });
});

test.describe('chaos mode', () => {
  test('bad deploy: rollback resolves the incident and reveals a postmortem', async ({ page }) => {
    await page.goto('/');
    await openChaos(page);
    await page.getByRole('button', { name: /bad deploy/i }).click();
    await expect(page.locator('#status-text')).toHaveText(/SEV-2: Bad deploy/);
    await expect(page.locator('#projects')).toHaveClass(/is-degraded/);
    await runCommand(page, 'deploys');
    await expect(page.locator('#cc-log')).toContainText('v2.4.1');
    await runCommand(page, 'rollback');
    await expect(page.locator('#cc-postmortem')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#cc-pm')).toContainText('SEBKO Solution');
    await expect(page.locator('#projects')).not.toHaveClass(/is-degraded/);
    await expect(page.locator('#cc-score')).toHaveText('1/3 resolved');
  });

  test('security alert: show-me-the-fix helps a stuck visitor', async ({ page }) => {
    await page.goto('/');
    await openChaos(page);
    await page.getByRole('button', { name: /security alert/i }).click();
    await expect(page.locator('#about')).toHaveClass(/is-degraded/);
    await page.getByRole('button', { name: /show me the fix/i }).click();
    await page.locator('#cc-cmd').press('Enter');
    await expect(page.locator('#cc-postmortem')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#cc-pm')).toContainText('Wazuh');
  });

  test('Escape exits and restores the page; input is not rendered as HTML', async ({ page }) => {
    await page.goto('/');
    await openChaos(page);
    await page.getByRole('button', { name: /traffic spike/i }).click();
    await runCommand(page, '<img src=x onerror=alert(1)>');
    await expect(page.locator('#cc-log img')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('#chaos-console')).toBeHidden();
    await expect(page.locator('#skills')).not.toHaveClass(/is-degraded/);
  });
});

test.describe('security and accessibility', () => {
  test('pages carry a hash-based CSP and log no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    for (const path of ['/', '/projects/', '/projects/dlq-judge/']) {
      await page.goto(path);
      const csp = await page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content');
      expect(csp).toContain("script-src 'self' 'sha256-");
      expect(csp).not.toContain('unsafe-inline');
    }
    expect(errors).toEqual([]);
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`no serious axe violations (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
      for (const path of ['/', '/projects/', '/projects/dlq-judge/']) {
        await page.goto(path);
        await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
        await page.waitForTimeout(800);
        const results = await new AxeBuilder({ page }).analyze();
        const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(serious.map((v) => `${path} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
      }
    });
  }
});
