# The data contract

Every project on the dashboard is one JSON file in `data/`, named after its slug: `data/<slug>.json`. `schema.json` is the contract those files are held to, and CI rejects anything that breaks it.

This page explains each field and, where it matters, why it works the way it does. If you just want to update a project, read [REPORTING.md](./REPORTING.md) instead — it's the shorter path.

## The shape

```json
{
  "schema_version": "1",
  "slug": "example-project",
  "name": "Example Project",
  "type": "agent",
  "status": "on track",
  "summary": "One line telling a stakeholder what this project is.",
  "last_updated": "2026-07-16",
  "objectives": [
    "What the project set out to do."
  ],
  "outcomes": [
    {
      "text": "Something the project actually produced.",
      "evidence": [
        { "label": "Public repository", "url": "https://example.com/repo" }
      ]
    }
  ],
  "milestones": [
    { "title": "The part that is finished", "state": "done" },
    { "title": "The part being worked on", "state": "in progress" },
    { "title": "The part that comes next", "state": "next" }
  ]
}
```

## The fields

| Field | Required | What it is |
|---|---|---|
| `schema_version` | yes | Always `"1"` today. See [Versioning](#versioning). |
| `slug` | yes | Lowercase kebab-case. Must match the filename and the `manifest.json` entry — CI checks all three agree. |
| `name` | yes | Display name, as a stakeholder would say it out loud. |
| `type` | yes | `agent` · `campaign` · `system`. Drives the label on the card and nothing else. |
| `status` | yes | `on track` · `at risk` · `blocked` · `on hold` · `done`. See [Status is typed](#status-is-typed-not-computed). |
| `summary` | yes | One line telling a stakeholder what this is. No jargon, no internal names. |
| `last_updated` | yes | `YYYY-MM-DD`. The day a human last reviewed the file. |
| `objectives` | yes, min 1 | What the project set out to do. Written once; they rarely change. |
| `outcomes` | no | What it actually produced. Each may carry `evidence`. |
| `milestones` | yes, min 1 | The path, in order. Drives the progress bar. |

Unknown fields are rejected. That's deliberate: a typo like `last_update` would otherwise sit there silently while the card shows nothing, and you'd have no reason to suspect the file. Better to fail loudly at the gate.

### Status is typed, not computed

`status` is the writer's judgment call. The page never derives it.

It has to work that way, because milestones carry no dates. "At risk" means *this is going to slip* — and without a date to slip against, no amount of counting milestones can tell you that. Only the person doing the work knows. So they type it.

The one rule CI enforces: **`status: "done"` requires every milestone to be `done`.** Claiming a project is finished while its own milestone list says otherwise is a contradiction, not a judgment call.

The reverse is allowed on purpose. Every milestone can be `done` while `status` stays `on track` — maybe there's a review pending, or the last piece landed but nobody's confirmed it works. Finishing the checklist isn't the same as finishing the project, and the writer gets to make that call.

### Progress is derived

The card's progress bar is computed by the page: milestones in state `done`, over total. It isn't a field, and you can't set it. This is what keeps the bar honest — it can only move when the milestone list moves.

### Milestones carry no dates, so order carries the sequence

There is no date field on a milestone, and this is a decision rather than an omission. Dates on a status page rot: they get set once, missed quietly, and then every reader has to guess whether the date is a plan, a promise, or a fossil. The order of the list is the sequence, and the state is where you are in it.

Because order is load-bearing, CI enforces it: **`done` → `in progress` → `next`**. No `done` after an `in progress` or a `next`; no `in progress` after a `next`. Several `in progress` at once is fine — parallel work is real.

If a `done` milestone genuinely belongs after an unfinished one, the list is telling you the plan changed. Reorder it to match reality.

### Evidence is public links only

An `evidence` link must be `https://` and must open for a reader who is not logged in: a public repository, a live page, a published doc.

The test isn't "is this a URL" — it's "can the person reading the card click this and see the thing." A link into a private repo, an internal tool, or anything behind a login fails that test, so the schema rejects anything that isn't `https://` and review catches the rest.

This costs something, and it's worth naming. Real work sometimes lives behind a login, and that work can't be linked here. The move is not to link it anyway — it's to write the outcome plainly, and link whatever public artifact records it. Often the finding survives publicly even when the tool that produced it doesn't.

Local file paths never appear in a data file, even though `data/` is exempt from the repository's portability grep. The exemption exists so a project's own name can appear in its own data — not as a licence to ship paths from someone's laptop.

## Versioning

`schema_version` is `"1"` and every data file declares it.

It exists so this contract can change without breaking anyone who forked the dashboard. A fork pinned to `"1"` keeps working; when the shape changes, the version goes to `"2"` and the migration is explicit rather than a silent reinterpretation of the same field names.

### Version 1 is frozen — 2026-07-17

The first project was written against this contract and reviewed against it, and the shape held. Version 1 is closed as of that review.

Closed means: further projects are written against it **as-is**. A project that does not fit is a finding about how that project is being described — not a reason to widen the contract so the awkward case slides through. That reflex is exactly how a schema stops meaning anything: it quietly becomes whatever the most recent writer needed, every earlier file silently changes meaning, and nothing is portable any more.

Changing the shape from here is a deliberate act: `schema_version` goes to `"2"`, the migration is written down, and it is decided on purpose. It is not an edit to this file.

## Checking a file

```bash
node scripts/validate.js
```

Validates every file in `data/`, plus the manifest and the two ordering rules above. Exits non-zero on any failure — the same command CI runs, so a green local run means a green CI run.
