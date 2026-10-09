# Usability Session Protocol — AC-6 (Phase 08 preparation)

Preparation artifact for PRD acceptance criterion **AC-6** ("a non-technical member completes
the core task without developer assistance").

- Status: **PREPARATION ONLY. AC-6 remains PARTIAL.** No usability session has been run. This
  document is what a real session needs; execution is a human action owned by the product owner
  (blocker B2). Do not mark AC-6 as passed until a completed session record exists.
- Owner of execution: product owner. Owner of this protocol: `studio-web`.
- Related: `docs/phases/phase-08-release-verification/brief.md` (B2), `docs/a11y-audit.md`.

## 1. Objective

Observe whether a non-technical curriculum team member can complete the core authoring journey
in MathsAlot Studio **without developer or facilitator assistance**, and record where they
hesitate, err, or need explanation. This is a formative usability check of the console UI and
information architecture — not a functional test (the automated suite already covers behaviour).

## 2. Participant profile

- **Who:** a non-technical curriculum/education staff member who has never used MathsAlot Studio.
  "Non-technical" means: comfortable with web forms and spreadsheets, but not with code, IDs,
  schemas, or developer tools.
- **Sample:** 1 participant minimum for a first pass; 3 preferred to see recurring friction.
  Each session is independent.
- **Recruiting:** use someone outside the build team. Do not use a developer, QA, or anyone who
  has read this repo.
- **Consent:** explain the goal (improve the tool, not test the person), that the session is
  recorded, and that they may stop at any time. Capture consent before starting.

## 3. Environment and setup

- **Backend:** a Studio-owned staging environment (API + a non-production Studio database) with
  the permission catalogue seeded. **Never use production data or a shared demo database.**
- **Account:** a fresh `STAFF` account for the participant holding exactly the permissions the
  core task needs (Trick content/structure write, Sequence/Curriculum write, vetting). Prepare
  the account before the session so the participant does not start at a login/permission wall.
- **Seed data:** one World with at least one existing Trick, so "build a Sequence" has material.
- **Recording:** screen + audio capture with consent; a second device or observer for notes.
- **Facilitator kit:** this script, the observation template (§6), and a stopwatch.

## 4. Core task script

Read aloud, then stay quiet. The participant drives; the facilitator does not touch the keyboard
or mouse and does not name UI elements. Use only neutral prompts ("What are you thinking?", "Go
on."). If the participant is stuck for > 3 minutes, record it as a blocker and offer only a
minimal nudge, noting that help was required (this counts against the "without assistance"
criterion).

**Scenario:** "You are adding a new maths Trick to the curriculum and getting it ready to go
live. Please do the following, thinking aloud as you go."

1. **Sign in** to MathsAlot Studio with the account provided.
2. **Find** the World named in the seed data and open it.
3. **Create a Trick** with a name and kind.
4. **Author all three age tiers** of the Trick — for each of the three tiers, write the wording
   and the scenario (the participant must discover that all three are required).
5. **Save everything** (the participant must reach a "saved" state; they may use per-section
   save or "Save all").
6. **Build a Sequence** in the World's Curriculum: create a Sequence, give it a name and
   objective, and **assign the Trick** to it with a role (introduced / retained / revisited).
7. **Vet the Trick** — mark it Verified, confirming validity, domain, and edge cases.
8. **Publish the Trick** — reach a successful publish. If the console blocks publishing, the
   participant must work out **why** from the on-screen readiness information and resolve it.

Stop when the participant publishes, gives up, or the time cap (20 minutes) is reached.

## 5. Success criteria

AC-6 passes if a participant **completes the full task with no developer assistance**. Record
these measures:

| Measure | Target |
| --- | --- |
| Task completion | Full task completed unaided |
| Assistance required | 0 facilitator interventions that name a control or action |
| Time on task | Recorded; no hard target (baseline for future runs) |
| Critical errors | 0 unrecoverable errors (data loss, wrong publish) |
| Blocked publish recovery | Participant identifies the unmet readiness requirement from the UI and resolves it |
| Confidence | Participant reports they knew whether work was saved, dirty, or failed |

Any assistance that names a control, or any failure to recover a blocked publish from on-screen
information alone, means AC-6 **fails** for that participant and the friction is logged.

## 6. Observation capture template

For each step record: start/end time, outcome (completed / assisted / abandoned), and notes.

```
Step: ______
Outcome: completed | assisted | abandoned
Time: ____
Hesitations (where did they pause, re-read, backtrack?):
Mis-clicks / wrong turns:
Quotes (verbatim):
What the UI did not make obvious:
Severity (blocks task | costs time | cosmetic):
```

Also record once per session:

```
Session date: ______   Participant id: P__   Facilitator: ______
Environment/commit: ______
Overall: completed unaided?  Y / N
Assistance events (what was said):
Top 3 friction points:
Participant confidence (save state, publish readiness): ______
```

## 7. Analysis and follow-up

- Group observations by screen and by the success criteria. A friction point seen in ≥ 2 sessions
  is a candidate UX change; anything that blocks the task is a defect.
- Convert findings into scoped `studio-web` tasks (presentation/IA only). Do not relax any server
  rule or publication gate to make the task "easier" — the gate is the product requirement.
- Store the completed session record (notes, consent, recording reference) with the product owner
  and cite it in the phase brief. Update AC-6 status only from that record.

## 8. Explicit non-claims

- AC-6 is **not** passed by this document. It is preparation.
- The automated coverage referenced in Phase 07 (`world-editor`, `trick-detail`,
  `curriculum-builder`, `sequence-editor`, `fact-editor`, `vetting-panel`, `publish-readiness`
  tests) is structural only and does **not** satisfy AC-6.
