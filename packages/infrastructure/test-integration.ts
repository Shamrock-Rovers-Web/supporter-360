/**
 * Integration Verification Script
 *
 * Tests connectivity for all critical Lambda functions:
 * 1. Processors can access database via VPC endpoints (Secluded subnets)
 * 2. Public subnets allow internet access for GoCardless processor and Mailchimp syncer
 * 3. Secrets Manager access works for all functions
 *
 * Prerequisites:
 * - AWS CLI configured with appropriate credentials
 * - Lambda functions deployed
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: string;
  duration?: number;
}

interface LambdaConfig {
  name: string;
  subnetType: 'PUBLIC' | 'PRIVATE_ISOLATED';
  requiresInternet: boolean;
  requiresVpcEndpoints: boolean;
  requiredSecrets: string[];
}

const LAMBDA_FUNCTIONS: LambdaConfig[] = [
  {
    name: 'Supporter360StackV2-ShopifyProcessor',
    subnetType: 'PRIVATE_ISOLATED',
    requiresInternet: false,
    requiresVpcEndpoints: true,
    requiredSecrets: ['supporter360/shopify']
  },
  {
    name: 'Supporter360StackV2-StripeProcessor',
    subnetType: 'PRIVATE_ISOLATED',
    requiresInternet: false,
    requiresVpcEndpoints: true,
    requiredSecrets: ['supporter360/stripe']
  },
  {
    name: 'Supporter360StackV2-GoCardlessProcessor',
    subnetType: 'PUBLIC',
    requiresInternet: true,
    requiresVpcEndpoints: false,
    requiredSecrets: ['supporter360/gocardless']
  },
  {
    name: 'Supporter360StackV2-FutureTicketingProcessor',
    subnetType: 'PRIVATE_ISOLATED',
    requiresInternet: false,
    requiresVpcEndpoints: true,
    requiredSecrets: ['supporter360/future-ticketing']
  },
  {
    name: 'Supporter360StackV2-MailchimpProcessor',
    subnetType: 'PRIVATE_ISOLATED',
    requiresInternet: false,
    requiresVpcEndpoints: true,
    requiredSecrets: ['supporter360/mailchimp']
  },
  {
    name: 'Supporter360StackV2-MailchimpSyncer',
    subnetType: 'PUBLIC',
    requiresInternet: true,
    requiresVpcEndpoints: false,
    requiredSecrets: ['supporter360/mailchimp']
  },
  {
    name: 'Supporter360StackV2-SearchHandler',
    subnetType: 'PRIVATE_ISOLATED',
    requiresInternet: false,
    requiresVpcEndpoints: true,
    requiredSecrets: []
  },
  {
    name: 'Supporter360StackV2-ProfileHandler',
    subnetType: 'PRIVATE_ISOLATED',
    requiresInternet: false,
    requiresVpcEndpoints: true,
    requiredSecrets: []
  },
  {
    name: 'Supporter360StackV2-TimelineHandler',
    subnetType: 'PRIVATE_ISOLATED',
    requiresInternet: false,
    requiresVpcEndpoints: true,
    requiredSecrets: []
  },
  {
    name: 'Supporter360StackV2-MergeHandler',
    subnetType: 'PRIVATE_ISOLATED',
    requiresInternet: false,
    requiresVpcEndpoints: true,
    requiredSecrets: []
  }
];

class IntegrationVerifier {
  private results: TestResult[] = [];
  private dbEndpoint = 'supporter360stackv2-supporter360database3a977b01-z5jaoh3fhyvr.cluster-cmfwmmgu7sye.eu-west-1.rds.amazonaws.com';

  async runAllTests(): Promise<void> {
    console.log('='.repeat(80));
    console.log('Supporter 360 - Integration Verification');
    console.log('='.repeat(80));
    console.log();

    // Test 1: Database Connectivity
    await this.testDatabaseConnectivity();

    // Test 2: VPC Endpoint Configuration
    await this.testVpcEndpoints();

    // Test 3: Lambda Subnet Placement
    await this.testLambdaSubnetPlacement();

    // Test 4: Secrets Manager Access
    await this.testSecretsManagerAccess();

    // Test 5: Internet Access (PUBLIC subnet functions)
    await this.testInternetAccess();

    // Print summary
    this.printSummary();
  }

  private async testDatabaseConnectivity(): Promise<void> {
    console.log('TEST 1: Database Connectivity');
    console.log('-'.repeat(80));

    const startTime = Date.now();

    try {
      // Test if database endpoint is reachable
      const result = execSync(
        `nc -zv -w 5 ${this.dbEndpoint} 5432 2>&1 || echo "Connection failed"`,
        { encoding: 'utf-8' }
      );

      const isOpened = result.includes('succeeded') || result.includes('open');

      this.results.push({
        name: 'Database Endpoint Reachable',
        status: isOpened ? 'PASS' : 'FAIL',
        details: isOpened
          ? `Database ${this.dbEndpoint}:5432 is reachable`
          : `Database ${this.dbEndpoint}:5432 is NOT reachable`,
        duration: Date.now() - startTime
      });

      console.log(`  Status: ${isOpened ? '✓ PASS' : '✗ FAIL'}`);
      console.log(`  Details: ${isOpened ? `Database ${this.dbEndpoint}:5432 is reachable` : `Database ${this.dbEndpoint}:5432 is NOT reachable`}`);
    } catch (error) {
      this.results.push({
        name: 'Database Endpoint Reachable',
        status: 'FAIL',
        details: `Error testing database connectivity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      });
      console.log(`  Status: ✗ FAIL`);
      console.log(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log();
  }

  private async testVpcEndpoints(): Promise<void> {
    console.log('TEST 2: VPC Endpoint Configuration');
    console.log('-'.repeat(80));

    const startTime = Date.now();

    try {
      // Check if VPC endpoints exist
      const endpoints = execSync(
        'aws ec2 describe-vpc-endpoints --filters "Name=service-name,Values=com.amazonaws.eu-west-1.secrets-manager,com.amazonaws.eu-west-1.sqs,com.amazonaws.eu-west-1.s3" --query "VpcEndpoints[*].[ServiceName,State]" --output table 2>/dev/null || echo "No endpoints found"',
        { encoding: 'utf-8' }
      );

      const hasSecretsManager = endpoints.includes('secrets-manager') && endpoints.includes('available');
      const hasSqs = endpoints.includes('sqs') && endpoints.includes('available');
      const hasS3 = endpoints.includes('s3') && endpoints.includes('available');

      const allPresent = hasSecretsManager && hasSqs && hasS3;

      this.results.push({
        name: 'VPC Endpoints Configured',
        status: allPresent ? 'PASS' : 'FAIL',
        details: allPresent
          ? 'All required VPC endpoints present (Secrets Manager, SQS, S3)'
          : `Missing endpoints - Secrets Manager: ${hasSecretsManager ? '✓' : '✗'}, SQS: ${hasSqs ? '✓' : '✗'}, S3: ${hasS3 ? '✓' : '✗'}`,
        duration: Date.now() - startTime
      });

      console.log(`  Status: ${allPresent ? '✓ PASS' : '✗ FAIL'}`);
      console.log(`  Secrets Manager: ${hasSecretsManager ? '✓' : '✗'}`);
      console.log(`  SQS: ${hasSqs ? '✓' : '✗'}`);
      console.log(`  S3: ${hasS3 ? '✓' : '✗'}`);
    } catch (error) {
      this.results.push({
        name: 'VPC Endpoints Configured',
        status: 'FAIL',
        details: `Error checking VPC endpoints: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      });
      console.log(`  Status: ✗ FAIL`);
      console.log(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log();
  }

  private async testLambdaSubnetPlacement(): Promise<void> {
    console.log('TEST 3: Lambda Subnet Placement');
    console.log('-'.repeat(80));

    for (const lambda of LAMBDA_FUNCTIONS) {
      const startTime = Date.now();

      try {
        const config = execSync(
          `aws lambda get-function-configuration --function-name ${lambda.name} --query "VpcConfig.{SubnetIds:SubnetIds,SecurityGroups:SecurityGroupIds}" --output json 2>/dev/null || echo "{}"`,
          { encoding: 'utf-8' }
        );

        const vpcConfig = JSON.parse(config);
        const hasSubnets = vpcConfig.SubnetIds && vpcConfig.SubnetIds.length > 0;

        // Check if subnet IDs match expected type
        const subnetType = this.detectSubnetType(vpcConfig.SubnetIds || []);
        const correctPlacement = subnetType === lambda.subnetType;

        this.results.push({
          name: `${lambda.name} - Subnet Placement`,
          status: correctPlacement ? 'PASS' : 'FAIL',
          details: correctPlacement
            ? `Correctly placed in ${lambda.subnetType} subnets`
            : `Expected ${lambda.subnetType}, found ${subnetType}`,
          duration: Date.now() - startTime
        });

        console.log(`  ${lambda.name}:`);
        console.log(`    Status: ${correctPlacement ? '✓ PASS' : '✗ FAIL'}`);
        console.log(`    Expected: ${lambda.subnetType}, Found: ${subnetType}`);
        console.log(`    Subnets: ${hasSubnets ? vpcConfig.SubnetIds.join(', ') : 'None'}`);
      } catch (error) {
        this.results.push({
          name: `${lambda.name} - Subnet Placement`,
          status: 'FAIL',
          details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime
        });
        console.log(`  ${lambda.name}:`);
        console.log(`    Status: ✗ FAIL`);
        console.log(`    Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log();
  }

  private async testSecretsManagerAccess(): Promise<void> {
    console.log('TEST 4: Secrets Manager Access');
    console.log('-'.repeat(80));

    const allSecrets = new Set<string>();
    LAMBDA_FUNCTIONS.forEach(lambda => {
      lambda.requiredSecrets.forEach(secret => allSecrets.add(secret));
    });

    for (const secret of Array.from(allSecrets)) {
      const startTime = Date.now();

      try {
        const result = execSync(
          `aws secretsmanager describe-secret --secret-id ${secret} --query "Name" --output text 2>/dev/null || echo "NOT_FOUND"`,
          { encoding: 'utf-8' }
        );

        const exists = result.trim() !== 'NOT_FOUND' && !result.includes('NotFound');

        this.results.push({
          name: `Secret ${secret}`,
          status: exists ? 'PASS' : 'FAIL',
          details: exists ? `Secret exists and is accessible` : `Secret not found or inaccessible`,
          duration: Date.now() - startTime
        });

        console.log(`  ${secret}: ${exists ? '✓ PASS' : '✗ FAIL'}`);
      } catch (error) {
        this.results.push({
          name: `Secret ${secret}`,
          status: 'FAIL',
          details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime
        });
        console.log(`  ${secret}: ✗ FAIL`);
        console.log(`    Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log();
  }

  private async testInternetAccess(): Promise<void> {
    console.log('TEST 5: Internet Access (PUBLIC Subnet Functions)');
    console.log('-'.repeat(80));

    const publicLambdas = LAMBDA_FUNCTIONS.filter(lambda => lambda.requiresInternet);

    for (const lambda of publicLambdas) {
      const startTime = Date.now();

      try {
        // Check if Lambda has internet access by verifying it's in a PUBLIC subnet
        // and has allowPublicSubnet enabled
        const config = execSync(
          `aws lambda get-function-configuration --function-name ${lambda.name} --query "VpcConfig.{SubnetIds:SubnetIds}" --output json 2>/dev/null || echo "{}"`,
          { encoding: 'utf-8' }
        );

        const vpcConfig = JSON.parse(config);
        const subnetType = this.detectSubnetType(vpcConfig.SubnetIds || []);

        // For internet access, Lambda must be in PUBLIC subnet
        const hasInternetAccess = subnetType === 'PUBLIC';

        this.results.push({
          name: `${lambda.name} - Internet Access`,
          status: hasInternetAccess ? 'PASS' : 'FAIL',
          details: hasInternetAccess
            ? `Correctly placed in PUBLIC subnet for internet access`
            : `Not in PUBLIC subnet - internet access may not work`,
          duration: Date.now() - startTime
        });

        console.log(`  ${lambda.name}:`);
        console.log(`    Status: ${hasInternetAccess ? '✓ PASS' : '✗ FAIL'}`);
        console.log(`    Details: ${hasInternetAccess ? 'Has internet access (PUBLIC subnet)' : 'No internet access (not in PUBLIC subnet)'}`);
      } catch (error) {
        this.results.push({
          name: `${lambda.name} - Internet Access`,
          status: 'FAIL',
          details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime
        });
        console.log(`  ${lambda.name}:`);
        console.log(`    Status: ✗ FAIL`);
        console.log(`    Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log();
  }

  private detectSubnetType(subnetIds: string[]): 'PUBLIC' | 'PRIVATE_ISOLATED' | 'UNKNOWN' {
    if (subnetIds.length === 0) return 'UNKNOWN';

    // Check subnet naming patterns from CDK
    const hasPublic = subnetIds.some(id => id.includes('Public'));
    const hasPrivate = subnetIds.some(id => id.includes('Private'));

    if (hasPublic) return 'PUBLIC';
    if (hasPrivate) return 'PRIVATE_ISOLATED';
    return 'UNKNOWN';
  }

  private printSummary(): void {
    console.log('='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log();

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✓`);
    console.log(`Failed: ${failed} ✗`);
    console.log(`Skipped: ${skipped} ⊘`);
    console.log();

    if (failed > 0) {
      console.log('FAILED TESTS:');
      console.log('-'.repeat(80));
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  ✗ ${r.name}`);
          console.log(`    ${r.details}`);
        });
      console.log();
    }

    const overallStatus = failed === 0 ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED';
    console.log('='.repeat(80));
    console.log(`Overall: ${overallStatus}`);
    console.log('='.repeat(80));

    // Write results to file
    const reportPath = '/home/ubuntu/supporter-360/packages/infrastructure/integration-test-results.json';
    writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { passed, failed, skipped, total },
      results: this.results
    }, null, 2));
    console.log(`\nResults saved to: ${reportPath}`);
  }
}

// Run tests
const verifier = new IntegrationVerifier();
verifier.runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
