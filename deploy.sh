#!/bin/bash

set -e

echo "Building Supporter 360..."

echo "Step 1: Installing dependencies..."
npm install

echo "Step 2: Building shared package..."
cd packages/shared
npm run build
cd ../..

echo "Step 3: Building backend..."
cd packages/backend
npm run build
cd ../..

echo "Step 4: Building infrastructure..."
cd packages/infrastructure
npm run build

echo "Step 5: Deploying AWS infrastructure..."
npx cdk deploy --require-approval never

echo "Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Get database credentials from AWS Secrets Manager"
echo "2. Run database schema: psql -h <DB_HOST> -U postgres -d supporter360 -f packages/database/schema.sql"
echo "3. Configure webhook URLs in Shopify, Stripe, and GoCardless"
echo "4. Set up environment variables in Lambda functions if needed"
echo ""
echo "API endpoints are available at the API Gateway URL from CDK outputs"
