#!/bin/bash
#
# Spawn Agent Swarm for Supporter 360 Integrations
#
# This script launches 4 coordinated agents to implement Stripe, Mailchimp,
# and GoCardless integrations in parallel.
#
# Usage: ./spawn-agents.sh
#

set -e

SESSION="support360-integrations"
PROJECT_DIR="/home/ubuntu/Projects/supporter"

echo "🚀 Spawning Agent Swarm: $SESSION"
echo ""

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "❌ tmux is not installed. Install it first:"
    echo "   sudo apt-get install tmux"
    exit 1
fi

# Kill existing session if it exists
if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "⚠️  Killing existing session: $SESSION"
    tmux kill-session -t "$SESSION"
fi

# Create new session with main window
tmux new-session -d -s "$SESSION" -n "orchestrator" -c "$PROJECT_DIR"

# Create windows for each agent
tmux new-window -t "$SESSION" -n "stripe" -c "$PROJECT_DIR"
tmux new-window -t "$SESSION" -n "mailchimp" -c "$PROJECT_DIR"
tmux new-window -t "$SESSION" -n "gocardless" -c "$PROJECT_DIR"

# Set up Orchestrator window (window 0)
tmux send-keys -t "$SESSION:orchestrator" "cat AGENT_SWARM_PLAN.md | grep -A 50 'Agent 4:'" Enter
tmux send-keys -t "$SESSION:orchestrator" "echo 'Waiting for integration agents to complete...'" Enter

# Set up Stripe agent (window 1)
tmux send-keys -t "$SESSION:stripe" "echo '🤖 Agent 1: Stripe Integration'" Enter
tmux send-keys -t "$SESSION:stripe" "cat AGENT_SWARM_PLAN.md | grep -A 30 'Agent 1: Stripe'" Enter
tmux send-keys -t "$SESSION:stripe" "claude" Enter

# Set up Mailchimp agent (window 2)
tmux send-keys -t "$SESSION:mailchimp" "echo '🤖 Agent 2: Mailchimp Integration'" Enter
tmux send-keys -t "$SESSION:mailchimp" "cat AGENT_SWARM_PLAN.md | grep -A 30 'Agent 2: Mailchimp'" Enter
tmux send-keys -t "$SESSION:mailchimp" "claude" Enter

# Set up GoCardless agent (window 3)
tmux send-keys -t "$SESSION:gocardless" "echo '🤖 Agent 3: GoCardless Integration'" Enter
tmux send-keys -t "$SESSION:gocardless" "cat AGENT_SWARM_PLAN.md | grep -A 30 'Agent 3: GoCardless'" Enter
tmux send-keys -t "$SESSION:gocardless" "claude" Enter

# Create a monitoring window
tmux new-window -t "$SESSION" -n "monitor" -c "$PROJECT_DIR"
tmux send-keys -t "$SESSION:monitor" "watch -n 5 'echo \"=== Agent Mail ===\" && ls -la .agent-mail/integration-progress/ 2>/dev/null || echo \"No progress yet\"'" Enter

# Attach to the orchestrator window
echo "✅ Agent swarm spawned!"
echo ""
echo "Windows:"
echo "  0: orchestrator  - Coordinates infrastructure deployment"
echo "  1: stripe       - Implements Stripe integration"
echo "  2: mailchimp    - Implements Mailchimp integration"
echo "  3: gocardless   - Implements GoCardless integration"
echo "  4: monitor      - Agent mail monitoring"
echo ""
echo "Navigation:"
echo "  Ctrl+b w        - List windows"
echo "  Ctrl+b 0-4      - Jump to window"
echo "  Ctrl+b ,        - Rename window"
echo "  Ctrl+b d        - Detach (keep running)"
echo ""
echo "Attaching to orchestrator window..."
sleep 1
tmux attach-session -t "$SESSION:orchestrator"
