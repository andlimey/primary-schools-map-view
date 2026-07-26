# Design: Proactive Code-Reviewer Subagent

## Purpose

Add a project-level Claude Code subagent that reviews code for correctness
after major changes, so bugs get caught before the user asks for review
explicitly.

## Trigger mechanism

Description-driven. Claude Code subagents are invoked when the orchestrating
session decides to call them, guided by the subagent's `description` field.
There is no hook forcing invocation — the subagent's description tells the
main session when it's appropriate to call it ("use PROACTIVELY after ..."),
matching how other proactive agents in this environment behave (e.g.
`claude-code-guide`).

The description encodes a heuristic for "major" vs. trivial changes:

- **Review-worthy**: new features, new endpoints/routes, non-trivial logic
  changes, bug fixes, multi-file changes.
- **Skip**: typo fixes, formatting-only diffs, comment-only changes,
  doc-only changes, trivial config tweaks.

## Scope

Correctness and bugs only: logic errors, edge cases, incorrect assumptions,
broken invariants, regressions relative to prior behavior. Out of scope:
style, naming, architecture opinions, and simplification — those are already
covered by the existing `/code-review` and `simplify` skills, and this
subagent should not duplicate them.

## Location

`.claude/agents/code-reviewer.md` — project-level (checked into this repo),
not user-level, so it travels with the project and applies to anyone working
in it.

## Tools

Read-only: `Read`, `Grep`, `Glob`, `Bash`, `ReportFindings`.

- `Bash` is used only to inspect the diff (`git diff`, `git log`, `git show`)
  — never to edit files.
- No `Edit`/`Write` access. The agent reports findings; it does not fix them.
  This keeps review and fixing as separate steps with a human/orchestrator
  checkpoint in between.
- `ReportFindings` is used to emit results as structured findings
  (most-severe first, empty list if nothing found), matching the existing
  code-review tooling convention in this environment.

## Model

Inherit the default model (no `model:` override). Correctness review needs
the same reasoning quality as the main session; there's no cost pressure
here that justifies pinning to a smaller model.

## Review process (subagent instructions)

1. Determine what changed: prefer `git diff` against the merge-base of the
   current branch and its upstream/default branch; fall back to uncommitted
   changes (`git diff` / `git diff --staged`) if the branch has no diverged
   history worth reviewing.
2. Read changed files with enough surrounding context (not just diff hunks)
   to understand call sites and existing invariants.
3. Analyze for correctness issues only, per Scope above.
4. Call `ReportFindings` with verified findings, most-severe first; call it
   with an empty list if nothing survives verification. Do not also print
   findings as freeform text.

## Testing / validation

No automated test harness applies to a prompt-based agent definition.
Validation is a manual dry run: introduce a small deliberate bug, ask the
main session to review the change, and confirm (a) the subagent gets
invoked without being asked by name, and (b) it correctly flags the bug.

## Out of scope for this change

- No hook-based enforcement of review (rejected in favor of description-driven
  triggering — see Trigger mechanism above).
- No auto-fix capability.
- No duplication of the existing `/code-review`, `/security-review`, or
  `simplify` skills' responsibilities.
