#!/bin/bash
# Add API keys to the database config table

DB_HOST="supporter360stack-supporter360database3a977b01-tdx3anttjiwx.cmfwmmgu7sye.eu-west-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="supporter360"
DB_USER="postgres"

if [ -n "$1" ]; then
    DB_PASSWORD="$1"
else
    echo "Enter database password:"
    read -s DB_PASSWORD
    echo ""
fi

export PGPASSWORD="$DB_PASSWORD"

echo "Adding API keys to config table..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Insert API keys configuration
INSERT INTO config (key, value, description) VALUES
('api_keys', '{
    "dev-admin-key": {"role": "admin", "name": "Dev Admin Key"},
    "dev-staff-key": {"role": "staff", "name": "Dev Staff Key"}
}'::jsonb, 'API keys for authentication')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

EOF

echo ""
echo "API keys added:"
echo "  Admin: dev-admin-key (role: admin)"
echo "  Staff: dev-staff-key (role: staff)"
echo ""
echo "Test with:"
echo "curl -H 'X-API-Key: dev-admin-key' 'https://2u9a7una05.execute-api.eu-west-1.amazonaws.com/prod/search?q=test'"
