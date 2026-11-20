/**
 * Transisi saat tamu membuka undangan.
 *
 * Memakai Web Animations API supaya durasi/easing tidak perlu class CSS
 * tambahan, dengan batas waktu: kalau animasi tidak settle (tab background,
 * browser aneh), cover tetap dilepas supaya undangan tidak pernah "nyangkut".
 */

const EASE = 'cubic-bezier(.7, 0, .3, 1)';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const frames = {
    fade: [
        { opacity: 1 },
        { opacity: 0 }
    ],
    curtain: [
        { clipPath: 'inset(0 0 0 0)' },
        { clipPath: 'inset(0 0 100% 0)' }
    ],
    zoom: [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(1.08)' }
    ],
    flip: [
        { opacity: 1, transform: 'perspective(1400px) rotateY(0deg)' },
        { opacity: 0, transform: 'perspective(1400px) rotateY(-88deg)' }
    ]
};

/**
 * @param {{cover: HTMLElement|null, root: HTMLElement|null, transition?: string, duration?: number}} opts
 * @returns {Promise<void>}
 */
export const open = async ({ cover, root, transition = 'curtain', duration = 1200 }) => {
    const ms = Math.min(2500, Math.max(300, Number(duration) || 1200));
    const mode = frames[transition] ? transition : 'fade';

    if (!cover) {
        return;
    }

    if (reduced() || transition === 'none' || typeof cover.animate !== 'function') {
        cover.remove();
        return;
    }

    document.body.classList.add('is-opening');

    const animations = [];

    try {
        animations.push(cover.animate(frames[mode], {
            duration: ms,
            easing: EASE,
            fill: 'forwards'
        }));

        if (root && typeof root.animate === 'function') {
            animations.push(root.animate(
                [
                    { opacity: 0, transform: 'scale(1.012)' },
                    { opacity: 1, transform: 'scale(1)' }
                ],
                { duration: Math.round(ms * .9), easing: EASE, fill: 'backwards' }
            ));
        }
    } catch (err) {
        console.warn('transisi buka undangan dilewati', err);
    }

    await Promise.race([
        Promise.all(animations.map((a) => a.finished.catch(() => undefined))),
        sleep(ms + 350)
    ]);

    cover.remove();
    document.body.classList.remove('is-opening');
};

export const transitions = { open };