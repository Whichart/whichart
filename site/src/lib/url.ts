const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

/** Site-relative link that respects the deploy base path. */
export const url = (path = '') => base + path.replace(/^\//, '');

export const REPO = 'https://github.com/Whichart/whichart';
