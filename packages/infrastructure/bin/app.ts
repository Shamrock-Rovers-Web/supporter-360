#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Supporter360Stack } from '../lib/supporter360-stack';

const app = new cdk.App();

new Supporter360Stack(app, 'Supporter360Stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-west-1',
  },
  description: 'Supporter 360 - Single pane of glass for Shamrock Rovers supporter data',
});

app.synth();
