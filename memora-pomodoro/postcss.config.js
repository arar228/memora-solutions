// The desktop/web renderer uses authored CSS. Keeping a local PostCSS config
// prevents Vite from inheriting the parent site's Tailwind pipeline.
module.exports = { plugins: {} };
