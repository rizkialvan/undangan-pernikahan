import { shell } from './app/cms/shell.js';

((w) => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => shell.init());
    } else {
        shell.init();
    }

    w.studioUndangan = shell;
})(window);