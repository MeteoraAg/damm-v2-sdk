#!/usr/bin/env bash
# Run this script once GitHub auth is configured.
# Requires: gh CLI authenticated + push access to MeteoraAg/damm-v2-sdk

set -e

BRANCH="feat/damm-v2-0.2.0-support"
TITLE="feat: support DAMM v2 program v0.2.0 — Compounding fee mode, pool layout versioning, remove partner fee"

echo "→ Pushing branch..."
git push origin "$BRANCH"

echo "→ Creating draft PR..."
gh pr create \
  --repo MeteoraAg/damm-v2-sdk \
  --head "$BRANCH" \
  --base main \
  --title "$TITLE" \
  --body-file PR_BODY.md \
  --draft

echo "✓ PR created."
