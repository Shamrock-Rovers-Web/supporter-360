# Agent Coordination Quick Reference

## Current Session: Supporter 360 Integrations

### Active Agents
| Agent | Focus | Reservation | Status |
|-------|-------|-------------|--------|
| 1 | Stripe | `integrations/stripe/**` | PENDING |
| 2 | Mailchimp | `integrations/mailchimp/**` | PENDING |
| 3 | GoCardless | `integrations/gocardless/**` | PENDING |
| 4 | Orchestrator | `infrastructure/**` | PENDING |

### Communication Threads

Create these directories for thread-based coordination:
```
.agent-mail/
├── integration-progress/    # Status updates
├── integration-blockers/    # Problems/blockers
└── integration-review/      # Review before merge
```

### Thread Format

```
From: agent-1-stripe
To: orchestrator
Subject: STRIPE_TYPES_COMPLETE

Body: Created Stripe types matching API docs. Ready for review.
Files modified:
- packages/backend/src/integrations/stripe/types.ts
```

### File Reservation Check

Before editing, check if file is reserved:
```bash
cat .agent-mail/reservations.json | grep {filepath}
```

To reserve a file:
```bash
echo '{"agent":"agent-1-stripe","file":"...","reserved_at":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}' >> .agent-mail/reservations.json
```

### Completion Checklist

Each agent must complete before marking done:
- [ ] API documentation read
- [ ] Types created matching real API
- [ ] Client implemented with auth
- [ ] Processor updated
- [ ] Local TypeScript build passes
- [ ] Thread marked COMPLETE

### Orchestrator Handoff

When all 3 agents report COMPLETE:
1. Review all changed files
2. Add secrets to CDK stack
3. Deploy infrastructure
4. Validate endpoints
5. Update NOTES.md

### Emergency Stop

If agent goes rogue:
```bash
# Kill all Claude processes
pkill -f "claude"

# Check git status
git status

# Stash if needed
git stash
```
