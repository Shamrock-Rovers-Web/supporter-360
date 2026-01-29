#!/bin/bash
# Remove docs with secret placeholders from git history

echo "⚠️  WARNING: This will rewrite git history"
echo "Files to be removed from history:"
echo "  - docs/NEXT-STEPS.md"
echo "  - docs/SECURITY-REMEDIATION.md"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo "Removing files from git history..."
git filter-repo \
  --invert-paths \
  --path docs/NEXT-STEPS.md \
  --path docs/SECURITY-REMEDIATION.md \
  --force

echo "✅ Files removed from git history"
echo ""
echo "Next steps:"
echo "1. Verify the files are gone: git log --all --full-history -- docs/NEXT-STEPS.md"
echo "2. Force push to remote: git push origin --force --all"
echo "3. Delete local refs: git push origin --force --tags"
