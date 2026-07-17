# Projects Dashboard

A single-page dashboard showing where a set of projects stands. It is a static page on GitHub Pages: no server, no framework, no build step. Each project is one JSON file that a human edits, and the page reads those files directly.

If you are here to update a project, go straight to **[docs/REPORTING.md](./docs/REPORTING.md)**.

## How it works

```
manifest.json          the list of projects, by slug
data/<slug>.json       one file per project — the only thing writers edit
schema.json            the contract those files are held to
scripts/validate.js    checks the data; CI runs this exact command
index.html             the whole page: markup, styles, and the script that draws it
docs/SCHEMA.md         every field, and why it works the way it does
docs/REPORTING.md      how to update a project
```

The page fetches `manifest.json`, then one `data/<slug>.json` per project it lists, and renders a card for each. Every fetch is relative to `index.html`, so the page works from any URL without configuration.

Three ideas carry most of the design:

**The data is the source, and it is validated.** `schema.json` is an executable contract, not a description. A GitHub Action runs `scripts/validate.js` on every push and pull request touching the data, and it fails the build on anything malformed. Since the page reads the branch directly, a bad file would otherwise be live the moment it merged — so the gate is on the way in.

**Progress is derived; status is typed.** The progress bar is computed from the milestone list — done over total — so it cannot be talked up. The status badge is the opposite: a human types it, and the page never guesses it. Milestones carry no dates, so "at risk" is a judgment only the person doing the work can make. The one contradiction CI refuses: a project marked `done` whose milestones say otherwise. See [docs/SCHEMA.md](./docs/SCHEMA.md).

**One broken file costs one card.** If a project's data fails to load, that card renders an error and the rest of the board is unaffected. Only `manifest.json` — the list itself — can take the page down, and it fails to a plain banner rather than a blank screen.

## Running it

Any static file server works, because there is nothing to build. From the repository root:

```bash
python3 -m http.server
```

Then open the address it prints. Opening `index.html` from the filesystem will *not* work — the browser blocks the `fetch` calls — so it has to be served.

To check the data before you push:

```bash
npm ci          # once — installs the validator
node scripts/validate.js
```

That is the same command CI runs. Green locally means green in CI.

## Running your own copy

Fork the repository and enable GitHub Pages on the `main` branch, root folder. That is the whole setup — there is no config file, no secret, and no hardcoded URL to change.

This is deliberate rather than incidental: no account name, workspace path, or organisation string appears anywhere outside `data/`. It is held to by grepping the core files for those strings before a change lands — a review habit, not a CI job, so it is worth knowing it exists. `data/` is exempt so a project can name itself and link its own public artifacts.

Then replace the contents of `data/`, list your slugs in `manifest.json`, and the dashboard is yours.

## License

MIT — see [LICENSE](./LICENSE). Fork it, change it, ship it; keep the copyright notice.
