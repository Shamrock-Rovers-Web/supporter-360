# AWS RDS SSL Certificates

This directory contains SSL certificates for secure connections to AWS RDS PostgreSQL instances.

## Files

- `rds-ca-bundle.pem` - AWS RDS CA bundle for certificate verification

## Purpose

These certificates enable proper SSL/TLS certificate verification when connecting to RDS PostgreSQL databases. This prevents man-in-the-middle attacks and ensures the database connection is secure.

## How It Works

1. The connection pool loads the CA bundle from this directory
2. When establishing a connection, RDS presents its SSL certificate
3. The CA bundle is used to verify the certificate is valid and from AWS
4. Connection only proceeds if verification succeeds

## Environment Variables

- `DB_SSL=true` - Enable SSL for database connections (required in production)
- `DB_SSL_SKIP_VERIFY=true` - **DEVELOPMENT ONLY** - Disables certificate verification (never use in production)

## Security Notes

- **NEVER** commit certificates to version control
- The `rds-ca-bundle.pem` is downloaded from AWS's public trust store
- Certificate verification is **required** in production environments
- Only disable verification in local development with explicit env var

## Downloading Latest Certificate

```bash
curl -s https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o packages/backend/certs/rds-ca-bundle.pem
```

See [AWS RDS SSL documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html) for details.
