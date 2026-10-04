English · [中文](README.md)

# excookie-igneous

A side floating-box helper for [`excookie.64396439.xyz`](https://excookie.64396439.xyz/): paste your own account's `ipb_member_id` / `ipb_pass_hash`, and with one click it fills the page, picks the US node, requests and reads back the fresh `igneous`. The result is **click-to-copy, double-click-to-edit**.

> This script is **not listed in the root `README.md` script table**; it lives only in this folder — install it on demand.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then [click here to install the script](https://raw.githubusercontent.com/muzi-xiaoren/MyScripts/main/excookie-igneous/excookie-igneous.user.js).

## Usage

1. Open `https://excookie.64396439.xyz/`; an "igneous 助手" box appears at the top-right.
2. Paste into the textarea (only `ipb_member_id` and `ipb_pass_hash` are required; `igneous` can be left empty):

   ```
   ipb_member_id:1234567
   ipb_pass_hash:0123456789abcdef0123456789abcdef
   igneous:
   ```

3. Click "填入页面 · 选美国节点 · 取 igneous". The script fills the account fields, selects the US node, submits the request, and waits for the page to produce a new `igneous`.
4. The result area shows:

   ```
   ipb_member_id:1234567
   ipb_pass_hash:0123456789abcdef0123456789abcdef
   igneous:<the value the page just generated>
   ```

   - **Single click** the result area → copy everything to the clipboard.
   - **Double click** the result area → enter edit mode and tweak it by hand; it leaves edit mode on blur.

## How it works

The site's form has labelled inputs `ipb_member_id` / `ipb_pass_hash`, a "美国 / 德国" radio pair for the node, a `请求并获取 igneous` submit button, and a "结果" region that starts as "等待输入..." and is replaced with the result after submit.

1. Parse the pasted text for `ipb_member_id` and `ipb_pass_hash` (supports `:` or `=`, multi-line / semicolon-separated); if either is missing it stops.
2. Fill both inputs using a native value setter plus `input`/`change` events, so framework-controlled inputs register the change.
3. `pickUsNode` scans the radios/labels for the "美国" keyword and selects it.
4. Record the result area's value before submit, click the submit button, then poll (up to 20s) until the result area shows a **new** `igneous`, extracted with an `igneous`-labelled regex first so it won't grab the `pass_hash` by mistake.

Everything runs locally in your own browser on your own account's cookie — nothing is sent to any third party.

## Config

The page structure may change, so every selector lives in the `CONFIG` block at the top of the script — the input fields, node radios, submit button, and result-reading location are all candidate lists (first match wins). Adjust the candidates to match the real DOM; the logic doesn't need to change.

The box's title bar is draggable, and the "—" on the right collapses/expands it.
