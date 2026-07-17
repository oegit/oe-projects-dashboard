# Reporting a project

How to put a project on this dashboard and keep it honest. If you want the field-by-field reference instead, that is [SCHEMA.md](./SCHEMA.md).

## The loop

**1. Edit your own file, and only your own file.** One project is one file: `data/<slug>.json`. Nobody's status is entangled with anybody else's, which is what makes two people updating on the same day a non-event. If you are adding a project, create `data/<slug>.json` and add the slug to `manifest.json` — those are the only two files you touch.

**2. Set `last_updated` to today.** It means *a human looked at this file today and it is still true* — not *this file was edited today*. So it moves even when nothing else does. Confirming that everything is unchanged is the update.

**3. Validate before you push.**

```bash
node scripts/validate.js
```

The same command CI runs, so a green run here means a green run there. It checks the shape of every data file, the manifest, and the two rules below that the schema cannot express on its own. If you have never run it in this clone, `npm ci` first.

**4. Commit at the end of your session.** Not at the end of the week. A status page nobody updated is worse than no status page — it is a confident wrong answer, and readers cannot tell the difference from the outside.

## What CI will refuse

Two rules exist because JSON Schema cannot express either — both are about how items in a list relate to each other, not about any single value.

**A project marked `done` must have every milestone `done`.** Claiming a project is finished while its own checklist says otherwise is a contradiction, not a judgment call.

**Milestones must read `done` → `in progress` → `next`.** No `done` after an unfinished one; no `in progress` after a `next`. Several `in progress` at once is fine — parallel work is real. If a finished milestone genuinely belongs after an unfinished one, the list is telling you the plan changed: reorder it to match reality.

The reverse of the first rule is allowed on purpose: every milestone can be `done` while `status` stays `on track`. Finishing the checklist is not the same as finishing the project, and you get to make that call.

## Editorial rules

**Write as if it were already public, because it is.** This repository is public. Do not write anything here you would not say to the person the project is about. Say the same thing you would say internally, in a way that survives being read by someone who was not in the room: no internal codenames, no team drama, no unreleased commercial numbers.

**English.** Everything in the repository — data, docs, commit messages.

**Outcomes, not activity.** "We built a thing that does X" beats "worked on X". The test: if a reader cannot tell what changed in the world, it is activity. A card is read by someone deciding whether to care, not by someone auditing your week.

**Evidence is public links only.** An `evidence` link must be `https://` and must open for a reader who is not logged in — a public repository, a live page, a published doc. The test is not "is this a URL" but "can the reader click this and see the thing".

Real work sometimes lives behind a login, and that has a cost worth naming: it cannot be linked here. The move is not to link it anyway. Write the outcome plainly and link whatever public artifact records it — often the finding survives publicly even when the tool that produced it does not. An outcome with no evidence is better than an outcome with a dead link.

Never put a local file path in a data file, even though `data/` is exempt from the repository's portability grep. The exemption exists so a project can name itself — not as a licence to ship paths from your laptop.

**Status is your call, and it is a claim.**

| | |
|---|---|
| `on track` | Moving, no help needed. |
| `at risk` | Something will slip unless something changes. Say it here before it becomes obvious elsewhere. |
| `blocked` | Stopped, waiting on something outside the project. |
| `on hold` | Deliberately paused. Not a failure — a decision. |
| `done` | Finished. Every milestone must be `done` too. |

The page never computes this. It cannot: milestones carry no dates, and without a date there is nothing for "at risk" to be measured against. Only you know. The badge is worth exactly as much as your willingness to type `at risk` on your own project — a dashboard where everything is `on track` is a dashboard nobody reads.

**Anything without evidence stays out, or becomes a `next` milestone.** Never write a card from memory.

## After you push

CI runs on the way in. If it fails, the data never reaches the page — read the error, fix the file, push again.

Once it is green, give the live page a few minutes. Pages serves through a CDN that can hand out the previous version of a file for a little while after a push. The page already cache-busts its own fetches, so this resolves on its own. It is expected, not a bug, and not worth debugging.
