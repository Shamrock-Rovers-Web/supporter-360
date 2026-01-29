#!/bin/bash
# Scan for common secret patterns in the codebase
set -e

echo "🔍 Scanning for potential secrets in codebase..."
echo ""

FOUND=0

# Stripe live keys
if grep -r "sk_live_" packages/ 2>/dev/null; then
    echo "❌ FOUND: Stripe LIVE secret keys"
    grep -rn "sk_live_" packages/ 2>/dev/null
    FOUND=1
fi

# Stripe test keys (warning)
if grep -r "sk_test_" packages/ 2>/dev/null; then
    echo "⚠️  FOUND: Stripe TEST secret keys (should be in env/secrets)"
    grep -rn "sk_test_" packages/ 2>/dev/null
    FOUND=1
fi

# Stripe webhook secrets
if grep -r "whsec_" packages/ 2>/dev/null; then
    echo "❌ FOUND: Stripe webhook secrets"
    grep -rn "whsec_" packages/ 2>/dev/null
    FOUND=1
fi

# GoCardless live tokens
if grep -r "live_[A-Za-z0-9]\{39\}" packages/ 2>/dev/null; then
    echo "❌ FOUND: GoCardless LIVE tokens"
    grep -rn "live_[A-Za-z0-9]\{39\}" packages/ 2>/dev/null
    FOUND=1
fi

# Mailchimp API keys (pattern: xxx-usxx)
if grep -r "[a-z0-9]\{32\}-us[0-9]\{2\}" packages/ 2>/dev/null; then
    echo "❌ FOUND: Mailchimp API keys"
    grep -rn "[a-z0-9]\{32\}-us[0-9]\{2\}" packages/ 2>/dev/null
    FOUND=1
fi

# Generic secrets
if grep -r "SET_IN_ENV" packages/ 2>/dev/null; then
    echo "⚠️  FOUND: Placeholder secrets that need configuration"
    grep -rn "SET_IN_ENV" packages/ 2>/dev/null
    FOUND=1
fi

# Check for .env files
if find . -name ".env" -o -name ".env.local" 2>/dev/null | grep -v node_modules; then
    echo "⚠️  FOUND: .env files (should be in .gitignore)"
    find . -name ".env" -o -name ".env.local" 2>/dev/null | grep -v node_modules
    FOUND=1
fi

if [ $FOUND -eq 0 ]; then
    echo "✅ No secrets found in codebase"
    exit 0
else
    echo ""
    echo "❌ Security issues found! Please remediate before committing."
    exit 1
fi
