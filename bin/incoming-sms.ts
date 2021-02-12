#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { IncomingSmsStack } from '../lib/incoming-sms-stack';

const app = new cdk.App();
new IncomingSmsStack(app, 'IncomingSmsStack');
