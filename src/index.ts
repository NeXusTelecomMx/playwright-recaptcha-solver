import type { Page } from 'playwright-core';
import axios from 'axios';

const rnd = (max: number, min: number): number => Math.floor(Math.random() * (max - min)) + min;

const getFrameLocator = (page: Page, parentSelector: string | undefined, srcPattern: string) => {
    if (parentSelector) {
        return page.locator(parentSelector).frameLocator(`iframe[src*="${srcPattern}"]`);
    }

    return page.frameLocator(`iframe[src*="${srcPattern}"]`);
};

const getVisibleBframe = async (page: Page) => {
    const frames = page.locator('iframe[src*="api2/bframe"]');
    const count = await frames.count();

    for (let i = 0; i < count; i += 1) {
        const frame = frames.nth(i);
        const visible = await frame.evaluate((element) => {
            const style = window.getComputedStyle(element);
            return style.opacity !== '0' && style.visibility !== 'hidden' && style.display !== 'none';
        });

        if (visible) {
            return frame.contentFrame();
        }
    }

    return page.frameLocator('iframe[src*="api2/bframe"]').first();
};

const clickVisible = async (locator: any, selector: string, delay = 120) => {
    const target = locator.locator(selector);
    await target.waitFor({ state: 'visible', timeout: 30000 });
    await target.click({ delay });
};

export async function resolve(page: Page, parentSelector?: string): Promise<string | null> {
    const anchorIframe = getFrameLocator(page, parentSelector, 'api2/anchor');
    const contentIframe = await getVisibleBframe(page);

    await anchorIframe.locator('#recaptcha-anchor').click({ delay: rnd(150, 30) });
    await clickVisible(contentIframe, '#recaptcha-audio-button', rnd(180, 60));

    const audioLink = contentIframe.locator('#audio-source');

    while (true) {
        const src = await audioLink.getAttribute('src');
        if (!src) throw new Error('Audio source not found in reCAPTCHA iframe');

        const audioCaptcha = await page.waitForResponse(src);
        try {
            const { data } = await axios.post<any>('https://api.wit.ai/speech?v=2021092', await audioCaptcha.body(), {
                headers: {
                    Authorization: 'Bearer JVHWCNWJLWLGN6MFALYLHAPKUFHMNTAC',
                    'Content-Type': 'audio/mpeg3',
                },
            });

            const match = /"text":\s*"(.+?)"/.exec(JSON.stringify(data));
            if (!match) throw new Error('No transcript found in response');
            const audioTranscript = match[1].trim();

            const responseLocator = contentIframe.locator('#audio-response');
            await responseLocator.focus();
            await page.keyboard.type(audioTranscript, { delay: rnd(75, 30) });

            await contentIframe.locator('#recaptcha-verify-button').click({ delay: rnd(150, 30) });

            await anchorIframe.locator('#recaptcha-anchor[aria-checked="true"]').waitFor();

            return await page.evaluate(() => {
                const el = document.getElementById('g-recaptcha-response') as HTMLInputElement | null;
                return el ? el.value : null;
            });
        } catch (e: any) {
            console.error(e);
            await contentIframe.locator('#recaptcha-reload-button').click({ delay: rnd(150, 30) });
        }
    }
}
