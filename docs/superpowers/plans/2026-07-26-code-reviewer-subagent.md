# Code-Reviewer Subagent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project-level Claude Code subagent (`.claude/agents/code-reviewer.md`) that the main session invokes proactively after non-trivial code changes to catch correctness bugs, without being asked by name.

**Architecture:** A single markdown subagent definition with YAML frontmatter (`name`, `description`, `tools`) and a system-prompt body. The `description` field is the trigger mechanism — Claude Code's orchestrator reads it to decide when to invoke the agent, so its wording must clearly state both the "review this" and "skip this" conditions. The agent is read-only (`Read`, `Grep`, `Glob`, `Bash`, `ReportFindings`) and reports findings; it never edits code.

**Tech Stack:** Claude Code project-level subagents (`.claude/agents/*.md`), no other dependencies.

## Global Constraints

- Subagent file location: `.claude/agents/code-reviewer.md` (project-level, committed to the repo) — per spec's "Location" section.
- Tools: exactly `Read, Grep, Glob, Bash, ReportFindings` — no `Edit`/`Write` — per spec's "Tools" section.
- No `model:` override in frontmatter — inherit the default model — per spec's "Model" section.
- Scope is correctness/bugs only; explicitly excludes style, naming, architecture, and simplification per spec's "Scope" section.
- No hook-based enforcement — triggering is description-driven only, per spec's "Trigger mechanism" section.

---

### Task 1: Create the code-reviewer subagent

**Files:**
- Create: `.claude/agents/code-reviewer.md`

**Interfaces:**
- Produces: a subagent named `code-reviewer`, invocable via the `Agent` tool with `subagent_type: "code-reviewer"`, and eligible for proactive invocation by the main session based on its `description`.

- [ ] **Step 1: Create the subagent definition file**

Create `.claude/agents/code-reviewer.md` with this exact content:

```markdown
---
name: code-reviewer
description: Use PROACTIVELY after non-trivial code changes — new features, new endpoints/routes, non-trivial logic changes, bug fixes, or multi-file changes — to catch correctness issues before the user has to ask for a review. Do NOT invoke for typo fixes, formatting-only diffs, comment-only changes, doc-only changes, or trivial config tweaks. This agent reviews correctness only (logic errors, edge cases, broken invariants, regressions) — it does not comment on style, naming, or simplification; use /code-review or the simplify skill for those.
tools: Read, Grep, Glob, Bash, ReportFindings
---

You are a correctness-focused code reviewer for this project. Your only job
is to catch bugs introduced by the changes you're given — not to comment on
style, naming, formatting, or architecture.

## Process

1. Determine what changed:
   - If the current branch has an upstream tracking branch, run
     `git diff @{upstream}...HEAD` to see everything on this branch.
   - Otherwise, review uncommitted work: `git diff` (unstaged) and
     `git diff --staged` (staged).
   - If both of those are empty, review the most recent commit with
     `git show HEAD`.
2. Read every changed file in full — not just the diff hunks. You need to
   see call sites, surrounding logic, and existing invariants to judge
   whether the change breaks something that isn't visible in the hunk
   itself.
3. Look specifically for:
   - Logic errors and incorrect assumptions.
   - Edge cases the change doesn't handle (empty input, `None`/`null`,
     boundary values, unexpected types, concurrent access).
   - Invariants elsewhere in the codebase that this change now violates.
   - Regressions — behavior that used to work and no longer does.
4. Do NOT flag style, formatting, naming, import ordering, or "this could
   be simplified" — those are out of scope for this agent.
5. Report findings using the `ReportFindings` tool, most severe first. If
   nothing survives scrutiny, call it with an empty findings list — do not
   invent issues just to have something to report.
```

- [ ] **Step 2: Validate the frontmatter is well-formed**

Run:
```bash
python3 -c "
import re
text = open('.claude/agents/code-reviewer.md').read()
m = re.match(r'^---\n(.*?)\n---\n', text, re.S)
assert m, 'frontmatter block not found'
import yaml
fm = yaml.safe_load(m.group(1))
assert fm['name'] == 'code-reviewer'
assert 'PROACTIVELY' in fm['description']
assert fm['tools'] == 'Read, Grep, Glob, Bash, ReportFindings'
assert 'model' not in fm
print('OK')
"
```
Expected output: `OK`. (Requires `pyyaml`; if it's not installed in the active venv, run `uv pip install pyyaml` first — it's only needed for this one-off check, not a project dependency.)

- [ ] **Step 3: Manual dry-run validation**

This step has no automated test — it confirms the agent is actually
invoked proactively and actually catches a bug, which can only be checked
by driving a real session.

1. On a scratch branch, introduce a small deliberate bug in this repo (for
   example, an off-by-one in a loop bound, or dropping a `None` check
   before an attribute access) in a file with existing logic.
2. In a fresh Claude Code session in this repo, describe the change you
   made as if finishing a feature (e.g. "I've updated the school
   deduplication logic, here's the diff") without asking for a review by
   name.
3. Confirm two things:
   - The main session invokes the `code-reviewer` subagent on its own
     (visible as an `Agent` tool call with `subagent_type: "code-reviewer"`).
   - The reported findings correctly identify the bug you introduced.
4. Revert the deliberate bug (`git checkout -- <file>` or `git reset --hard`
   on the scratch branch) once validated. Do not merge the scratch bug
   anywhere.

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/code-reviewer.md
git commit -m "Add proactive code-reviewer subagent"
```
