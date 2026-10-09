# DouView

A clean green poster gallery for Douban Movie Top 250.

Current version: `1.1.3`.

- Preserves titles, alternate titles, ranks, ratings, vote counts and quotes.
- Displays complete posters. Titles use up to two lines, original titles are kept in Details, no empty title line is reserved, and a compact metadata row shows the year and up to two genres.
- Titles, ratings, supporting text and action labels scale with the actual card width, within readable minimum and maximum sizes, when poster settings or the viewport change.
- Layout C places ratings on the lower-right poster corner and availability labels on the upper-right. Native quotes are visible below metadata, up to two lines; hover or open Details for the full text. Missing quotes are not invented.
- Details and native viewing actions share a compact row. Full titles, aliases, country/genre metadata, quotes, original vote counts and cast/crew remain available in Details.
- Hides sidebar ads, the app QR promotion and the annual navigation banner.
- Keeps all viewing actions supplied by Douban, including Want to watch and Watched, without inventing account states or buttons.
- Preserves availability labels, the unwatched filter, search and pagination.
- Adjustable target poster width (160–360px) and card gap (8–40px), saved in userscript storage. Defaults: 240px and 22px.

The header is collapsed by default, with no persistent chart title. Hover or focus the top-center area to reveal the native unwatched filter and its original count; click its text directly to toggle it. The adjacent arrow expands or collapses search and navigation, saving the choice. Touch devices show the entry directly. Column count adapts to the available width.

The expanded header contains a compact rounded search field, a navigation/account menu constrained to the viewport, and Appearance settings. Menus close on outside click or Escape. The unwatched filter remains directly accessible at the top edge; introductory text sits at the footer to prioritize posters.

## Installation

Create a new script in Tampermonkey, paste the complete contents of [douview.user.js](./douview.user.js), save it, and visit or reload <https://movie.douban.com/top250>.

In Chrome, enable Allow User Scripts on Tampermonkey's extension details page.

The [install link](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/douview/douview.user.js) supports installation and update checks.

Only Top 250 and its pagination/filter query parameters are affected. Native movie links and collection actions remain controlled by Douban. Disabling the script and reloading restores the original page. Hiding ads does not block their network requests.

Version 1.1.3 passed JavaScript syntax checking and isolated headless Chrome checks at 320px, 390px, 768px and 1280px: no horizontal overflow, unclipped search buttons, unobstructed navigation overlays within the viewport, hover visibility and native filter clicks, header collapse and expansion, settings overlay boundaries, Escape dismissal, settings writes and reset, expanded full information, retained native nodes/listeners and dynamic multi-action updates. No runtime errors occurred. The fixture models Douban markup with placeholder posters and mocked GM storage. Live checks in the in-app browser and Edge could not complete because browser control reads timed out; real-site CSS compatibility, Tampermonkey reload/pagination persistence and actual collection submissions remain unverified.

Historical 1.0.0 checks covered live posters, availability labels, hidden promotions and the unwatched page's dual-action markup. Earlier isolated checks used original styles and 20 real posters. Those results do not constitute live verification of 1.1.0.

Typography scaling was verified in the isolated fixture at target poster widths of 160px, 240px and 360px: computed title, rating and supporting text sizes increased with card width, stayed capped and caused no horizontal overflow.

## License

[MIT](../LICENSE)
