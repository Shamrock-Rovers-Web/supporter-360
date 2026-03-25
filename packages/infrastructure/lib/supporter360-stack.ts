import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as waf from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import * as tags from 'aws-cdk-lib';

export class Supporter360Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      stackName: 'Supporter360StackV2',
      description: 'Supporter 360 V2 - Serverless architecture with public subnets for external API callers',
      ...props
    });

    // Apply stack-level tags that propagate to all resources
    tags.Tags.of(this).add('app', 'supporter360');
    tags.Tags.of(this).add('owner', 'gleesonb@gmail.com');
    tags.Tags.of(this).add('environment', 'production');
    tags.Tags.of(this).add('managed-by', 'cdk');

    const vpc = new ec2.Vpc(this, 'Supporter360Vpc', {
      maxAzs: 2,
      natGateways: 0, // Remove NAT Gateway for cost savings
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Isolated subnets with VPC endpoints
        },
      ],
    });

    // ========================================
    // VPC Endpoints (replace NAT Gateway)
    // ========================================
    // Interface endpoint for Secrets Manager
    const secretsManagerEndpoint = vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    // Interface endpoint for SQS
    const sqsEndpoint = vpc.addInterfaceEndpoint('SqsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SQS,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    // Gateway endpoint for S3 (no cost)
    vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }],
    });

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Supporter 360 database',
      allowAllOutbound: false,
    });

    // RDS Aurora Serverless v2 cluster for cost optimization
    // Using Serverless v2 with ACU (Aurora Capacity Unit) scaling for cost efficiency
    const database = new rds.DatabaseCluster(this, 'Supporter360Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_14_15,
      }),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      defaultDatabaseName: 'supporter360',
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      backup: {
        retention: cdk.Duration.days(7),
      },
      // Serverless v2 configuration with writer
      writer: rds.ClusterInstance.serverlessV2('Writer', {
        scaleWithWriter: true,
      }),
      // Serverless v2 capacity limits
      serverlessV2MinCapacity: 0.5,  // Minimum 0.5 ACU (~$25/month)
      serverlessV2MaxCapacity: 1,     // Maximum 1 ACU
    });

    const rawPayloadsBucket = new s3.Bucket(this, 'RawPayloadsBucket', {
      bucketName: `supporter360-raw-payloads-${cdk.Stack.of(this).account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'archive-to-glacier-deep-archive',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: cdk.Duration.days(30), // Faster archival (was 90)
            },
          ],
          expiration: cdk.Duration.days(90), // Shorter retention (was 365)
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ========================================
    // Shopify Queues
    // ========================================
    const shopifyDLQ = new sqs.Queue(this, 'ShopifyDLQ', {
      queueName: 'supporter360-shopify-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    const shopifyQueue = new sqs.Queue(this, 'ShopifyQueue', {
      queueName: 'supporter360-shopify-queue',
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: {
        queue: shopifyDLQ,
        maxReceiveCount: 3,
      },
    });

    // ========================================
    // Stripe Queues
    // ========================================
    const stripeDLQ = new sqs.Queue(this, 'StripeDLQ', {
      queueName: 'supporter360-stripe-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    const stripeQueue = new sqs.Queue(this, 'StripeQueue', {
      queueName: 'supporter360-stripe-queue',
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: {
        queue: stripeDLQ,
        maxReceiveCount: 3,
      },
    });

    // ========================================
    // GoCardless Queues
    // ========================================
    const gocardlessDLQ = new sqs.Queue(this, 'GoCardlessDLQ', {
      queueName: 'supporter360-gocardless-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    const gocardlessQueue = new sqs.Queue(this, 'GoCardlessQueue', {
      queueName: 'supporter360-gocardless-queue',
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: {
        queue: gocardlessDLQ,
        maxReceiveCount: 3,
      },
    });

    // ========================================
    // Future Ticketing Queues
    // ========================================
    const futureTicketingDLQ = new sqs.Queue(this, 'FutureTicketingDLQ', {
      queueName: 'supporter360-future-ticketing-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    const futureTicketingQueue = new sqs.Queue(this, 'FutureTicketingQueue', {
      queueName: 'supporter360-future-ticketing-queue',
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: {
        queue: futureTicketingDLQ,
        maxReceiveCount: 3,
      },
    });

    // ========================================
    // Mailchimp Queues
    // ========================================
    const mailchimpDLQ = new sqs.Queue(this, 'MailchimpDLQ', {
      queueName: 'supporter360-mailchimp-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    const mailchimpQueue = new sqs.Queue(this, 'MailchimpQueue', {
      queueName: 'supporter360-mailchimp-queue',
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: {
        queue: mailchimpDLQ,
        maxReceiveCount: 3,
      },
    });

    // ========================================
    // Security Groups
    // ========================================
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true, // Allow outbound HTTPS for VPC endpoints
    });

    // Grant Lambda security group access to VPC endpoints
    secretsManagerEndpoint.connections.allowDefaultPortFrom(lambdaSecurityGroup);
    sqsEndpoint.connections.allowDefaultPortFrom(lambdaSecurityGroup);

    dbSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda functions to access database'
    );

    // ========================================
    // Common Environment Variables
    // ========================================
    const commonEnvironment = {
      DB_HOST: database.clusterEndpoint.hostname,
      DB_PORT: database.clusterEndpoint.port.toString(),
      DB_NAME: 'supporter360',
      DB_USER: database.secret?.secretValueFromJson('username').unsafeUnwrap() || 'postgres',
      DB_PASSWORD: database.secret?.secretValueFromJson('password').unsafeUnwrap() || '',
      DB_SSL: 'true', // Enable SSL for RDS connections
      RAW_PAYLOADS_BUCKET: rawPayloadsBucket.bucketName,
    };

    // ========================================
    // AWS Secrets Manager - All Integration Credentials
    // ========================================
    // Reference existing secrets (created manually or via populate-secrets.sh)
    const futureTicketingSecret = secretsmanager.Secret.fromSecretNameV2(this, 'FutureTicketingSecret', 'supporter360/future-ticketing');
    const shopifySecret = secretsmanager.Secret.fromSecretNameV2(this, 'ShopifySecret', 'supporter360/shopify');
    const stripeSecret = secretsmanager.Secret.fromSecretNameV2(this, 'StripeSecret', 'supporter360/stripe');
    const gocardlessSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GoCardlessSecret', 'supporter360/gocardless');
    const mailchimpSecret = secretsmanager.Secret.fromSecretNameV2(this, 'MailchimpSecret', 'supporter360/mailchimp');

    // ========================================
    // External API Configuration
    // ========================================
    // Public URLs (not secrets)
    const futureTicketingApiUrl = 'https://external.futureticketing.ie';
    const shopifyShopDomain = 'shamrock-rovers-fc.myshopify.com';
    const shopifyClientId = cdk.SecretValue.secretsManager('supporter360/shopify', { jsonField: 'clientId' });
    const shopifyEventBusArn = `arn:aws:events:eu-west-1:${this.account}:event-bus/aws.partner/shopify.com/313809895425/supporter360`;
    const gocardlessApiUrl = 'https://api.gocardless.com';
    const gocardlessEnvironment = 'live';

    // ========================================
    // Webhook Handlers (PUBLIC subnets for internet ingress)
    // ========================================
    const shopifyWebhookHandler = new lambda.Function(this, 'ShopifyWebhookHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/webhooks/shopify-webhook.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(30),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC }, // Public subnets for webhook ingress
      allowPublicSubnet: true, // Allow Lambda in public subnet
      environment: {
        ...commonEnvironment,
        SHOPIFY_QUEUE_URL: shopifyQueue.queueUrl,
        SHOPIFY_WEBHOOK_SECRET: shopifySecret.secretValueFromJson('webhookSecret').unsafeUnwrap(),
      },
    });
    shopifySecret.grantRead(shopifyWebhookHandler);

    const stripeWebhookHandler = new lambda.Function(this, 'StripeWebhookHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/webhooks/stripe-webhook.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(30),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      allowPublicSubnet: true,
      environment: {
        ...commonEnvironment,
        STRIPE_QUEUE_URL: stripeQueue.queueUrl,
        STRIPE_WEBHOOK_SECRET: stripeSecret.secretValueFromJson('webhookSecret').unsafeUnwrap(),
      },
    });
    stripeSecret.grantRead(stripeWebhookHandler);

    const gocardlessWebhookHandler = new lambda.Function(this, 'GoCardlessWebhookHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/webhooks/gocardless-webhook.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(30),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      allowPublicSubnet: true,
      environment: {
        ...commonEnvironment,
        GOCARDLESS_QUEUE_URL: gocardlessQueue.queueUrl,
        GOCARDLESS_WEBHOOK_SECRET: gocardlessSecret.secretValueFromJson('webhookSecret').unsafeUnwrap(),
      },
    });
    gocardlessSecret.grantRead(gocardlessWebhookHandler);

    const mailchimpWebhookHandler = new lambda.Function(this, 'MailchimpWebhookHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/webhooks/mailchimp-webhook.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(30),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      allowPublicSubnet: true,
      environment: {
        ...commonEnvironment,
        MAILCHIMP_QUEUE_URL: mailchimpQueue.queueUrl,
        MAILCHIMP_WEBHOOK_SECRET: mailchimpSecret.secretValueFromJson('webhookSecret').unsafeUnwrap(),
      },
    });
    mailchimpSecret.grantRead(mailchimpWebhookHandler);

    // Grant queue and S3 permissions to webhook handlers
    shopifyQueue.grantSendMessages(shopifyWebhookHandler);
    stripeQueue.grantSendMessages(stripeWebhookHandler);
    gocardlessQueue.grantSendMessages(gocardlessWebhookHandler);
    mailchimpQueue.grantSendMessages(mailchimpWebhookHandler);
    rawPayloadsBucket.grantWrite(shopifyWebhookHandler);
    rawPayloadsBucket.grantWrite(stripeWebhookHandler);
    rawPayloadsBucket.grantWrite(gocardlessWebhookHandler);
    rawPayloadsBucket.grantWrite(mailchimpWebhookHandler);

    // ========================================
    // Queue Processors (PRIVATE_ISOLATED subnets with VPC endpoints)
    // ========================================
    const shopifyProcessor = new lambda.Function(this, 'ShopifyProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/processors/shopify-processor.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(300),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }, // Use VPC endpoints
      securityGroups: [lambdaSecurityGroup],
      environment: {
        ...commonEnvironment,
        SHOPIFY_SHOP_DOMAIN: shopifyShopDomain,
        SHOPIFY_CLIENT_ID: shopifyClientId.unsafeUnwrap(),
        SHOPIFY_CLIENT_SECRET: shopifySecret.secretValueFromJson('clientSecret').unsafeUnwrap(),
      },
    });
    shopifySecret.grantRead(shopifyProcessor);

    const stripeProcessor = new lambda.Function(this, 'StripeProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/processors/stripe-processor.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(300),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        ...commonEnvironment,
        STRIPE_SECRET_KEY: stripeSecret.secretValueFromJson('secretKey').unsafeUnwrap(),
      },
    });
    stripeSecret.grantRead(stripeProcessor);

    const gocardlessProcessor = new lambda.Function(this, 'GoCardlessProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/processors/gocardless-processor.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(300),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC }, // Public subnets for internet access to GoCardless API
      allowPublicSubnet: true, // Allow Lambda in public subnet
      securityGroups: [lambdaSecurityGroup],
      environment: {
        ...commonEnvironment,
        GOCARDLESS_ACCESS_TOKEN: gocardlessSecret.secretValueFromJson('accessToken').unsafeUnwrap(),
        GOCARDLESS_ENVIRONMENT: gocardlessEnvironment,
        GOCARDLESS_API_URL: gocardlessApiUrl,
      },
    });
    gocardlessSecret.grantRead(gocardlessProcessor);

    const futureTicketingProcessor = new lambda.Function(this, 'FutureTicketingProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/processors/futureticketing-processor.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(300),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        ...commonEnvironment,
        FUTURE_TICKETING_API_URL: futureTicketingApiUrl,
        FUTURE_TICKETING_API_KEY: futureTicketingSecret.secretValueFromJson('apiKey').unsafeUnwrap(),
        FUTURE_TICKETING_PRIVATE_KEY: futureTicketingSecret.secretValueFromJson('privateKey').unsafeUnwrap(),
      },
    });
    futureTicketingSecret.grantRead(futureTicketingProcessor);

    const mailchimpProcessor = new lambda.Function(this, 'MailchimpProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/processors/mailchimp-processor.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(300),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        ...commonEnvironment,
        MAILCHIMP_API_KEY: mailchimpSecret.secretValueFromJson('apiKey').unsafeUnwrap(),
      },
    });
    mailchimpSecret.grantRead(mailchimpProcessor);

    // Attach SQS event sources to processors
    shopifyProcessor.addEventSource(new lambdaEventSources.SqsEventSource(shopifyQueue, {
      batchSize: 10,
    }));

    stripeProcessor.addEventSource(new lambdaEventSources.SqsEventSource(stripeQueue, {
      batchSize: 10,
    }));

    gocardlessProcessor.addEventSource(new lambdaEventSources.SqsEventSource(gocardlessQueue, {
      batchSize: 10,
    }));

    futureTicketingProcessor.addEventSource(new lambdaEventSources.SqsEventSource(futureTicketingQueue, {
      batchSize: 10,
    }));

    mailchimpProcessor.addEventSource(new lambdaEventSources.SqsEventSource(mailchimpQueue, {
      batchSize: 10,
    }));

    // ========================================
    // API Handlers (PRIVATE_ISOLATED subnets with VPC endpoints)
    // ========================================
    const searchHandler = new lambda.Function(this, 'SearchHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/api/search.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(30),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      environment: commonEnvironment,
    });

    const profileHandler = new lambda.Function(this, 'ProfileHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/api/profile.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(30),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      environment: commonEnvironment,
    });

    const timelineHandler = new lambda.Function(this, 'TimelineHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/api/timeline.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(30),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      environment: commonEnvironment,
    });

    const mergeHandler = new lambda.Function(this, 'MergeHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/api/admin/merge.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(60),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      environment: commonEnvironment,
    });

    // ========================================
    // Scheduled Functions (PRIVATE_ISOLATED subnets with VPC endpoints)
    // ========================================

    // Future Ticketing Polling Function - runs every 5 minutes
    const futureTicketingPoller = new lambda.Function(this, 'FutureTicketingPoller', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/scheduled/future-ticketing-poller.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(300),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        ...commonEnvironment,
        FUTURE_TICKETING_QUEUE_URL: futureTicketingQueue.queueUrl,
        FUTURE_TICKETING_API_URL: futureTicketingApiUrl,
        FUTURE_TICKETING_API_KEY: futureTicketingSecret.secretValueFromJson('apiKey').unsafeUnwrap(),
        FUTURE_TICKETING_PRIVATE_KEY: futureTicketingSecret.secretValueFromJson('privateKey').unsafeUnwrap(),
      },
    });

    futureTicketingQueue.grantSendMessages(futureTicketingPoller);
    futureTicketingSecret.grantRead(futureTicketingPoller);

    new events.Rule(this, 'FutureTicketingPollingSchedule', {
      description: 'Trigger Future Ticketing poller every 5 minutes',
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      targets: [new targets.LambdaFunction(futureTicketingPoller)],
    });

    // Mailchimp Sync Function - runs every hour
    const mailchimpSyncer = new lambda.Function(this, 'MailchimpSyncer', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/scheduled/mailchimp-syncer.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(300),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC }, // Public subnets for internet access to Mailchimp API
      allowPublicSubnet: true, // Allow Lambda in public subnet
      securityGroups: [lambdaSecurityGroup],
      environment: {
        ...commonEnvironment,
        MAILCHIMP_QUEUE_URL: mailchimpQueue.queueUrl,
      },
    });

    mailchimpQueue.grantSendMessages(mailchimpSyncer);

    new events.Rule(this, 'MailchimpSyncSchedule', {
      description: 'Trigger Mailchimp sync every hour',
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      targets: [new targets.LambdaFunction(mailchimpSyncer)],
    });

    // Supporter Type Classification Function - runs every 30 minutes
    const supporterTypeClassifier = new lambda.Function(this, 'SupporterTypeClassifier', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/scheduled/supporter-type-classifier.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(300),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      environment: commonEnvironment,
    });

    new events.Rule(this, 'SupporterTypeClassificationSchedule', {
      description: 'Trigger supporter type classification every 30 minutes',
      schedule: events.Schedule.rate(cdk.Duration.minutes(30)),
      targets: [new targets.LambdaFunction(supporterTypeClassifier)],
    });

    // Reconciliation Function - runs daily at 2 AM UTC
    const reconciler = new lambda.Function(this, 'Reconciler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/scheduled/reconciler.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(900), // 15 minutes
      memorySize: 512,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      environment: commonEnvironment,
    });

    new events.Rule(this, 'ReconciliationSchedule', {
      description: 'Trigger daily reconciliation at 2 AM UTC',
      schedule: events.Schedule.cron({ hour: '2', minute: '0' }),
      targets: [new targets.LambdaFunction(reconciler)],
    });

    // ========================================
    // EventBridge Rules for Partner Webhooks
    // ========================================

    // Shopify EventBridge Rule - routes events from Shopify partner event bus to SQS
    // Event source: aws.partner/shopify.com/313809895425/supporter360
    const shopifyEventBus = events.EventBus.fromEventBusArn(
      this,
      'ShopifyEventBus',
      shopifyEventBusArn
    );

    new events.Rule(this, 'ShopifyWebhooksToQueue', {
      description: 'Route Shopify webhook events from EventBridge to SQS queue',
      eventBus: shopifyEventBus,
      eventPattern: {
        source: ['aws.partner/shopify.com/313809895425'],
        detailType: ['orders/create', 'orders/updated', 'customers/create', 'customers/update'],
      },
      targets: [new targets.SqsQueue(shopifyQueue)],
    });

    // Database Migration Function - one-time use for running schema
    const migrationFunction = new lambda.Function(this, 'DbMigration', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'migrations/run-migrations.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(120),
      memorySize: 512,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      environment: commonEnvironment,
      description: 'Run database migrations (one-time or as needed)',
    });
    database.secret?.grantRead(migrationFunction);

    new cdk.CfnOutput(this, 'DbMigrationFunctionName', {
      value: migrationFunction.functionName,
      description: 'Database migration Lambda function name - invoke manually to run migrations',
    });

    // ========================================
    // SNS Topics for Security Alerts
    // ========================================
    const securityAlertTopic = new sns.Topic(this, 'SecurityAlertTopic', {
      displayName: 'Supporter 360 Security Alerts',
      topicName: 'supporter360-security-alerts',
    });

    // Add email subscription for security alerts (configure email in AWS Console)
    // securityAlertTopic.addSubscription(new subscriptions.EmailSubscription('alerts@example.com'));

    // ========================================
    // Lambda Authorizer
    // ========================================
    const authorizerFunction = new lambda.Function(this, 'ApiAuthorizer', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/authorizer.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(5),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        ...commonEnvironment,
        DB_SSL_SKIP_VERIFY: 'true', // Authorizer doesn't need SSL cert verification
      },
      description: 'API Gateway Lambda authorizer for API key validation',
    });

    const authorizer = new apigateway.TokenAuthorizer(this, 'ApiGatewayAuthorizer', {
      handler: authorizerFunction,
      identitySource: 'method.request.header.X-API-Key',
    });

    // ========================================
    // WAF Web ACL
    // ========================================
    const webAcl = new waf.CfnWebACL(this, 'ApiGatewayWebAcl', {
      defaultAction: {
        allow: {},
      },
      scope: 'REGIONAL',
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'Supporter360ApiGatewayWebAcl',
      },
      rules: [
        // AWS Managed Rules: Common Rule Set
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: {
            none: {},
          },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesCommonRuleSet',
          },
        },
        // Rate-based rule: 1000 requests per 5 minutes per IP
        {
          name: 'RateLimitRule',
          priority: 2,
          action: {
            block: {},
          },
          statement: {
            rateBasedStatement: {
              limit: 1000,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule',
          },
        },
      ],
    });

    // ========================================
    // API Gateway
    // ========================================
    // CORS configuration - Production origins only (localhost removed for security)
    const allowedOrigins = [
      'https://shamrockrovers.ie',  // Production domain
      'http://supporter360-frontend-950596328856.s3-website-eu-west-1.amazonaws.com',  // S3 static website
    ];

    const api = new apigateway.RestApi(this, 'Supporter360Api', {
      restApiName: 'Supporter 360 API',
      description: 'API for Supporter 360',
      defaultCorsPreflightOptions: {
        // Restrict CORS to specific production origins for security
        allowOrigins: allowedOrigins,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      },
      deployOptions: {
        stageName: 'prod',
        throttlingBurstLimit: 100,             // Rate limiting: burst limit
        throttlingRateLimit: 50,               // Rate limiting: steady rate
        metricsEnabled: true,                   // Enable CloudWatch metrics
        // loggingLevel: apigateway.MethodLoggingLevel.INFO,  // Requires CloudWatch Logs role ARN
        // dataTraceEnabled: false,                // Requires CloudWatch Logs role ARN
      },
    });

    // Create a usage plan for API rate limiting
    const plan = new apigateway.UsagePlan(this, 'UsagePlan', {
      name: 'Supporter360UsagePlan',
      throttle: {
        rateLimit: 50,
        burstLimit: 100,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.DAY,
      },
    });

    const apiKey = new apigateway.ApiKey(this, 'ApiKey', {
      apiKeyName: 'supporter360-api-key',
      description: 'API Key for Supporter 360',
    });

    plan.addApiKey(apiKey);

    // WAF Web ACL association - temporarily disabled due to ARN format issues
    // TODO: Enable WAF association after resolving ARN format for API Gateway stage
    // The WAF WebACL resource is created but not yet associated with API Gateway
    // new waf.CfnWebACLAssociation(this, 'ApiGatewayWebAclAssociation', {
    //   resourceArn: apiGatewayStageArn,
    //   webAclArn: webAcl.attrArn,
    // });

    // Webhook endpoints (NO authorizer - public endpoints for external webhooks)
    const webhooksResource = api.root.addResource('webhooks');
    const shopifyResource = webhooksResource.addResource('shopify');
    shopifyResource.addMethod('POST', new apigateway.LambdaIntegration(shopifyWebhookHandler));

    const stripeResource = webhooksResource.addResource('stripe');
    stripeResource.addMethod('POST', new apigateway.LambdaIntegration(stripeWebhookHandler));

    const gocardlessResource = webhooksResource.addResource('gocardless');
    gocardlessResource.addMethod('POST', new apigateway.LambdaIntegration(gocardlessWebhookHandler));

    const mailchimpResource = webhooksResource.addResource('mailchimp');
    mailchimpResource.addMethod('POST', new apigateway.LambdaIntegration(mailchimpWebhookHandler));
    // Add GET method for Mailchimp webhook validation (returns 200 OK)
    mailchimpResource.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
      }],
      requestTemplates: {
        'application/json': '{ "statusCode": 200 }',
      },
    }), {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Content-Type': true,
        },
      }],
    });

    // API endpoints (WITH authorizer - protected endpoints)
    const searchResource = api.root.addResource('search');
    searchResource.addMethod('GET', new apigateway.LambdaIntegration(searchHandler), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    const supportersResource = api.root.addResource('supporters');
    const supporterResource = supportersResource.addResource('{id}');
    supporterResource.addMethod('GET', new apigateway.LambdaIntegration(profileHandler), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    const timelineResource = supporterResource.addResource('timeline');
    timelineResource.addMethod('GET', new apigateway.LambdaIntegration(timelineHandler), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    const adminResource = api.root.addResource('admin');
    const mergeResource = adminResource.addResource('merge');
    mergeResource.addMethod('POST', new apigateway.LambdaIntegration(mergeHandler), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // ========================================
    // Frontend Hosting (S3 Static Website - no CloudFront)
    // ========================================
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `supporter360-frontend-${cdk.Stack.of(this).account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA routing - all errors go to index.html
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Allow deletion for dev environment
      autoDeleteObjects: true,
      // For static website hosting, we need to disable blockPublicAccess
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      // Add bucket policy for public read access
    });

    // ========================================
    // CloudWatch Alarms for Serverless v2
    // ========================================
    // Lambda error alarms for critical functions
    const shopifyProcessorErrors = new cloudwatch.Alarm(this, 'ShopifyProcessorErrorsAlarm', {
      metric: shopifyProcessor.metricErrors(),
      threshold: 5,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert if Shopify processor has errors',
    });

    const stripeProcessorErrors = new cloudwatch.Alarm(this, 'StripeProcessorErrorsAlarm', {
      metric: stripeProcessor.metricErrors(),
      threshold: 5,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert if Stripe processor has errors',
    });

    const futureTicketingProcessorErrors = new cloudwatch.Alarm(this, 'FutureTicketingProcessorErrorsAlarm', {
      metric: futureTicketingProcessor.metricErrors(),
      threshold: 5,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert if Future Ticketing processor has errors',
    });

    // ========================================
    // Stack Outputs
    // ========================================
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.clusterEndpoint.hostname,
      description: 'Database cluster endpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: database.secret?.secretArn || 'N/A',
      description: 'Database credentials secret ARN',
    });

    new cdk.CfnOutput(this, 'RawPayloadsBucketName', {
      value: rawPayloadsBucket.bucketName,
      description: 'S3 bucket for raw webhook payloads',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 bucket for frontend hosting',
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: frontendBucket.bucketWebsiteUrl,
      description: 'Frontend static website URL',
    });
  }
}
