# Agent Mail - Coordination System

This directory implements the Agent Mail pattern from ACFS for multi-agent coordination.

## Structure

```
.agent-mail/
├── reservations.json      # File reservation locks
├── integration-progress/  # Status updates
├── integration-blockers/  # Blockers/problems
└── integration-review/    # Code review requests
```

## Message Format

Messages are JSON files with timestamp-based naming:

```json
{
  "id": "msg-001",
  "from": "agent-1-stripe",
  "to": "orchestrator",
  "timestamp": "2026-01-28T19:22:00Z",
  "subject": "STRIPE_TYPES_COMPLETE",
  "body": "...",
  "files_changed": ["packages/backend/src/integrations/stripe/types.ts"]
}
```

## Reservations

Before editing a file, agents must reserve it in `reservations.json`:

```json
{
  "packages/backend/src/integrations/stripe/types.ts": {
    "reserved_by": "agent-1-stripe",
    "reserved_at": "2026-01-28T19:22:00Z",
    "ttl_seconds": 3600
  }
}
```

## Thread Protocol

1. **integration-progress/** - "I'm starting X", "I finished Y"
2. **integration-blockers/** - "Blocked by Z", "Need help with W"
3. **integration-review/** - "Ready for review", "LGTM", "Fix requested"

## Current Session

Session: support360-integrations
Started: 2026-01-28
Agents: 4 (stripe, mailchimp, gocardless, orchestrator)
