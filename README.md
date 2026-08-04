# My-website

willow borain's photography portfolio — a static site (plain HTML/CSS/JS,
no build step, no framework).

## Structure

- `index.html`, `styles.css` — app shell and styling
- `js/data.js` — fallback default content (used only if `data.json` can't be fetched)
- `js/store.js` — persistence, auth (SHA-256 password hash), export/import, image resizing
- `js/crop.js` — the photo crop modal
- `js/app.js` — hash router, page rendering, edit-mode interactions
- `data.json` — the published content: site name, home photo(s), and the
  `personal`/`work` project categories with their photos

## Running locally

No build step needed. From this directory:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## How editing works

Click **edit site** (bottom right) to enter edit mode. The first time, you'll
set a password; after that you'll be prompted for it. While editing you can:

- replace / crop / remove / add photos on the home page and any project page
- edit project names, years, and photo captions inline
- add or delete whole projects from **manage projects** (in the nav menu)

All edits are saved to `localStorage` in your browser only ("saved to this
browser"). Nothing is sent to a server.

- **export data** downloads the current content as `data.json`.
- **import data** loads a previously exported `data.json` back in.
- **publish site** downloads `data.json` too — since this is a static site
  with no backend, making edits visible to *other* visitors means replacing
  the repo's `data.json` with the downloaded file and redeploying. Locally,
  your browser already shows your edits either way.
- **reset to defaults** discards local edits and reverts to the last
  published `data.json`.

Note: the edit-mode password is a convenience gate stored in the browser,
not real security — anyone with dev tools can bypass it. Don't rely on it to
keep content private.
