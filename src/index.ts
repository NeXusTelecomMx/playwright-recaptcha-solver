import type { Page } from 'playwright-core';
import axios from 'axios';

const rnd = (max: number, min: number): number => Math.floor(Math.random() * (max - min)) + min;

export type FrameLocatorTarget = {
    id?: string;
    className?: string;
    tag?: string;
};

const escapeSelector = (value: string): string => value.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');

const buildFrameSelector = (target?: FrameLocatorTarget, srcPattern?: string): string => {
    const tag = target?.tag ?? 'iframe';
    const id = target?.id ? `#${escapeSelector(target.id)}` : '';
    const className = target?.className
        ? `.${target.className
              .split(/\s+/)
              .filter(Boolean)
              .map((classItem) => escapeSelector(classItem))
              .join('.')}`
        : '';

    const selector = `${tag}${id}${className}`;
    return srcPattern ? `${selector}[src*="${srcPattern}"]` : selector;
};

export async function resolve(page: Page, frameTarget?: FrameLocatorTarget): Promise<string | null> {
    const anchorIframe = page.frameLocator(buildFrameSelector(frameTarget, 'api2/anchor'));
    const contentIframe = page.frameLocator(buildFrameSelector(frameTarget, 'api2/bframe'));

    await anchorIframe.locator('#recaptcha-anchor').click({ delay: rnd(150, 30) });
    await contentIframe.locator('#recaptcha-audio-button').click({ delay: rnd(150, 30) });

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
