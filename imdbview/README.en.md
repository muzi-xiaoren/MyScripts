# IMDbView

A light poster wall for IMDb Top 250, following DouView's visual style.

Current version: `1.1.5`.

- Adjustable poster width (160–360 px) and card spacing (8–40 px), saved locally.
- Compact heading and native filters; DouView-style appearance settings open in a viewport-constrained overlay with outside-click and Escape dismissal.
- Card titles, Chinese labels, metadata, ratings and actions scale with actual card width. English and Chinese titles occupy separate lines without truncation. Title and metadata areas align to the minimum necessary maximum height within each row. Watched buttons wrap consistently per row, and score badges/rating buttons share a uniform height.
- IMDb ratings appear on the lower-right poster corner and follow native score updates; original vote information is retained in the badge description. The native rating button sits beside the poster score. Watched follows the year/runtime/certificate, wrapping when space is insufficient. The title-info icon follows the Chinese title (or the original title when no translation exists), with tighter spacing before metadata. Controls are positioned without moving React-owned nodes.
- Styles are injected at document-start. A short startup mask prevents the original chart from flashing; it clears immediately after enhancement, or after at most 2.5 seconds if the page structure is unavailable.
- The larger toggle stays visible together with its info panel, anchored to the navigation bottom edge when expanded.
- Compact-view switching retries until ready, at least 550ms apart for the first three attempts and 2 seconds afterward, stopping after success. Native view-class and disabled-button changes are observed to handle late React event attachment. Large posters upgrade only near the viewport; own-widget and native-loader animation mutations do not trigger repeated full scans. Native account-loading states are retained and their live latency remains unverified.
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

Version 1.1.5 passed syntax checking and isolated Chrome checks at 320px, 390px, 768px and 1280px: separated progress labels/bar, live progress-data updates, stable share position and header size, share/settings viewport bounds, Escape and outside dismissal, native watched-node/listener retention, and card font scaling. No runtime errors occurred. The fixture uses modeled IMDb markup and placeholder posters; live IMDb React updates, system clipboard copying and external share destinations remain unverified.

Chinese labels are requested anonymously from `query.wikidata.org` in sequential batches of up to 50 public IMDb IDs, with one retry. Results are cached for 30 days (7 days for missing labels). No IMDb login cookies are sent. This feature adds `GM_xmlhttpRequest` and a restricted `@connect` permission. Cached Chinese labels have been tested for full-title display; live Wikidata requests remain unverified.

Additional isolated checks for 1.1.5 confirmed unclipped long titles, poster rating display and updates, and native rating/watched/info node and event retention, rating controls within the poster, and title-info placement without metadata overlap. Additional startup checks confirmed safe initialization before the root exists, mask release and synchronized toggle/panel visibility.

Enhancement recovers when native initialization overwrites body or collapsed state, removes the stylesheet or settings, rebuilds head/body, or switches back to the detailed list. Relevant mutations are observed; a lightweight two-second state check provides fallback without rescanning healthy cards. Seven overwrite-recovery scenarios passed isolated Chrome regression checks; live IMDb initialization still needs verification.

MIT · [中文](./README.md)
