# My-website

Willow Borain's photography portfolio — a static site (plain HTML/CSS/JS,
Helvetica throughout, no build step and no framework) with an in-browser
editor that publishes straight to this repository.

Live at **https://borainwillow-sudo.github.io/My-website/**

## Structure

- `index.html`, `styles.css` — app shell and styling
- `data.json` — all site content: name, typography, pages, photo positions
- `photos/` — published images (created automatically when you publish)
- `js/data.js` — default content, used only if `data.json` can't be fetched
- `js/store.js` — draft state, password gate, IndexedDB staging for photos
- `js/images.js` — resizing and thumbnail generation
- `js/github.js` — GitHub API client (atomic multi-file commits)
- `js/layout.js` — free-form drag/resize with alignment guides
- `js/crop.js` — crop modal
- `js/app.js` — router, rendering, edit mode

## Running locally

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Editing

Click **Edit site** (bottom right). The first time you'll set a password;
after that it asks for it. In edit mode you can:

- **Add photos** — select many at once; each is resized and thumbnailed
- **Drag photos** anywhere on the page; faint blue guides appear when an edge
  or centre lines up with another photo, and it snaps into place
- **Resize** with the square handle at a photo's bottom-right corner
- **Replace / Crop / Front / Remove** from the buttons above a photo on hover
- Edit any text directly on the page (titles, captions, body copy)
- **Type** — set Helvetica weight and size for each kind of text
- **Pages** — rename, add, delete pages and sections

Positions are stored as percentages, so a layout keeps its proportions at any
window size. Outside edit mode photos are fixed and no longer draggable.

On phones the free-form layout falls back to a simple stacked grid, since
desktop coordinates don't translate to a narrow screen.

## How saving works

Edits save to your browser immediately as you work. To make them public the
site commits to this repository via the GitHub API.

**One-time setup:** create a
[fine-grained personal access token](https://github.com/settings/personal-access-tokens/new)
with **Repository access: only `My-website`** and
**Permissions → Repository → Contents: Read and write**. Then in edit mode
click **Connect** and paste it.

After that, saving is automatic: about 2.5 seconds after you stop making
changes, `data.json` and any new photos are committed in a single commit. The
status text at bottom-left shows `Saving…` then `Saved`. GitHub Pages
redeploys within roughly a minute, which is when visitors see the change.
**Save now** forces an immediate save, and **Done** saves before exiting.

The token is stored only in your browser. Anyone with your unlocked device
could use it to write to this one repository — revoke it from GitHub settings
if that ever matters. The edit password is a convenience gate, not real
security; it doesn't protect anything from someone using dev tools.

If you add photos and close the tab before publishing, they're kept in
IndexedDB and restored next time you open the site in edit mode — the status
bar will say how many are waiting.

## About image quality and speed

Each upload produces two files: a display version capped at 2560px (quality
0.85) and an 800px thumbnail. Grids load thumbnails and lazy-load them as you
scroll, so pages stay fast even with hundreds of photos; the full display
version loads only when a photo is opened.

2560px exceeds what any current screen can show, so this is visually identical
to the original while being roughly a tenth the size — about 120MB for 200
photos, which sits comfortably within GitHub's limits. Your original files are
never uploaded or altered; keep them backed up separately.
