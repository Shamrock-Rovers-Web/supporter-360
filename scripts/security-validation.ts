#!/usr/bin/env ts-node
/**
 * Security Validation Script for Supporter 360
 *
 * This script validates that all security measures are properly implemented
 * before deployment. Run this after building the backend and before
 * deploying to production.
 *
 * Usage:
 *   npm run validate-security
 *   or
 *   ts-node scripts/security-validation.ts
 *
 * @packageDocumentation
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// ============================================================================
// Validation Results
// ============================================================================

interface ValidationResult {
  category: string;
  check: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
}

const results: ValidationResult[] = [];

function addResult(
  category: string,
  check: string,
  status: 'pass' | 'warn' | 'fail',
  message: string,
  details?: string
) {
  results.push({ category, check, status, message, details });
  const icon = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
  console.log(`${icon} [${category}] ${check}: ${message}`);
  if (details) {
    console.log(`   Details: ${details}`);
  }
}

// ============================================================================
// File Reading Utilities
// ============================================================================

function readFile(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

// ============================================================================
// 1. SSL/TLS Configuration Validation
// ============================================================================

function validateSSLConfiguration() {
  console.log('\n🔒 Validating SSL/TLS Configuration...\n');

  const connectionFile = readFile('packages/backend/src/db/connection.ts');
  if (!connectionFile) {
    addResult('SSL', 'Connection file exists', 'fail', 'connection.ts not found');
    return;
  }

  addResult('SSL', 'Connection file exists', 'pass', 'connection.ts found');

  // Check for RDS CA certificate loading
  if (connectionFile.includes('getRDSCACertificate()')) {
    addResult('SSL', 'RDS CA certificate loading', 'pass', 'RDS CA certificate loading implemented');
  } else {
    addResult('SSL', 'RDS CA certificate loading', 'fail', 'RDS CA certificate loading not found');
  }

  // Check for rejectUnauthorized in production
  if (connectionFile.includes('rejectUnauthorized: true') &&
      connectionFile.includes('NODE_ENV === \'production\'')) {
    addResult('SSL', 'Certificate verification in production', 'pass', 'rejectUnauthorized: true in production');
  } else {
    addResult('SSL', 'Certificate verification in production', 'fail', 'rejectUnauthorized not properly configured');
  }

  // Check for DB_SSL_SKIP_VERIFY warning
  if (connectionFile.includes('DB_SSL_SKIP_VERIFY') &&
      connectionFile.includes('WARNING: SSL certificate verification is DISABLED')) {
    addResult('SSL', 'SSL skip verification warning', 'pass', 'Warning message implemented');
  } else {
    addResult('SSL', 'SSL skip verification warning', 'warn', 'Warning message could be improved');
  }

  // Check if RDS CA bundle file exists
  if (fileExists('packages/backend/certs/rds-ca-bundle.pem')) {
    addResult('SSL', 'RDS CA bundle file', 'pass', 'rds-ca-bundle.pem exists');
  } else {
    addResult('SSL', 'RDS CA bundle file', 'fail', 'rds-ca-bundle.pem not found in packages/backend/certs/');
  }
}

// ============================================================================
// 2. CORS Configuration Validation
// ============================================================================

function validateCORSConfiguration() {
  console.log('\n🌐 Validating CORS Configuration...\n');

  const cdkStackFile = readFile('packages/infrastructure/lib/supporter360-stack.ts');
  if (!cdkStackFile) {
    addResult('CORS', 'CDK stack file', 'fail', 'supporter360-stack.ts not found');
    return;
  }

  // Check for specific origins (not ALL_ORIGINS)
  if (cdkStackFile.includes('allowOrigins: [')) {
    addResult('CORS', 'Specific origins configured', 'pass', 'Using specific allowOrigins list');
  } else if (cdkStackFile.includes('ALLOW_ALL_ORIGINS') || cdkStackFile.includes('apigateway.Cors.ALL_ORIGINS')) {
    addResult('CORS', 'Specific origins configured', 'fail', 'Using ALL_ORIGINS - security risk!');
  } else {
    addResult('CORS', 'Specific origins configured', 'warn', 'Could not verify CORS configuration');
  }

  // Check for production domain
  if (cdkStackFile.includes('shamrockrovers.ie')) {
    addResult('CORS', 'Production domain restricted', 'pass', 'Restricted to shamrockrovers.ie');
  } else {
    addResult('CORS', 'Production domain restricted', 'warn', 'Production domain not explicitly configured');
  }

  // Check for localhost in CORS (acceptable for development)
  if (cdkStackFile.includes('localhost')) {
    addResult('CORS', 'Development origins', 'pass', 'Localhost configured for development');
  }
}

// ============================================================================
// 3. Webhook Signature Verification Validation
// ============================================================================

function validateWebhookSecurity() {
  console.log('\n🔐 Validating Webhook Security...\n');

  const webhookFile = readFile('packages/backend/src/utils/webhook-verification.ts');
  if (!webhookFile) {
    addResult('Webhooks', 'Verification file exists', 'fail', 'webhook-verification.ts not found');
    return;
  }

  // Check for timing-safe comparisons (prevents timing attacks)
  if (webhookFile.includes('timingSafeEqual')) {
    addResult('Webhooks', 'Timing-safe comparisons', 'pass', 'Using timingSafeEqual for all webhooks');
  } else {
    addResult('Webhooks', 'Timing-safe comparisons', 'fail', 'Not using timing-safe comparisons');
  }

  // Check for Stripe timestamp verification (replay attack protection)
  if (webhookFile.includes('timestamp') &&
      webhookFile.includes('tolerance') &&
      webhookFile.includes('180')) {
    addResult('Webhooks', 'Stripe replay protection', 'pass', 'Stripe timestamp verification with 3min tolerance');
  } else {
    addResult('Webhooks', 'Stripe replay protection', 'fail', 'Missing Stripe replay attack protection');
  }

  // Check for all integrations
  const integrations = ['Shopify', 'Stripe', 'GoCardless', 'Mailchimp'];
  integrations.forEach(integration => {
    if (webhookFile.includes(`verify${integration}Webhook`)) {
      addResult('Webhooks', `${integration} verification`, 'pass', `${integration} webhook signature verification implemented`);
    } else {
      addResult('Webhooks', `${integration} verification`, 'fail', `${integration} webhook verification missing`);
    }
  });
}

// ============================================================================
// 4. Rate Limiting Validation
// ============================================================================

function validateRateLimiting() {
  console.log('\n⏱️  Validating Rate Limiting...\n');

  const rateLimiterFile = readFile('packages/backend/src/middleware/rate-limiter.ts');
  if (!rateLimiterFile) {
    addResult('Rate Limiting', 'Rate limiter file exists', 'fail', 'rate-limiter.ts not found');
    return;
  }

  // Check for token bucket algorithm
  if (rateLimiterFile.includes('token') && rateLimiterFile.includes('bucket')) {
    addResult('Rate Limiting', 'Token bucket algorithm', 'pass', 'Using token bucket rate limiting');
  } else {
    addResult('Rate Limiting', 'Token bucket algorithm', 'fail', 'Token bucket algorithm not implemented');
  }

  // Check for PostgreSQL persistence
  if (rateLimiterFile.includes('rate_limits') && rateLimiterFile.includes('CREATE TABLE')) {
    addResult('Rate Limiting', 'PostgreSQL persistence', 'pass', 'Rate limit state persisted to PostgreSQL');
  } else {
    addResult('Rate Limiting', 'PostgreSQL persistence', 'fail', 'Missing PostgreSQL persistence');
  }

  // Check for rate limit headers
  if (rateLimiterFile.includes('X-RateLimit-Limit') &&
      rateLimiterFile.includes('X-RateLimit-Remaining') &&
      rateLimiterFile.includes('X-RateLimit-Reset')) {
    addResult('Rate Limiting', 'Rate limit headers', 'pass', 'All required headers implemented');
  } else {
    addResult('Rate Limiting', 'Rate limit headers', 'fail', 'Missing rate limit headers');
  }

  // Check for 429 responses
  if (rateLimiterFile.includes('429') || rateLimiterFile.includes('RATE_LIMIT_EXCEEDED')) {
    addResult('Rate Limiting', '429 responses', 'pass', 'Returns 429 when rate limit exceeded');
  } else {
    addResult('Rate Limiting', '429 responses', 'fail', 'Missing 429 response handling');
  }

  // Check CDK for API Gateway rate limiting
  const cdkStackFile = readFile('packages/infrastructure/lib/supporter360-stack.ts');
  if (cdkStackFile && cdkStackFile.includes('throttlingBurstLimit') && cdkStackFile.includes('throttlingRateLimit')) {
    addResult('Rate Limiting', 'API Gateway throttling', 'pass', 'API Gateway rate limiting configured in CDK');
  } else {
    addResult('Rate Limiting', 'API Gateway throttling', 'warn', 'API Gateway throttling may not be configured');
  }
}

// ============================================================================
// 5. GDPR Compliance Validation
// ============================================================================

function validateGDPRCompliance() {
  console.log('\n🇪🇺 Validating GDPR Compliance...\n');

  const gdprFile = readFile('packages/backend/src/handlers/api/admin/gdpr.handler.ts');
  if (!gdprFile) {
    addResult('GDPR', 'GDPR handler file exists', 'fail', 'gdpr.handler.ts not found');
    return;
  }

  // Check for data portability endpoint
  if (gdprFile.includes('getPersonalData') || gdprFile.includes('personal-data')) {
    addResult('GDPR', 'Data portability endpoint', 'pass', 'GET /api/admin/gdpr/personal-data/:id implemented');
  } else {
    addResult('GDPR', 'Data portability endpoint', 'fail', 'Data portability endpoint missing');
  }

  // Check for right to be forgotten endpoint
  if (gdprFile.includes('anonymizeSupporterData') || gdprFile.includes('deletePersonalDataHandler')) {
    addResult('GDPR', 'Right to be forgotten endpoint', 'pass', 'DELETE /api/admin/gdpr/:id implemented');
  } else {
    addResult('GDPR', 'Right to be forgotten endpoint', 'fail', 'Right to be forgotten endpoint missing');
  }

  // Check for consent management
  if (gdprFile.includes('recordConsent') && gdprFile.includes('getConsentHistory')) {
    addResult('GDPR', 'Consent management', 'pass', 'Consent tracking and history endpoints implemented');
  } else {
    addResult('GDPR', 'Consent management', 'fail', 'Consent management endpoints missing');
  }

  // Check for deletion requests listing
  if (gdprFile.includes('listDeletionRequests')) {
    addResult('GDPR', 'Deletion requests listing', 'pass', 'Deletion request tracking implemented');
  } else {
    addResult('GDPR', 'Deletion requests listing', 'fail', 'Deletion request tracking missing');
  }

  // Check for auth middleware usage
  if (gdprFile.includes('requireAuth') && gdprFile.includes('admin')) {
    addResult('GDPR', 'Admin-only access', 'pass', 'GDPR endpoints require admin authentication');
  } else {
    addResult('GDPR', 'Admin-only access', 'fail', 'GDPR endpoints not properly protected');
  }

  // Check for transaction usage
  if (gdprFile.includes('BEGIN') && gdprFile.includes('COMMIT') && gdprFile.includes('ROLLBACK')) {
    addResult('GDPR', 'Transaction safety', 'pass', 'GDPR operations use database transactions');
  } else {
    addResult('GDPR', 'Transaction safety', 'warn', 'GDPR operations may not use transactions');
  }
}

// ============================================================================
// 6. Authentication & Authorization Validation
// ============================================================================

function validateAuthentication() {
  console.log('\n🔑 Validating Authentication...\n');

  const authFile = readFile('packages/backend/src/middleware/auth.ts');
  if (!authFile) {
    addResult('Auth', 'Auth middleware file exists', 'fail', 'auth.ts not found');
    return;
  }

  // Check for API key validation
  if (authFile.includes('validateApiKey')) {
    addResult('Auth', 'API key validation', 'pass', 'API key validation implemented');
  } else {
    addResult('Auth', 'API key validation', 'fail', 'API key validation missing');
  }

  // Check for role-based access control
  if (authFile.includes('ApiRole') && authFile.includes('admin') && authFile.includes('staff')) {
    addResult('Auth', 'Role-based access control', 'pass', 'Admin/staff roles implemented');
  } else {
    addResult('Auth', 'Role-based access control', 'fail', 'Role-based access control missing');
  }

  // Check for Lambda authorizer support
  if (authFile.includes('getAuthorizerContext')) {
    addResult('Auth', 'Lambda authorizer support', 'pass', 'Supports API Gateway Lambda authorizer');
  } else {
    addResult('Auth', 'Lambda authorizer support', 'warn', 'Lambda authorizer support may be missing');
  }

  // Check for requireAuth wrapper
  if (authFile.includes('requireAuth')) {
    addResult('Auth', 'requireAuth wrapper', 'pass', 'requireAuth middleware wrapper available');
  } else {
    addResult('Auth', 'requireAuth wrapper', 'fail', 'requireAuth wrapper missing');
  }

  // Check for endpoint protection rules
  if (authFile.includes('ADMIN_ENDPOINTS') && authFile.includes('STAFF_ONLY_ENDPOINTS')) {
    addResult('Auth', 'Endpoint protection rules', 'pass', 'Admin and staff endpoint rules defined');
  } else {
    addResult('Auth', 'Endpoint protection rules', 'warn', 'Endpoint protection rules may be incomplete');
  }
}

// ============================================================================
// 7. Secrets Management Validation
// ============================================================================

function validateSecretsManagement() {
  console.log('\n🤫 Validating Secrets Management...\n');

  const cdkStackFile = readFile('packages/infrastructure/lib/supporter360-stack.ts');
  if (!cdkStackFile) {
    addResult('Secrets', 'CDK stack file', 'fail', 'supporter360-stack.ts not found');
    return;
  }

  // Check for Secrets Manager usage
  if (cdkStackFile.includes('secretsmanager.Secret.fromSecretNameV2')) {
    addResult('Secrets', 'AWS Secrets Manager integration', 'pass', 'Using AWS Secrets Manager');
  } else {
    addResult('Secrets', 'AWS Secrets Manager integration', 'fail', 'Not using AWS Secrets Manager');
  }

  // Check for secret references
  const secrets = ['shopify', 'stripe', 'gocardless', 'mailchimp', 'future-ticketing'];
  secrets.forEach(secret => {
    if (cdkStackFile.includes(`supporter360/${secret}`)) {
      addResult('Secrets', `${secret} secret`, 'pass', `${secret} credentials in Secrets Manager`);
    } else {
      addResult('Secrets', `${secret} secret`, 'warn', `${secret} secret reference not found`);
    }
  });

  // Check for hardcoded secrets (this is a basic check)
  const backendFiles = execSync('find packages/backend/src -name "*.ts" -not -path "*/node_modules/*"', { encoding: 'utf-8' });
  const files = backendFiles.split('\n').filter(f => f);

  let hasHardcodedSecrets = false;
  for (const file of files) {
    const content = readFile(file);
    if (content && (content.match(/sk_[a-zA-Z0-9]{20,}/) || content.match(/api_key\s*=\s*['"][^'"]+/))) {
      hasHardcodedSecrets = true;
      addResult('Secrets', `Hardcoded secrets in ${file}`, 'fail', 'Possible hardcoded secret detected');
    }
  }

  if (!hasHardcodedSecrets) {
    addResult('Secrets', 'Hardcoded secrets check', 'pass', 'No hardcoded secrets detected');
  }

  // Check for .env files in git (they should be in .gitignore)
  const gitignore = readFile('.gitignore');
  if (gitignore && gitignore.includes('.env')) {
    addResult('Secrets', '.env in .gitignore', 'pass', '.env files excluded from git');
  } else {
    addResult('Secrets', '.env in .gitignore', 'warn', '.env files may not be in .gitignore');
  }
}

// ============================================================================
// 8. Resource Tagging Validation
// ============================================================================

function validateResourceTagging() {
  console.log('\n🏷️  Validating Resource Tagging...\n');

  const cdkStackFile = readFile('packages/infrastructure/lib/supporter360-stack.ts');
  if (!cdkStackFile) {
    addResult('Tagging', 'CDK stack file', 'fail', 'supporter360-stack.ts not found');
    return;
  }

  // Check for stack-level tags
  if (cdkStackFile.includes('Tags.of()') || cdkStackFile.includes('cdk.Tags')) {
    addResult('Tagging', 'Stack-level tags', 'pass', 'Stack-level tags configured');
  } else {
    addResult('Tagging', 'Stack-level tags', 'warn', 'Stack-level tags may not be configured');
  }

  // Check for app: supporter360 tag
  if (cdkStackFile.includes('app:') && cdkStackFile.includes('supporter360')) {
    addResult('Tagging', 'App tag', 'pass', 'app: supporter360 tag found');
  } else {
    addResult('Tagging', 'App tag', 'warn', 'app: supporter360 tag may be missing');
  }

  // Check for owner tag
  if (cdkStackFile.includes('owner:') && cdkStackFile.includes('gleesonb@gmail.com')) {
    addResult('Tagging', 'Owner tag', 'pass', 'owner: gleesonb@gmail.com tag found');
  } else {
    addResult('Tagging', 'Owner tag', 'warn', 'owner: gleesonb@gmail.com tag may be missing');
  }
}

// ============================================================================
// 9. Infrastructure Security Validation
// ============================================================================

function validateInfrastructureSecurity() {
  console.log('\n🏗️  Validating Infrastructure Security...\n');

  const cdkStackFile = readFile('packages/infrastructure/lib/supporter360-stack.ts');
  if (!cdkStackFile) {
    addResult('Infrastructure', 'CDK stack file', 'fail', 'supporter360-stack.ts not found');
    return;
  }

  // Check for S3 block public access
  if (cdkStackFile.includes('BlockPublicAccess.BLOCK_ALL')) {
    addResult('Infrastructure', 'S3 block public access', 'pass', 'S3 buckets block public access');
  } else {
    addResult('Infrastructure', 'S3 block public access', 'warn', 'S3 buckets may not block public access');
  }

  // Check for S3 encryption
  if (cdkStackFile.includes('BucketEncryption')) {
    addResult('Infrastructure', 'S3 encryption', 'pass', 'S3 buckets have encryption enabled');
  } else {
    addResult('Infrastructure', 'S3 encryption', 'warn', 'S3 encryption may not be configured');
  }

  // Check for database in private subnets
  if (cdkStackFile.includes('PRIVATE_ISOLATED') && cdkStackFile.includes('Database')) {
    addResult('Infrastructure', 'Database in private subnets', 'pass', 'Database in isolated subnets');
  } else {
    addResult('Infrastructure', 'Database in private subnets', 'warn', 'Database subnet placement needs verification');
  }

  // Check for CloudWatch alarms
  if (cdkStackFile.includes('cloudwatch.Alarm')) {
    addResult('Infrastructure', 'CloudWatch alarms', 'pass', 'CloudWatch alarms configured');
  } else {
    addResult('Infrastructure', 'CloudWatch alarms', 'warn', 'CloudWatch alarms may be missing');
  }

  // Check for security groups
  if (cdkStackFile.includes('SecurityGroup')) {
    addResult('Infrastructure', 'Security groups', 'pass', 'Security groups configured');
  } else {
    addResult('Infrastructure', 'Security groups', 'fail', 'Security groups not configured');
  }
}

// ============================================================================
// 10. Summary Report
// ============================================================================

function printSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 SECURITY VALIDATION SUMMARY');
  console.log('='.repeat(70) + '\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const warnings = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;

  console.log(`Total Checks: ${total}`);
  console.log(`✅ Passed:    ${passed}`);
  console.log(`⚠️  Warnings:  ${warnings}`);
  console.log(`❌ Failed:    ${failed}`);
  console.log('');

  // Group by category
  const categories = [...new Set(results.map(r => r.category))];
  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    const categoryPassed = categoryResults.filter(r => r.status === 'pass').length;
    const categoryWarn = categoryResults.filter(r => r.status === 'warn').length;
    const categoryFailed = categoryResults.filter(r => r.status === 'fail').length;

    console.log(`${category}:`);
    console.log(`  ✅ ${categoryPassed} | ⚠️  ${categoryWarn} | ❌ ${categoryFailed}`);

    // Show failed items
    const failedItems = categoryResults.filter(r => r.status === 'fail');
    if (failedItems.length > 0) {
      failedItems.forEach(item => {
        console.log(`     ❌ ${item.check}`);
        if (item.details) {
          console.log(`        ${item.details}`);
        }
      });
    }
  });

  console.log('\n' + '='.repeat(70));

  // Exit code based on results
  if (failed > 0) {
    console.log('\n❌ SECURITY VALIDATION FAILED');
    console.log('Please fix the failed checks before deploying to production.\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('\n⚠️  SECURITY VALIDATION PASSED WITH WARNINGS');
    console.log('Review the warnings before deploying to production.\n');
    process.exit(0);
  } else {
    console.log('\n✅ SECURITY VALIDATION PASSED');
    console.log('All security checks passed. Safe to deploy!\n');
    process.exit(0);
  }
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🔒 SUPPORTER 360 SECURITY VALIDATION');
  console.log('='.repeat(70));

  try {
    validateSSLConfiguration();
    validateCORSConfiguration();
    validateWebhookSecurity();
    validateRateLimiting();
    validateGDPRCompliance();
    validateAuthentication();
    validateSecretsManagement();
    validateResourceTagging();
    validateInfrastructureSecurity();

    printSummary();
  } catch (error) {
    console.error('\n❌ Validation script error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as validateSecurity };
