# DouView

A clean green poster gallery for Douban Movie Top 250.

Current version: `1.0.0` (initial commit).

- Preserves titles, alternate titles, ranks, ratings, vote counts and quotes.
- Displays complete posters and collapses cast/crew information into an expandable section.
- Hides sidebar ads, the app QR promotion and the annual navigation banner.
- Keeps all viewing actions supplied by Douban, including Want to watch and Watched, without inventing account states or buttons.
- Preserves availability labels, the unwatched filter, search and pagination.
- Adjustable target poster width (160–360px) and card gap (8–40px), saved in userscript storage. Defaults: 240px and 22px.

Open the filter and appearance menu at the top right of the gallery to adjust layout or restore defaults. Column count adapts to the available width.

Navigation and account links live in the top menu. Filters and appearance controls open in an overlay; introductory text sits at the footer to prioritize posters.

## Installation

Create a new script in Tampermonkey, paste the complete contents of [douview.user.js](./douview.user.js), save it, and visit or reload <https://movie.douban.com/top250>.

In Chrome, enable Allow User Scripts on Tampermonkey's extension details page.

The [install link](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/douview/douview.user.js) supports installation and update checks.

Only Top 250 and its pagination/filter query parameters are affected. Native movie links and collection actions remain controlled by Douban. Disabling the script and reloading restores the original page. Hiding ads does not block their network requests.

JavaScript syntax checking passed. Chrome + Tampermonkey confirmed the live gallery, posters, availability labels and hidden promotions. The live unwatched page confirmed the native dual-action structure. The built-in browser tested the latest unwatched page's complete markup, original styles and all 20 poster assets at 320px, 390px, 768px and 1280px widths, slider ranges, reload/pagination persistence, reset, retained node listeners and dynamically updated dual actions. The isolated page uses mocked GM storage; real collection submissions were not tested. The final version passed isolated browser checks, including fixes for inherited poster padding and misaligned action buttons. The final version has not been rechecked in live Chrome + Tampermonkey. No formatting checks were run.

## License

[MIT](../LICENSE)
