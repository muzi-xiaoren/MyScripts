# DouView

A clean green poster gallery for Douban Movie Top 250.

Current version: `1.1.0`.

- Preserves titles, alternate titles, ranks, ratings, vote counts and quotes.
- Displays complete posters. Titles use up to two lines, original titles truncate to one line, and a compact metadata row shows the year and up to two genres.
- Ratings share a row with compact vote counts. Full titles, aliases, country/genre metadata, quotes and cast/crew remain available in the expandable Film information section.
- Hides sidebar ads, the app QR promotion and the annual navigation banner.
- Keeps all viewing actions supplied by Douban, including Want to watch and Watched, without inventing account states or buttons.
- Preserves availability labels, the unwatched filter, search and pagination.
- Adjustable target poster width (160–360px) and card gap (8–40px), saved in userscript storage. Defaults: 240px and 22px.

Hover or focus the top-center Douban Movie Top 250 entry to reveal the filter and appearance menu. Click the entry to expand or collapse search and navigation; the default is collapsed, and the choice is saved. Touch users can tap the entry. Column count adapts to the available width.

Search and the navigation/account menu appear when the header is expanded. Filters and appearance controls open in an overlay, closed by outside click or Escape; introductory text sits at the footer to prioritize posters.

## Installation

Create a new script in Tampermonkey, paste the complete contents of [douview.user.js](./douview.user.js), save it, and visit or reload <https://movie.douban.com/top250>.

In Chrome, enable Allow User Scripts on Tampermonkey's extension details page.

The [install link](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/douview/douview.user.js) supports installation and update checks.

Only Top 250 and its pagination/filter query parameters are affected. Native movie links and collection actions remain controlled by Douban. Disabling the script and reloading restores the original page. Hiding ads does not block their network requests.

Version 1.1.0 passed JavaScript syntax checking and isolated headless Chrome checks at 320px, 390px, 768px and 1280px: no horizontal overflow, default header collapse and expansion, overlay boundaries, Escape dismissal, settings writes and reset, expanded full information, retained native nodes/listeners and dynamic multi-action updates. No runtime errors occurred. The fixture models Douban markup with placeholder posters and mocked GM storage. Live Douban was unreachable; real-site CSS compatibility, Tampermonkey reload/pagination persistence and actual collection submissions remain unverified.

Historical 1.0.0 checks covered live posters, availability labels, hidden promotions and the unwatched page's dual-action markup. Earlier isolated checks used original styles and 20 real posters. Those results do not constitute live verification of 1.1.0.

## License

[MIT](../LICENSE)
