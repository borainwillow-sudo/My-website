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

- **Add photos** — select many at once; each is resized and thumbnailed. New
  photos are laid out in three columns at the end of the page, each going to
  whichever column is currently shortest so tall photos don't leave gaps.
  Nothing already on the page moves.
- **Add text** — drops a paragraph on the page, two columns wide, below
  everything else, with the caret already in it. See below.
- **Arrange** — reflows everything on the page, photos and text together, into
  three columns. Handy for starting from a tidy grid; it replaces the current
  positions, so it asks first. It flows things in reading order — down the
  page, then across — rather than the order they were added.

### Moving photos around

- **Drag** a photo anywhere. Faint blue guides appear when an edge or centre
  lines up with another photo.
- **Drag near the top or bottom of the window** and the page scrolls, so a
  photo can be moved right across a page several screens tall.
- **Arrow keys** nudge the selected photo (the one with the blue outline) by a
  hair; hold **Shift** for larger steps. Easier than dragging for fine
  alignment.
- **Resize** from the square handle at the bottom-right corner.

### Everything else in edit mode

- **Replace / Crop / Adjust / Link / Front / Remove** from the buttons above a
  photo on hover
- Edit any text directly on the page (titles, captions, body copy)
- **Style** — set Helvetica weight and size for each kind of text, and upload a custom cursor
- **Pages** — rename, reorder, add and delete pages and sections

### Reordering pages

**Pages** lists every page in menu order, with a **↑** and **↓** beside each
one. The arrows move a page one step at a time and the menu updates
immediately; the order in the panel is the order in the menu. A section's
children move within their own section, so a sub-page can't accidentally jump
out into the top-level menu. The arrows grey out at the ends of a list.

Arrows rather than dragging, so it works the same on an iPad — dragging a list
row there fights with scrolling the panel.

## Rotating and desaturating a photo

**Adjust** on a photo opens a panel with a live preview:

- **Rotate left / right** turns the photo in quarter steps. The page reflows
  around the new shape — a landscape photo turned upright takes an upright
  slot — and four turns bring it back where it started.
- **Saturation** runs from 0% (black and white) to 200%. 100% is the photo as
  shot.
- **Reset** puts both back to default.

Neither is written into the image file. They're stored as two numbers and
applied when the photo is drawn, which means changing them is instant, costs
no upload, adds no files, loses no quality however many times you change your
mind, and can always be undone. A photo you never adjust keeps exactly the
entry it always had in `data.json`.

The one place that can't work with a drawn-on rotation is **Crop**, which has
to cut from what you actually see. So cropping a rotated photo turns it upright
first and bakes the rotation into the new file — after which the photo is
genuinely that way round and the rotation setting is back to zero. Saturation
survives a crop untouched, since it was never baked in. **Replace** puts a
different photo in the slot, so it clears both.

## Text on a page

**Add text** puts a paragraph on the canvas. It moves, resizes, snaps to the
guides and takes arrow-key nudges exactly like a photo does — it's the same
kind of object, it just holds words.

- **Drag it by the dotted grip bar** along its top edge. The text itself isn't
  a drag surface: clicking it has to put the caret in, or you couldn't type.
- **Type straight into it.** Enter starts a new paragraph, and the line breaks
  are kept.
- **Resize** from the corner handle. Only the width is yours to set; the height
  follows the words, so a narrower block gets taller and the page grows to fit.
- **Align** cycles left → centre → right.
- **Remove** deletes it.

Text blocks use the **Body text** weight and size from **Style**, so all the
paragraphs across the site stay consistent. They sit above photos where the two
overlap, which is what you want for a caption laid over an image.

On phones they take the full width of the screen and fall into place among the
photos in reading order — down the page, then across — rather than all landing
at the bottom.

## Photo links and hover labels

**Link** on a photo opens a panel with two independent settings:

- **Hover label** — fades in over the photo when the pointer is over it. Use it
  for a project name. Desktop only; touch devices have no hover, so the label
  never appears there and never gets stuck visible after a tap.
- **Link** — pick a page on this site from the dropdown, or type any web
  address. A photo with a link opens that link when clicked instead of opening
  the lightbox. Internal links open in the same tab, external ones in a new
  tab. A bare domain gets `https://` added for you.

Together these give the usual portfolio home page: a grid of photos, each
linking to a project, with its name appearing on hover. The label and the
caption underneath are separate, so use either, both, or neither.

While editing, a small blue `link` marker sits above any photo that has one.

## Logo instead of the name

**Style → Heading → Upload logo** replaces the text at the top with your own
wordmark. Use a PNG with a transparent background.

- **Logo width** sets how much of the sidebar column it fills. On phones it's
  capped by height instead, so it fits the top bar.
- The site name is still used for the browser tab and for screen readers, so
  keep it filled in even when a logo is showing.
- **Remove** puts the text heading back.

## Custom cursor

**Style → Cursor → Upload image** takes a small PNG with a transparent
background and uses it as the pointer across the whole site.

- Pick the **size** before uploading — it's baked into the file, so to change
  it, upload again.
- **Tip** sets which part of the image is the click point: top-left (like a
  normal arrow) or centre (better for a crosshair or dot).
- Desktop only. Touch devices have no pointer, so nothing changes there.
- The normal cursors still apply while you're editing, so grab, grabbing and
  resize keep telling you what's draggable.
- **Remove** reverts to the standard arrow.

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
click **Connect**, check the repository field says
`borainwillow-sudo/My-website`, and paste the token.

The repository field is filled in automatically when the site is served from
`*.github.io`. On any other host — Netlify, a custom domain, or a local
server — type it in as `owner/repository` (pasting the full GitHub URL works
too). It's remembered afterwards.

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
