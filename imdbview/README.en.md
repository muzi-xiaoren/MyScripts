# IMDbView

A light poster wall for IMDb Top 250, following DouView's visual style.

Current version: `1.1.0`.

- Adjustable poster width (160–360 px) and card spacing (8–40 px), saved locally.
- Compact heading and native filters; DouView-style appearance settings open in a viewport-constrained overlay with outside-click and Escape dismissal.
- Card titles, Chinese labels, metadata, ratings and actions scale with actual card width. Titles use up to two lines, spacing is reduced, and title-info controls no longer overlap watched controls through negative margins.
- The header and chart tools start collapsed and remember the user's choice. The chart title lives in a floating toggle revealed on hover or keyboard focus; touch devices keep it visible.
- Hovering or focusing the toggle reveals the full native title, share entry, watched progress and appearance settings in an overlay, without shifting posters.
- Hides chart ads and the sidebar, retaining IMDb navigation, search and account menus.
- Retains native watchlist, watched/unwatched, rating and title information controls.
- Adds a Chinese title next to the original, matched by IMDb ID through Wikidata. Mainland and simplified Chinese labels take precedence. Missing or ambiguous matches keep the original title only.
- Retains native sorting and filtering. Watched progress reads and follows native data, with labels and the bar on separate rows.
- A light share overlay stays anchored without resizing the header. It provides Facebook, X / Twitter, email and Copy link; sharing is completed by the user on the destination.
- Shows complete posters, requesting larger images with an original-image fallback.
- Runs only on `/chart/top/`, including URLs with query parameters.

Install [Tampermonkey](https://www.tampermonkey.net/), then click [Install IMDbView](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/imdbview/imdbview.user.js). Alternatively, create a script in Tampermonkey and replace the template with [imdbview.user.js](./imdbview.user.js). Open IMDb Top 250 and hover near the top-center toggle to access appearance settings. The script selects IMDb's compact view and styles its original cards; account actions remain handled by IMDb.

An earlier poster-wall revision was tested against the actual IMDb DOM and styles in a local browser preview: all 250 cards, desktop and 390 px layouts, live sizing and spacing, persistence after reload, reset, and appearance-panel outside-click and Escape dismissal. All 750 native rating, watched and watchlist control labels and states were preserved. That revision passed syntax validation with no observed preview runtime errors.

The local preview omits IMDb's application scripts. Live account actions, native filtering/sorting and React updates still require testing after installation on IMDb. No account ratings or watchlists were changed.

Version 1.1.0 passed syntax checking and isolated Chrome checks at 320px, 390px, 768px and 1280px: separated progress labels/bar, live progress-data updates, stable share position and header size, share/settings viewport bounds, Escape and outside dismissal, native watched-node/listener retention, and card font scaling. No runtime errors occurred. The fixture uses modeled IMDb markup and placeholder posters; live IMDb React updates, system clipboard copying and external share destinations remain unverified.

Chinese labels are requested anonymously from `query.wikidata.org` in sequential batches of up to 50 public IMDb IDs, with one retry. Results are cached for 30 days (7 days for missing labels). No IMDb login cookies are sent. This feature adds `GM_xmlhttpRequest` and a restricted `@connect` permission and has not been tested yet.

MIT · [中文](./README.md)
