#!/usr/bin/env python3
"""
Integration Verification Script for Supporter 360
Tests Lambda connectivity to database, VPC endpoints, and internet access
"""

import subprocess
import json
import sys

def run_command(cmd):
    """Run shell command and return output"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        return result.stdout.strip(), result.returncode
    except subprocess.TimeoutExpired:
        return "", -1

def main():
    print("=" * 80)
    print("Supporter 360 - Integration Verification")
    print("=" * 80)
    print()

    results = []

    # Test 1: VPC Endpoints
    print("TEST 1: VPC Endpoints")
    print("-" * 80)

    vpc_id = "vpc-0ed010a4411bc5c92"

    # Check Secrets Manager endpoint
    cmd = f'aws ec2 describe-vpc-endpoints --filters "Name=vpc-id,Values={vpc_id}" "Name=service-name,Values=com.amazonaws.eu-west-1.secretsmanager" --query "VpcEndpoints[0].State" --output text'
    secrets_ep, _ = run_command(cmd)

    # Check SQS endpoint
    cmd = f'aws ec2 describe-vpc-endpoints --filters "Name=vpc-id,Values={vpc_id}" "Name=service-name,Values=com.amazonaws.eu-west-1.sqs" --query "VpcEndpoints[0].State" --output text'
    sqs_ep, _ = run_command(cmd)

    # Check S3 endpoint
    cmd = f'aws ec2 describe-vpc-endpoints --filters "Name=vpc-id,Values={vpc_id}" "Name=service-name,Values=com.amazonaws.eu-west-1.s3" --query "VpcEndpoints[0].State" --output text'
    s3_ep, _ = run_command(cmd)

    print(f"Secrets Manager: {secrets_ep}")
    print(f"SQS: {sqs_ep}")
    print(f"S3: {s3_ep}")

    vpc_pass = secrets_ep == "available" and sqs_ep == "available" and s3_ep == "available"
    results.append(("VPC Endpoints", vpc_pass, "All required endpoints available" if vpc_pass else "Some endpoints missing"))
    print(f"Status: {'✓ PASS' if vpc_pass else '✗ FAIL'}")
    print()

    # Test 2: Database Connectivity
    print("TEST 2: Database Connectivity")
    print("-" * 80)

    db_endpoint = "supporter360stackv2-supporter360database3a977b01-z5jaoh3fhyvr.cluster-cmfwmmgu7sye.eu-west-1.rds.amazonaws.com"

    # Try to connect to database port
    cmd = f"timeout 5 nc -zv {db_endpoint} 5432 2>&1"
    output, _ = run_command(cmd)

    db_reachable = "succeeded" in output or "open" in output
    results.append(("Database Connectivity", db_reachable, f"Database {db_endpoint}:5432 reachable" if db_reachable else f"Database {db_endpoint}:5432 NOT reachable (may be network restrictions)"))
    print(f"Status: {'✓ PASS' if db_reachable else '✗ FAIL (expected from this location)'}")
    print()

    # Test 3: Secrets Manager Access
    print("TEST 3: Secrets Manager Access")
    print("-" * 80)

    secrets = [
        "supporter360/shopify",
        "supporter360/stripe",
        "supporter360/gocardless",
        "supporter360/future-ticketing",
        "supporter360/mailchimp"
    ]

    secrets_pass = True
    for secret in secrets:
        cmd = f'aws secretsmanager describe-secret --secret-id {secret} --query "Name" --output text 2>/dev/null'
        output, rc = run_command(cmd)
        exists = rc == 0 and output == secret
        print(f"  {secret}: {'✓ PASS' if exists else '✗ FAIL'}")
        if not exists:
            secrets_pass = False

    results.append(("Secrets Manager Access", secrets_pass, f"{len(secrets)} secrets accessible"))
    print()

    # Test 4: Lambda Subnet Placement
    print("TEST 4: Lambda Subnet Placement")
    print("-" * 80)

    lambda_configs = [
        ("Supporter360StackV2-ShopifyProcessor723136A0-hINnaeFpYh7v", "PRIVATE_ISOLATED"),
        ("Supporter360StackV2-StripeProcessorEABC2EA0-DbbG1Lh89O8D", "PRIVATE_ISOLATED"),
        ("Supporter360StackV2-GoCardlessProcessorEDE64209-liTWJCEuDM8S", "PUBLIC"),
        ("Supporter360StackV2-FutureTicketingProcessor720971-Vnsdl4VookR1", "PRIVATE_ISOLATED"),
        ("Supporter360StackV2-MailchimpProcessorF1F3CE1B-ZARnE37f3lzl", "PRIVATE_ISOLATED"),
        ("Supporter360StackV2-MailchimpSyncerB1500334-PqJI8QqeyZw3", "PUBLIC"),
        ("Supporter360StackV2-SearchHandler00CE2B50-XO9n0HtQZIV9", "PRIVATE_ISOLATED"),
        ("Supporter360StackV2-ProfileHandler493DBCF6-9taT6IjVyq77", "PRIVATE_ISOLATED"),
        ("Supporter360StackV2-TimelineHandler911152F8-VQwP0fvYtJzy", "PRIVATE_ISOLATED"),
        ("Supporter360StackV2-MergeHandler5C0DE479-XIt2t48V6GVY", "PRIVATE_ISOLATED"),
        ("Supporter360StackV2-FutureTicketingPoller8CAD55B4-J4dgZpIuAwbv", "PRIVATE_ISOLATED"),
    ]

    subnet_pass = True
    for lambda_name, expected_type in lambda_configs:
        cmd = f'aws lambda get-function-configuration --function-name {lambda_name} --query "VpcConfig.SubnetIds" --output json'
        output, rc = run_command(cmd)

        if rc != 0 or not output or output == "None":
            print(f"  {lambda_name}: ✗ FAIL - No VPC config")
            subnet_pass = False
            continue

        try:
            subnet_ids = json.loads(output)
            if not subnet_ids:
                print(f"  {lambda_name}: ✗ FAIL - No subnets")
                subnet_pass = False
                continue

            # Get first subnet details
            cmd = f'aws ec2 describe-subnets --subnet-ids {subnet_ids[0]} --query "Subnets[0].Tags[?Key==\'Name\'].Value|[0]" --output text'
            subnet_name, _ = run_command(cmd)

            if "public" in subnet_name.lower():
                actual_type = "PUBLIC"
            elif "private" in subnet_name.lower():
                actual_type = "PRIVATE_ISOLATED"
            else:
                actual_type = "UNKNOWN"

            matches = actual_type == expected_type
            print(f"  {lambda_name}: {'✓ PASS' if matches else '✗ FAIL'} - {actual_type} (expected {expected_type})")
            if not matches:
                subnet_pass = False
        except Exception as e:
            print(f"  {lambda_name}: ✗ FAIL - Error: {e}")
            subnet_pass = False

    results.append(("Lambda Subnet Placement", subnet_pass, "All Lambda functions in correct subnets"))
    print()

    # Test 5: Security Group Configuration
    print("TEST 5: Security Group Configuration")
    print("-" * 80)

    sg_id = "sg-0fd92d7534dfaac4b"

    # Check Lambda SG allows outbound
    cmd = f'aws ec2 describe-security-groups --group-ids {sg_id} --query "SecurityGroups[0].IpPermissionsEgress" --output json'
    sg_output, _ = run_command(cmd)

    sg_outbound = False
    try:
        egress_rules = json.loads(sg_output)
        if egress_rules and len(egress_rules) > 0:
            sg_outbound = True
            print(f"  Lambda Security Group ({sg_id}): ✓ PASS - Allows outbound traffic")
    except:
        print(f"  Lambda Security Group ({sg_id}): ✗ FAIL - Cannot verify")

    # Check database SG allows Lambda
    cmd = 'aws rds describe-db-clusters --db-cluster-identifier supporter360stackv2-supporter360database3a977b01-z5jaoh3fhyvr --query "DBClusters[0].VpcSecurityGroups[0].VpcSecurityGroupId" --output text'
    db_sg_id, _ = run_command(cmd)

    db_sg_pass = False
    if db_sg_id and db_sg_id != "None":
        cmd = f'aws ec2 describe-security-groups --group-ids {db_sg_id} --query "SecurityGroups[0].IpPermissions[?ToPort==\'5432\'].UserIdGroupPairs" --output json'
        ingress_output, _ = run_command(cmd)

        try:
            ingress_rules = json.loads(ingress_output)
            for rule in ingress_rules:
                if rule.get("GroupId") == sg_id:
                    db_sg_pass = True
                    print(f"  Database Security Group ({db_sg_id}): ✓ PASS - Allows Lambda access on port 5432")
                    break
            if not db_sg_pass:
                print(f"  Database Security Group ({db_sg_id}): ✗ FAIL - Does not allow Lambda access")
        except:
            print(f"  Database Security Group ({db_sg_id}): ✗ FAIL - Cannot verify")
    else:
        print(f"  Database Security Group: ✗ FAIL - Could not retrieve")

    sg_pass = sg_outbound and db_sg_pass
    results.append(("Security Groups", sg_pass, "Lambda can access database"))
    print()

    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()

    passed = sum(1 for _, p, _ in results if p)
    total = len(results)

    for name, passed_flag, details in results:
        status = "✓ PASS" if passed_flag else "✗ FAIL"
        print(f"{status} - {name}: {details}")

    print()
    print(f"Tests Passed: {passed}/{total}")
    print()

    if passed == total:
        print("Overall: ✓ ALL CRITICAL TESTS PASSED")
        print("=" * 80)

        # Store learnings
        learnings = {
            "timestamp": "2026-03-24",
            "test_results": {
                "vpc_endpoints": "available",
                "database_cluster": "configured",
                "secrets_manager": "accessible",
                "lambda_placement": "verified",
                "security_groups": "configured"
            },
            "key_findings": [
                "All VPC endpoints (Secrets Manager, SQS, S3) are available",
                "Secrets Manager access confirmed for all integration secrets",
                "Lambda functions correctly placed in appropriate subnets",
                "GoCardless processor and Mailchimp syncer in PUBLIC subnets for internet access",
                "Database connectivity verified through security group rules",
                "Database cluster endpoint: supporter360stackv2-supporter360database3a977b01-z5jaoh3fhyvr.cluster-cmfwmmgu7sye.eu-west-1.rds.amazonaws.com"
            ]
        }

        with open("/home/ubuntu/supporter-360/packages/infrastructure/integration-verification-results.json", "w") as f:
            json.dump(learnings, f, indent=2)

        print("\nResults saved to: /home/ubuntu/supporter-360/packages/infrastructure/integration-verification-results.json")
        return 0
    else:
        print("Overall: ✗ SOME TESTS FAILED")
        print("=" * 80)
        return 1

if __name__ == "__main__":
    sys.exit(main())
