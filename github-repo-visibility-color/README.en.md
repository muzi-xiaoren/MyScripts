English · [中文](README.md)

# GitHub Repo Visibility Badge Colors

Color the **visibility badges** in GitHub's profile / repository list:

- **Public** → green text + green outline
- **Private** → blue text + blue outline

The style matches GitHub's native “Public archive” outline pill; `Public archive` / `Private archive` are left untouched (orange). Colors use GitHub's own CSS variables, so they adapt to light / dark themes automatically.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/github-repo-visibility-color/github-repo-visibility-color.user.js).

> **Edge / Chrome (Manifest V3) note:** if the script is enabled but nothing changes, open Tampermonkey's details page in `edge://extensions` (or `chrome://extensions`) and turn on **"Allow user scripts"** (or enable Developer mode), then reload the page.

## Scope

Any badge whose text is exactly `Public` / `Private` on any `https://github.com/*` page, including:

- The repository list on a profile (Overview / Repositories tabs)
- The visibility badge in a repository page header

## Customize colors

Edit the injected CSS at the top of the script — change the colors in `.mzx-vis-public` / `.mzx-vis-private`.
