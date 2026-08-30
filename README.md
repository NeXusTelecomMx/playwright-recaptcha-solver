# Google ReCaptcha V2 Solver for [Playwright](https://playwright.dev/)

## Installation

```bash
npm install
```

If you are using this as a package from GitHub:

```bash
npm install github:xrip/playwright-recaptcha-solver
```

## Usage

```ts
import { chromium } from 'playwright';
import { resolve } from 'playwright-recaptcha-solver';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-site-isolation-trials',
      '--disable-features=site-per-process,SitePerProcess',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.google.com/recaptcha/api2/demo');

  const token = await resolve(page);

  console.log('reCAPTCHA token:', token);
  await browser.close();
})();
```

## Custom iframe target

The `resolve` function accepts an optional selector to locate the iframe containing the challenge. You can target the iframe by `id`, `className`, or `tag`.

```ts
await resolve(page, { id: 'recaptcha-iframe' });
await resolve(page, { className: 'g-recaptcha' });
await resolve(page, { tag: 'iframe' });
await resolve(page, { tag: 'iframe', className: 'recaptcha challenge' });
```

This is useful when the page has multiple reCAPTCHA iframes or custom markup and you need to choose the exact frame container.

## Notes

- The function returns the hidden reCAPTCHA response token if it succeeds.
- The solver relies on the Google reCAPTCHA challenge flow and may require a valid environment or network access.
- Some pages may still trigger bot protection depending on IP reputation, browser fingerprint, or site-specific policies.

## Credits

- Based on the original work by [danielgatis](https://github.com/danielgatis/puppeteer-recaptcha-solver)
