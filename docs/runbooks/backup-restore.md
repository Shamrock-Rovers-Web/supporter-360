# Backup and Restore Runbook

**Purpose:** Procedures for backing up and restoring Supporter 360 data and configuration.

**Last Updated:** 2026-03-24

---

## Table of Contents

1. [Backup Strategy Overview](#backup-strategy-overview)
2. [Automated Backups](#automated-backups)
3. [Manual Backup Procedures](#manual-backup-procedures)
4. [Restore Procedures](#restore-procedures)
5. [Backup Verification](#backup-verification)
6. [Disaster Recovery](#disaster-recovery)

---

## Backup Strategy Overview

### Backup Components

| Component | Backup Method | Retention | Frequency |
|-----------|--------------|-----------|-----------|
| **RDS Database** | Automated snapshots | 7 days (configurable) | Continuous |
| **S3 Raw Payloads** | S3 Versioning + Cross-region replication | 90 days (Glacier) | Continuous |
| **Lambda Functions** | CloudFormation/CDK code | Indefinite (Git) | Per deployment |
| **Secrets Manager** | Automatic versioning | 30 days | Per change |
| **API Gateway Config** | CloudFormation export | Indefinite | Per deployment |

### Recovery Objectives

- **RPO (Recovery Point Objective):** 5 minutes (data loss tolerance)
- **RTO (Recovery Time Objective):** 1 hour (downtime tolerance)
- **Critical Path:** Database restore > Lambda redeploy > API reconfigure

---

## Automated Backups

### RDS Automated Backups

**Status:** Enabled by default with 7-day retention.

```bash
# Check current backup settings
aws rds describe-db-clusters \
  --db-cluster-identifier supporter360-supporter360-database \
  --query 'DBClusters[0].{BackupRetentionPeriod:BackupRetentionPeriod,BackupWindow:PreferredBackupWindow}'

# Update backup retention to 30 days (recommended)
aws rds modify-db-cluster \
  --db-cluster-identifier supporter360-supporter360-database \
  --backup-retention-period 30 \
  --apply-immediately

# Verify backup window
aws rds describe-db-clusters \
  --db-cluster-identifier supporter360-supporter360-database \
  --query 'DBClusters[0].PreferredBackupWindow'
```

### Enable Cross-Region Backup Replication

```bash
# Create destination KMS key in DR region
aws kms create-key \
  --description 'Supporter360 DR encryption key' \
  --region us-east-1

# Create cross-region copy of automated snapshots
# (Requires custom Lambda function or AWS Backup)
```

### AWS Backup (Recommended)

```bash
# Create backup vault
aws backup create-backup-vault \
  --backup-vault-name Supporter360-Backups \
  --encryption-key-arn arn:aws:kms:eu-west-1:<account>:key/<key-id>

# Create backup plan
cat > backup-plan.json <<EOF
{
  "BackupPlanName": "Supporter360-Daily-Backup",
  "Rules": [
    {
      "RuleName": "DailyBackups",
      "TargetBackupVaultArn": "arn:aws:backup:eu-west-1:<account>:backup-vault:Supporter360-Backups",
      "ScheduleExpression": "cron(0 2 * * ? *)",
      "StartWindowMinutes": 60,
      "CompletionWindowMinutes": 120,
      "Lifecycle": {
        "DeleteAfterDays": 30
      }
    }
  ]
}
EOF

aws backup create-backup-plan \
  --backup-plan file://backup-plan.json

# Assign resources to backup plan
aws backup create-backup-selection \
  --backup-plan-id <backup-plan-id> \
  --selection-name Supporter360-Resources \
  --iam-role-arn arn:aws:iam::<account>:role/AWSBackupDefaultServiceRole \
  --resources '["arn:aws:rds:eu-west-1:<account>:cluster:supporter360-supporter360-database"]'
```

---

## Manual Backup Procedures

### Database Snapshots

#### Create Manual Snapshot

```bash
# Create snapshot
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
aws rds create-db-snapshot \
  --db-cluster-identifier supporter360-supporter360-database \
  --db-snapshot-identifier supporter360-manual-${TIMESTAMP}

# Wait for snapshot to complete
aws rds wait db-snapshot-available \
  --db-cluster-identifier supporter360-supporter360-database \
  --db-snapshot-identifier supporter360-manual-${TIMESTAMP}

# Verify snapshot
aws rds describe-db-snapshots \
  --db-snapshot-identifier supporter360-manual-${TIMESTAMP}
```

#### List Snapshots

```bash
# List all snapshots
aws rds describe-db-snapshots \
  --db-cluster-identifier supporter360-supporter360-database \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime,SnapshotType]' \
  --output table

# List snapshots created in last 7 days
aws rds describe-db-snapshots \
  --db-cluster-identifier supporter360-supporter360-database \
  --query 'DBSnapshots[?SnapshotCreateTime>=`2024-03-17`]' \
  --output table

# Sort by creation time
aws rds describe-db-snapshots \
  --db-cluster-identifier supporter360-supporter360-database \
  --query 'DBSnapshots | sort_by(@, &SnapshotCreateTime) | reverse(@) | [].[DBSnapshotIdentifier,SnapshotCreateTime]' \
  --output table
```

#### Export Snapshot to S3

```bash
# Export snapshot to S3 for long-term retention
aws rds start-export-task \
  --export-task-identifier supporter360-export-${TIMESTAMP} \
    --source-arn arn:aws:rds:eu-west-1:<account>:cluster:supporter360-supporter360-database \
    --s3-bucket-name supporter360-database-exports \
    --iam-role-arn arn:aws:iam::<account>:role/ExportRole \
    --kms-key-id arn:aws:kms:eu-west-1:<account>:key/<key-id>

# Monitor export progress
aws rds describe-export-tasks \
  --export-task-identifier supporter360-export-${TIMESTAMP}
```

### S3 Data Backup

#### Export Raw Payloads

```bash
# Sync raw payloads bucket to backup bucket
aws s3 sync s3://supporter360-raw-payloads \
  s3://supporter360-backups/raw-payloads-$(date +%Y%m%d) \
  --storage-class GLACIER

# Enable cross-region replication
aws s3 put-bucket-replication \
  --bucket supporter360-raw-payloads \
  --replication-configuration file://replication-config.json
```

#### Backup S3 Versioning

```bash
# List all object versions
aws s3api list-object-versions \
  --bucket supporter360-raw-payloads \
  --prefix shopify/2024-03-24/

# Create version backup
aws s3api get-object \
  --bucket supporter360-raw-payloads \
  --key shopify/2024-03-24/uuid.json \
  --version-id <version-id> \
  backup-file.json
```

### Lambda Function Backup

#### Export Lambda Functions

```bash
# Create backup directory
mkdir -p lambda-backups
cd lambda-backups

# Export all Lambda functions
for func in $(aws lambda list-functions --query 'Functions[?contains(FunctionName, `Supporter360`)].FunctionName' --output text); do
  echo "Backing up $func..."

  # Get function code
  aws lambda get-function \
    --function-name $func \
    --query 'Code.Location' \
    --output text > ${func}.url

  # Download code
  curl -o ${func}.zip $(cat ${func}.url)

  # Get configuration
  aws lambda get-function-configuration \
    --function-name $func \
    > ${func}.config.json

  # Get environment variables
  aws lambda get-function-configuration \
    --function-name $func \
    --query 'Environment.Variables' \
    > ${func}.env.json
done

# Create archive
tar -czf lambda-backups-$(date +%Y%m%d-%H%M%S).tar.gz *.zip *.json *.url
```

#### Backup Lambda via Git

```bash
# Commit current state
cd /home/ubuntu/supporter-360
git add -A
git commit -m "Backup before deployment: $(date)"

# Tag release
git tag -a backup-$(date +%Y%m%d-%H%M%S) -m "Manual backup tag"

# Push to remote
git push origin --tags
```

### Configuration Backup

#### Export CloudFormation Stack

```bash
# Get stack template
aws cloudformation get-template \
  --stack-name Supporter360StackV2 \
  --query 'TemplateBody' \
  > cloudformation-stack-$(date +%Y%m%d).json

# Get stack parameters
aws cloudformation describe-stacks \
  --stack-name Supporter360StackV2 \
  --query 'Stacks[0].Parameters' \
  > cloudformation-parameters-$(date +%Y%m%d).json

# Get stack outputs
aws cloudformation describe-stacks \
  --stack-name Supporter360StackV2 \
  --query 'Stacks[0].Outputs' \
  > cloudformation-outputs-$(date +%Y%m%d).json
```

#### Backup Secrets Manager

```bash
# Create directory for secrets backup
mkdir -p secrets-backup
cd secrets-backup

# Export all Supporter 360 secrets
for secret in $(aws secretsmanager list-secrets --query 'SecretList[?contains(Name, `supporter360`)].Name' --output text); do
  echo "Backing up $secret..."

  # Get secret value
  aws secretsmanager get-secret-value \
    --secret-id $secret \
    > ${secret//\//-}.json

  # Get secret versions
  aws secretsmanager list-secret-version-ids \
    --secret-id $secret \
    > ${secret//\//-}-versions.json
done

# Create archive
tar -czf secrets-backup-$(date +%Y%m%d-%H%M%S).tar.gz *.json
```

**WARNING:** Store secrets backup securely. Encrypt with KMS or use AWS Secrets Manager replication.

#### Export API Gateway Configuration

```bash
# Get API ID
API_ID=$(aws apigateway get-rest-apis --query 'Items[?name==`Supporter360StackV2`].id' --output text)

# Export API definition
aws apigateway get-export \
  --rest-api-id $API_ID \
  --stage-name prod \
  --export-type oas30 \
  api-gateway-definition-$(date +%Y%m%d).json

# Export stage configuration
aws apigateway get-stage \
  --rest-api-id $API_ID \
  --stage-name prod \
  > api-gateway-stage-$(date +%Y%m%d).json
```

---

## Restore Procedures

### Database Restore

#### Restore from Snapshot

```bash
# List available snapshots
aws rds describe-db-snapshots \
  --db-cluster-identifier supporter360-supporter360-database \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime]' \
  --output table

# Restore from snapshot
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier supporter360-supporter360-database-restored \
  --snapshot-identifier <snapshot-id> \
  --engine aurora-postgresql \
  --engine-version 14.15 \
  --vpc-security-group-ids <sg-id> \
  --db-subnet-group-name <subnet-group-name>

# Wait for restore to complete
aws rds wait db-cluster-available \
  --db-cluster-identifier supporter360-supporter360-database-restored

# Verify restore
aws rds describe-db-clusters \
  --db-cluster-identifier supporter360-supporter360-database-restored
```

#### Point-in-Time Recovery

```bash
# Restore to specific time
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier supporter360-supporter360-database \
  --db-cluster-identifier supporter360-database-pitr-$(date +%Y%m%d-%H%M%S) \
  --restore-type copy-on-write \
  --use-latest-restorable-time \
  --port 5432

# Or restore to specific timestamp
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier supporter360-supporter360-database \
  --db-cluster-identifier supporter360-database-pitr-specific \
  --restore-type copy-on-write \
  --restore-to-time 2024-03-24T10:00:00Z \
  --port 5432
```

#### Switch to Restored Database

```bash
# Option 1: Update Lambda environment variables
aws secretsmanager update-secret \
  --secret-id Supporter360StackV2-postgres \
  --secret-string '{"host":"<restored-db-endpoint>","port":5432,"dbname":"supporter360","username":"...","password":"..."}'

# Option 2: Rename databases (requires downtime)
aws rds modify-db-cluster \
  --db-cluster-identifier supporter360-supporter360-database \
  --new-db-cluster-identifier supporter360-supporter360-database-old \
  --apply-immediately

aws rds modify-db-cluster \
  --db-cluster-identifier supporter360-supporter360-database-restored \
  --new-db-cluster-identifier supporter360-supporter360-database \
  --apply-immediately
```

### S3 Data Restore

#### Restore from Glacier

```bash
# Initiate restore request
aws s3api restore-object \
  --bucket supporter360-raw-payloads \
  --key shopify/2024-03-24/uuid.json \
  --restore-request Days=30,GlacierJobParameters={"Tier":"Standard"}

# Check restore status
aws s3api head-object \
  --bucket supporter360-raw-payloads \
  --key shopify/2024-03-24/uuid.json \
  --query 'Restore'

# Wait for restore to complete (may take hours)
# Use 'Expedited' tier for faster restore (higher cost)
```

#### Restore from Backup Bucket

```bash
# Sync from backup bucket
aws s3 sync \
  s3://supporter360-backups/raw-payloads-20240324 \
  s3://supporter360-raw-payloads \
  --dry-run

# Confirm and restore
aws s3 sync \
  s3://supporter360-backups/raw-payloads-20240324 \
  s3://supporter360-raw-payloads
```

### Lambda Function Restore

#### Restore from Backup

```bash
# Extract backup archive
tar -xzf lambda-backups-20240324-100000.tar.gz
cd lambda-backups

# Restore specific function
aws lambda update-function-code \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --zip-file fileb://Supporter360StackV2-ShopifyProcessor.zip

# Restore configuration
aws lambda update-function-configuration \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --timeout $(jq '.Timeout' Supporter360StackV2-ShopifyProcessor.config.json) \
  --memory-size $(jq '.MemorySize' Supporter360StackV2-ShopifyProcessor.config.json)

# Restore environment variables
aws lambda update-function-configuration \
  --function-name Supporter360StackV2-ShopifyProcessor \
  --environment file://Supporter360StackV2-ShopifyProcessor.env.json
```

#### Restore from Git

```bash
# Checkout backup tag
git tag -l
git checkout backup-20240324-100000

# Rebuild Lambda functions
cd packages/backend
npm install
npm run build

# Deploy to AWS
cd ../infrastructure
npm run build
cdk deploy Supporter360StackV2 --require-approval never
```

### Configuration Restore

#### Restore Secrets Manager

```bash
# Extract secrets backup
tar -xzf secrets-backup-20240324-100000.tar.gz
cd secrets-backup

# Restore specific secret
aws secretsmanager put-secret-value \
  --secret-id supporter360/stripe \
  --secret-string file://supporter360-stripe.json

# Or restore previous version
aws secretsmanager restore-secret-version \
  --secret-id supporter360/stripe \
  --version-id <previous-version-id>
```

#### Restore API Gateway Configuration

```bash
# Get API ID
API_ID=$(aws apigateway get-rest-apis --query 'Items[?name==`Supporter360StackV2`].id' --output text)

# Import API definition
aws apigateway put-rest-api \
  --rest-api-id $API_ID \
  --mode overwrite \
  --fail-on-warnings \
  --body file://api-gateway-definition-20240324.json
```

---

## Backup Verification

### Database Snapshot Verification

```bash
# Verify snapshot exists
aws rds describe-db-snapshots \
  --db-snapshot-identifier <snapshot-id> \
  --query 'DBSnapshots[0].Status'

# Verify snapshot size
aws rds describe-db-snapshots \
  --db-snapshot-identifier <snapshot-id> \
  --query 'DBSnapshots[0].AllocatedStorage'

# Verify snapshot timestamp
aws rds describe-db-snapshots \
  --db-snapshot-identifier <snapshot-id> \
  --query 'DBSnapshots[0].SnapshotCreateTime'
```

### Test Restore Procedure

```bash
# Create test database from snapshot
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier supporter360-test-restore \
  --snapshot-identifier <snapshot-id> \
  --engine aurora-postgresql \
  --engine-version 14.15

# Verify test database
TEST_HOST=$(aws rds describe-db-clusters \
  --db-cluster-identifier supporter360-test-restore \
  --query 'DBClusters[0].Endpoint' \
  --output text)

psql -h $TEST_HOST -U <DB_USER> -d supporter360 -c "SELECT COUNT(*) FROM supporters;"

# Delete test database after verification
aws rds delete-db-cluster \
  --db-cluster-identifier supporter360-test-restore \
  --skip-final-snapshot
```

### Backup Integrity Check

```bash
# Verify S3 object integrity
aws s3api head-object \
  --bucket supporter360-raw-payloads \
  --key shopify/2024-03-24/uuid.json \
  --query 'ContentLength,ETag'

# Verify Lambda backup integrity
unzip -t Supporter360StackV2-ShopifyProcessor.zip

# Verify secrets backup
jq '.' supporter360-stripe.json
```

---

## Disaster Recovery

### Disaster Recovery Plan

#### Scenario 1: Complete Region Failure

```bash
# 1. Deploy stack in DR region
cd packages/infrastructure
export AWS_REGION=us-east-1
cdk deploy Supporter360StackV2 --require-approval never

# 2. Restore database from cross-region snapshot
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier supporter360-supporter360-database \
  --snapshot-identifier <snapshot-id> \
  --region us-east-1

# 3. Update DNS to point to DR region
# (Route53 failover)

# 4. Re-register webhooks with DR API endpoints
```

#### Scenario 2: Ransomware Attack

```bash
# 1. Isolate affected systems (disable API, stop Lambda)
# 2. Identify last clean backup (before attack)
# 3. Restore database from clean snapshot
# 4. Scan for vulnerabilities
# 5. Patch security issues
# 6. Rebuild Lambda functions from clean Git commit
# 7. Rotate all secrets
# 8. Verify data integrity
# 9. Resume operations
```

#### Scenario 3: Data Corruption

```bash
# 1. Identify time of corruption
# 2. Use point-in-time recovery to restore before corruption
# 3. Export affected data from corrupted database
# 4. Compare with restored database
# 5. Reconcile data differences
# 6. Re-apply legitimate changes made after corruption point
```

### Disaster Recovery Testing

```bash
# Schedule quarterly DR test
# 1. Notify team of planned test
# 2. Create test environment in DR region
# 3. Restore from most recent backup
# 4. Verify all functionality
# 5. Document RTO and RPO
# 6. Identify and fix issues
# 7. Clean up test environment
```

---

## Backup Monitoring

### CloudWatch Alarms

```bash
# Alarm for snapshot age > 24 hours
aws cloudwatch put-metric-alarm \
  --alarm-name supporter360-backup-age \
  --alarm-description "Alert if no recent snapshot" \
  --metric-name BackupAge \
  --namespace Supporter360 \
  --statistic Maximum \
  --period 86400 \
  --threshold 86400 \
  --comparison-operator GreaterThanThreshold

# Alarm for backup failures
aws cloudwatch put-metric-alarm \
  --alarm-name supporter360-backup-failures \
  --alarm-description "Alert if backup fails" \
  --metric-name BackupFailures \
  --namespace Supporter360 \
  --statistic Sum \
  --period 3600 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold
```

### Backup Reports

```bash
# Generate daily backup report
cat > generate-backup-report.sh <<'EOF'
#!/bin/bash

echo "=== Supporter 360 Backup Report ==="
echo "Date: $(date)"
echo ""

echo "Database Snapshots:"
aws rds describe-db-snapshots \
  --db-cluster-identifier supporter360-supporter360-database \
  --query 'DBSnapshots | sort_by(@, &SnapshotCreateTime) | reverse(@) | [0:3] | [].[DBSnapshotIdentifier,SnapshotCreateTime,SnapshotType]' \
  --output table

echo ""
echo "S3 Backup Buckets:"
aws s3 ls s3://supporter360-backups/ --recursive | tail -10

echo ""
echo "Lambda Backups:"
ls -lth lambda-backups/*.tar.gz | head -3

echo ""
echo "=== End Backup Report ==="
EOF

chmod +x generate-backup-report.sh
```

---

## Backup Best Practices

1. **3-2-1 Rule**
   - 3 copies of data (production + 2 backups)
   - 2 different storage types (database + object storage)
   - 1 off-site backup (cross-region replication)

2. **Regular testing**
   - Monthly restore tests
   - Quarterly DR drills
   - Annual off-site recovery test

3. **Immutable backups**
   - Use S3 Object Lock for critical data
   - Enable versioning on all S3 buckets
   - Prevent accidental deletion

4. **Automated monitoring**
   - Alert on backup failures
   - Alert on stale backups
   - Alert on backup size anomalies

5. **Documentation**
   - Document restore procedures
   - Document backup locations
   - Document encryption keys

---

**Remember:** A backup is only as good as its restore. Test your backups regularly.
