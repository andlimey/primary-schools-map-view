---
name: commit-staged-changes
description: Use when the user asks to commit the staged changes, commit what's staged, or commit the index in this repo.
---

# Commit Staged Changes

Commit exactly what is currently staged in git — nothing more, nothing less.

## Steps

1. Run `git status` and `git diff --staged` to see what's staged. If nothing is staged, tell the user and stop (do not `git add` anything yourself unless the user explicitly asks).
2. Run `git log --oneline -5` to match this repo's commit message style.
3. Review the staged diff for secrets or files that shouldn't be committed (`.env`, credentials, keys) even if the filename looks innocuous. Warn the user and stop if found — don't commit them.
4. Write a concise commit message (1-2 sentences) focused on *why*, matching the repo's style.
5. Commit with the message via a HEREDOC, e.g.:
   ```bash
   git commit -m "$(cat <<'EOF'
   <message>

   Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
   EOF
   )"
   ```
6. Run `git status` to confirm the commit succeeded.

## Guardrails

- Never use `git add -A` or `git add .` — only what's already staged gets committed.
- Never `--amend` unless the user explicitly asks.
- Never `--no-verify` or skip hooks. If a pre-commit hook fails, fix the underlying issue, re-stage, and create a new commit.
- Never push. This skill only commits locally.
