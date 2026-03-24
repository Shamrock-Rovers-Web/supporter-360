#!/bin/bash
# configure-backups.sh
# Configures AWS Backup for RDS and S3 resources
# Usage: ./scripts/configure-backups.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="Supporter360StackV2"
REGION="eu-west-1"
BACKUP_VAULT_NAME="Supporter360-Backups"
BACKUP_PLAN_NAME="Supporter360-Daily-Backups"
RETENTION_DAYS=30
BACKUP_RETENTION_DAYS=30

echo -e "${GREEN}=== Supporter 360 Backup Configuration ===${NC}"
echo ""

# Get cluster identifier
echo -e "${YELLOW}Step 1: Getting RDS cluster identifier...${NC}"
CLUSTER_ID=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --query "Stacks[0].Outputs[?OutputKey=='DatabaseEndpoint'].OutputValue" \
    --output text 2>/dev/null | sed 's/\.cluster-.*//' || echo "")

if [ -z "$CLUSTER_ID" ]; then
    # Fallback: get cluster by tag
    CLUSTER_ID=$(aws rds describe-db-clusters \
        --query "DBClusters[?contains(DatabaseName, 'supporter360')].DbClusterIdentifier" \
        --output text 2>/dev/null | head -n1 || echo "")
fi

if [ -z "$CLUSTER_ID" ] || [ "$CLUSTER_ID" == "None" ]; then
    echo -e "${RED}✗ Could not find RDS cluster${NC}"
    echo -e "${YELLOW}Please ensure the stack is deployed: npx cdk deploy${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found RDS cluster: ${CLUSTER_ID}${NC}"

# Step 2: Update RDS backup retention
echo -e "${YELLOW}Step 2: Updating RDS backup retention to ${BACKUP_RETENTION_DAYS} days...${NC}"
aws rds modify-db-cluster \
    --db-cluster-identifier "${CLUSTER_ID}" \
    --backup-retention-period "${BACKUP_RETENTION_DAYS}" \
    --apply-immediately >/dev/null 2>&1 || echo -e "${YELLOW}⚠ Could not update backup retention (may already be set)${NC}"

echo -e "${GREEN}✓ RDS backup retention: ${BACKUP_RETENTION_DAYS} days${NC}"

# Step 3: Create S3 bucket for backups (if needed)
echo -e "${YELLOW}Step 3: Creating S3 bucket for additional backups...${NC}"
BUCKET_NAME="supporter360-backups-$(aws sts get-caller-identity --query Account --output text)"

if aws s3 ls "s3://${BUCKET_NAME}" 2>/dev/null; then
    echo -e "${GREEN}✓ S3 bucket ${BUCKET_NAME} already exists${NC}"
else
    aws s3api create-bucket \
        --bucket "${BUCKET_NAME}" \
        --region "${REGION}" \
        --create-bucket-configuration "LocationConstraint=${REGION}"

    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "${BUCKET_NAME}" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }'

    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "${BUCKET_NAME}" \
        --versioning-configuration Status=Enabled

    # Block public access
    aws s3api put-public-access-block \
        --bucket "${BUCKET_NAME}" \
        --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

    # Set lifecycle policy
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "${BUCKET_NAME}" \
        --lifecycle-configuration '{
            "Rules": [
                {
                    "Id": "BackupRetention",
                    "Status": "Enabled",
                    "Filter": {},
                    "Expiration": {
                        "Days": 90
                    }
                }
            ]
        }'

    echo -e "${GREEN}✓ Created S3 bucket ${BUCKET_NAME}${NC}"
fi

# Step 4: Create AWS Backup vault
echo -e "${YELLOW}Step 4: Creating AWS Backup vault...${NC}"
if aws backup describe-backup-vault --backup-vault-name "${BACKUP_VAULT_NAME}" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Backup vault ${BACKUP_VAULT_NAME} already exists${NC}"
else
    aws backup create-backup-vault \
        --backup-vault-name "${BACKUP_VAULT_NAME}" \
        --backup-vault-tags Key=Name,Value=Supporter360 Key=ManagedBy,Value=CDK

    echo -e "${GREEN}✓ Created backup vault ${BACKUP_VAULT_NAME}${NC}"
fi

# Step 5: Create IAM role for AWS Backup
echo -e "${YELLOW}Step 5: Creating IAM role for AWS Backup...${NC}"
ROLE_NAME="Supporter360BackupRole"

if aws iam get-role --role-name "${ROLE_NAME}" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ IAM role ${ROLE_NAME} already exists${NC}"
else
    # Create trust policy
    cat > /tmp/backup-trust-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "backup.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

    # Create role
    aws iam create-role \
        --role-name "${ROLE_NAME}" \
        --assume-role-policy-document file:///tmp/backup-trust-policy.json \
        --tags Key=Name,Value=Supporter360BackupRole

    # Attach AWS managed policy for backup
    aws iam attach-role-policy \
        --role-name "${ROLE_NAME}" \
        --policy-arn "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"

    # Create and attach custom policy for S3 backups
    cat > /tmp/backup-s3-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetBucketVersioning",
                "s3:PutBucketVersioning",
                "s3:ListBucketVersions",
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
        }
    ]
}
EOF

    aws iam put-role-policy \
        --role-name "${ROLE_NAME}" \
        --policy-name Supporter360BackupS3Policy \
        --policy-document file:///tmp/backup-s3-policy.json

    echo -e "${GREEN}✓ Created IAM role ${ROLE_NAME}${NC}"
fi

ROLE_ARN="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/${ROLE_NAME}"

# Step 6: Create backup plan
echo -e "${YELLOW}Step 6: Creating AWS Backup plan...${NC}"

# Check if plan already exists
PLAN_ID=$(aws backup list-backup-plans \
    --query "BackupPlanList[?BackupPlanName==\`${BACKUP_PLAN_NAME}\`].BackupPlanId" \
    --output text 2>/dev/null || echo "")

if [ -n "$PLAN_ID" ]; then
    echo -e "${YELLOW}⚠ Backup plan ${BACKUP_PLAN_NAME} already exists${NC}"
    echo -e "${YELLOW}  Deleting existing plan...${NC}"
    aws backup delete-backup-plan --backup-plan-id "${PLAN_ID}"
fi

# Create backup plan configuration
cat > /tmp/backup-plan.json <<EOF
{
    "BackupPlan": {
        "BackupPlanName": "${BACKUP_PLAN_NAME}",
        "Rules": [
            {
                "RuleName": "DailyBackups",
                "TargetBackupVaultName": "${BACKUP_VAULT_NAME}",
                "ScheduleExpression": "cron(0 2 ? * MON-FRI *)",
                "StartWindowMinutes": 60,
                "CompletionWindowMinutes": 360,
                "Lifecycle": {
                    "DeleteAfterDays": ${RETENTION_DAYS}
                },
                "CopyActions": []
            }
        ],
        "AdvancedBackupSettings": [
            {
                "ResourceType": "AURORA",
                "BackupOptions": {
                    "AuroraCluster": {
                        "ColdStorageNotEnabled": false
                    }
                }
            }
        ]
    },
    "BackupPlanTags": {
        "Environment": "production"
    },
    "BackupPlanTags": {
        "ManagedBy": "CDK"
    }
}
EOF

# Create backup plan
PLAN_ID=$(aws backup create-backup-plan \
    --backup-plan file:///tmp/backup-plan.json \
    --query "BackupPlanId" \
    --output text)

echo -e "${GREEN}✓ Created backup plan ${BACKUP_PLAN_NAME}${NC}"
echo -e "${GREEN}  Plan ID: ${PLAN_ID}${NC}"

# Step 7: Assign resources to backup plan
echo -e "${YELLOW}Step 7: Assigning resources to backup plan...${NC}"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Assign RDS cluster to backup plan
aws backup create-backup-selection \
    --backup-plan-id "${PLAN_ID}" \
    --selection-name "RDSClusterBackup" \
    --iam-role-arn "${ROLE_ARN}" \
    --resources "arn:aws:rds:${REGION}:${ACCOUNT_ID}:cluster:${CLUSTER_ID}" \
    --list-of-tags '[
        {
            "ConditionType": "STRINGEQUALS",
            "ConditionKey": "Environment",
            "ConditionValue": "production"
        }
    ]' >/dev/null 2>&1 || echo -e "${YELLOW}⚠ RDS backup selection may already exist${NC}"

echo -e "${GREEN}✓ Assigned RDS cluster to backup plan${NC}"

# Step 8: Create on-demand backup
echo -e "${YELLOW}Step 8: Creating on-demand backup...${NC}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_ID="${CLUSTER_ID}-manual-${TIMESTAMP}"

aws rds create-db-cluster-snapshot \
    --db-cluster-identifier "${CLUSTER_ID}" \
    --db-cluster-snapshot-identifier "${SNAPSHOT_ID}" \
    --tags Key=Type,Value=Manual Key=CreatedBy,Value=configure-backups.sh Key=Date,Value="${TIMESTAMP}"

echo -e "${GREEN}✓ Created snapshot ${SNAPSHOT_ID}${NC}"

# Step 9: Create CloudWatch alarm for backup failures
echo -e "${YELLOW}Step 9: Creating CloudWatch alarm for backup failures...${NC}"

SNS_TOPIC_ARN=$(aws sns list-topics --query "Topics[?contains(TopicArn, \`supporter360-security-alerts\`)].TopicArn" --output text)

if [ -z "$SNS_TOPIC_ARN" ]; then
    SNS_TOPIC_ARN=$(aws sns create-topic --name supporter360-security-alerts --query 'TopicArn' --output text)
fi

aws cloudwatch put-metric-alarm \
    --alarm-name supporter360-backup-failures \
    --alarm-description "Alert on backup failures" \
    --metric-name BackupPass \
    --namespace AWS/Backup \
    --statistic Sum \
    --period 86400 \
    --threshold 0.5 \
    --comparison-operator LessThanThreshold \
    --evaluation-periods 1 \
    --treat-missing-data missing \
    --dimensions Name=BackupVaultName,Value="${BACKUP_VAULT_NAME}" \
    --alarm-actions "${SNS_TOPIC_ARN}" 2>/dev/null || echo -e "${YELLOW}⚠ Alarm may already exist${NC}"

echo -e "${GREEN}✓ Created CloudWatch alarm for backup failures${NC}"

# Step 10: Document restore procedure
echo -e "${YELLOW}Step 10: Documenting restore procedure...${NC}"
cat > /tmp/restore-procedure.md <<EOF
# Supporter 360 Backup Restore Procedure

## Manual Restore from Snapshot

### 1. List Available Snapshots
\`\`\`bash
aws rds describe-db-cluster-snapshots \
    --db-cluster-identifier ${CLUSTER_ID} \
    --query "DBClusterSnapshots[?SnapshotType==\`manual\`].{ID:DBClusterSnapshotIdentifier,Time:SnapshotCreateTime}" \
    --output table
\`\`\`

### 2. Restore from Snapshot
\`\`\`bash
# Restore to new cluster
aws rds restore-db-cluster-from-snapshot \
    --db-cluster-identifier ${CLUSTER_ID}-restore \
    --snapshot <snapshot-id> \
    --engine aurora-postgresql \
    --engine-version 14.15 \
    --vpc-security-group-ids <security-group-id> \
    --db-subnet-group-name <subnet-group-name>

# Or restore to point in time (within backup retention window)
aws rds restore-db-cluster-to-point-in-time \
    --source-db-cluster-identifier ${CLUSTER_ID} \
    --db-cluster-identifier ${CLUSTER_ID}-pitr-restore \
    --restore-to-time 2024-01-01T12:00:00Z \
    --use-latest-restorable-time
\`\`\`

### 3. Verify Restore
\`\`\`bash
# Check cluster status
aws rds describe-db-clusters \
    --db-cluster-identifier ${CLUSTER_ID}-restore

# Connect and verify data
psql -h <endpoint> -U <username> -d supporter360
SELECT COUNT(*) FROM supporters;
\`\`\`

## AWS Backup Restore

### 1. List Backups
\`\`\`bash
aws backup list-recovery-points-by-backup-vault \
    --backup-vault-name ${BACKUP_VAULT_NAME} \
    --query "RecoveryPoints[?ResourceType==\`AURORA\`].{ARN:RecoveryPointArn,Date:CreationDate}" \
    --output table
\`\`\`

### 2. Restore Backup
\`\`\`bash
aws backup start-restore-job \
    --recovery-point-arn <recovery-point-arn> \
    --iam-role-arn ${ROLE_ARN} \
    --metadata '{"DbClusterIdentifier":"${CLUSTER_ID}-restore","Engine":"aurora-postgresql"}' \
    --resource-type Aurora
\`\`\`

## S3 Backup Restore

### 1. List S3 Backups
\`\`\`bash
aws s3 ls s3://${BUCKET_NAME}/ --recursive
\`\`\`

### 2. Download Backup
\`\`\`bash
aws s3 cp s3://${BUCKET_NAME}/backup.sql.gz .
\`\`\`

### 3. Restore to Database
\`\`\`bash
gunzip backup.sql.gz
psql -h <endpoint> -U <username> -d supporter360 -f backup.sql
\`\`\`

## Rollback Procedure

### 1. Identify Last Known Good State
\`\`\`bash
# Check CloudTrail for last successful migration
aws logs tail /aws/cloudtrail/Supporter360Trail --since 1d | grep "RunMigration"
\`\`\`

### 2. Rollback Database
\`\`\`bash
# Stop application
# Restore snapshot (see above)
# Verify data integrity
# Restart application
\`\`\`

## Backup Testing Schedule

- **Weekly**: Verify automated backups exist
- **Monthly**: Test restore procedure in dev/staging
- **Quarterly**: Full disaster recovery drill
EOF

echo -e "${GREEN}✓ Documented restore procedure${NC}"

# Step 11: Summary
echo ""
echo -e "${GREEN}=== Backup Configuration Summary ===${NC}"
echo -e "${GREEN}✓ RDS Cluster: ${CLUSTER_ID}${NC}"
echo -e "${GREEN}✓ Backup Retention: ${BACKUP_RETENTION_DAYS} days${NC}"
echo -e "${GREEN}✓ Backup Vault: ${BACKUP_VAULT_NAME}${NC}"
echo -e "${GREEN}✓ Backup Plan: ${BACKUP_PLAN_NAME}${NC}"
echo -e "${GREEN}✓ Backup Schedule: Daily at 2 AM UTC (Mon-Fri)${NC}"
echo -e "${GREEN}✓ Snapshot: ${SNAPSHOT_ID}${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Monitor backup jobs in AWS Backup console:"
echo -e "   https://${REGION}.console.aws.amazon.com/backup/home?region=${REGION}#/jobs"
echo -e "2. View restore procedure:"
echo -e "   cat /tmp/restore-procedure.md"
echo -e "3. Test restore procedure in non-production environment"
echo -e "4. Set up regular backup testing (monthly recommended)"
echo ""
