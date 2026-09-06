/**
 * Tailwind is used by the application at /app only. The landing page stays
 * hand-written CSS — see DESIGN.md §12 and §15.
 *
 * This plugin is a passthrough for stylesheets that contain no Tailwind
 * at-rules, so `globals.css` is unaffected. The guarantee that /app cannot
 * reflow / is in `app/app/app.css`, which never imports preflight.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
