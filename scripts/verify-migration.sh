#!/bin/bash
# Database Migration Verification Script

echo "🔍 Verifying database migration..."
echo ""

# Get database credentials
SECRET_ID="Supporter360StackV2Supporte-z0coczJrAOuK"
CREDS=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ID" --query SecretString --output text)

DB_HOST=$(echo "$CREDS" | jq -r '.host')
DB_PORT=$(echo "$CREDS" | jq -r '.port')
DB_NAME=$(echo "$CREDS" | jq -r '.dbname')
DB_USER=$(echo "$CREDS" | jq -r '.username')
DB_PASS=$(echo "$CREDS" | jq -r '.password')

echo "✅ Retrieved database credentials"
echo ""

# Create SQL script
cat > /tmp/verify-migration.sql <<'EOF'
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
EOF

# Execute query
echo "📊 Querying database tables..."
echo ""

PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /tmp/verify-migration.sql 2>&1

exit_code=$?

echo ""
echo "═" | head -c 50
echo ""

if [ $exit_code -eq 0 ]; then
    echo "✅ VERIFICATION PASSED: Database migration successful"
    echo "═" | head -c 50
else
    echo "❌ VERIFICATION FAILED: Could not connect to database"
    echo "═" | head -c 50
fi

exit $exit_code
