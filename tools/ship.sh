#!/usr/bin/env bash
# ship.sh "message"   -> commit everything (with trailers) and push the work branch
# ship.sh --deploy    -> after the PR is merged: sync the branch with main and
#                        wait for the GitHub Pages deploy of main's head to finish
set -e
cd "$(dirname "$0")/.."
BR=claude/photography-portfolio-site-k62xjz
if [ "$1" = "--deploy" ]; then
  git fetch -q origin main && git merge -q --ff-only origin/main && git push -q
  sha=$(git rev-parse origin/main)
  for i in $(seq 1 60); do
    r=$(gh api "repos/eyeseerc0310/Eyeseerc-website-/actions/runs?branch=main&per_page=1" \
        --jq '.workflow_runs[0] | "\(.head_sha) \(.status) \(.conclusion)"')
    case "$r" in "$sha completed"*) echo "deployed: $r"; exit 0;; esac
    sleep 10
  done
  echo "deploy still running: $r"; exit 1
fi
[ -n "$1" ] || { echo 'usage: ship.sh "message" | --deploy'; exit 1; }
git add -A
git commit -q -m "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LHh8gAFuLZhbd4VQysaiwQ"
git push -q -u origin "$BR"
git log --oneline -1
