import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as apiGateway from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import * as iam from '@aws-cdk/aws-iam';
import { ManagedPolicy, ServicePrincipal } from '@aws-cdk/aws-iam';

export class IncomingSmsStack extends cdk.Stack {
	constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const restapi = new apiGateway.RestApi(this, 'smsApi');

		const iamRoleForAuth = new iam.Role(this, 'ssmIamRole', {
			roleName: 'ssm-iam-role',
			assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
			managedPolicies: [
				ManagedPolicy.fromAwsManagedPolicyName(
					'service-role/AWSLambdaBasicExecutionRole'
				),
				ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMReadOnlyAccess'),
			],
		});

		const authFn = new lambda.NodejsFunction(
			this,
			'bandwidthAuthorizerLambda',
			{
				handler: 'handler',
				entry: path.join(__dirname, 'src', 'authorizer', 'index.ts'),
				role: iamRoleForAuth,
				environment: {
					BANDWIDTH_PATH: '/bandwidth_secrets',
				},
			}
		);

		const authorizer = new apiGateway.RequestAuthorizer(
			this,
			'bandwidthAuthorizer',
			{
				handler: authFn,
				identitySources: [apiGateway.IdentitySource.header('Authorization')],
			}
		);

		restapi.root.addMethod(
			'ANY',
			new apiGateway.MockIntegration({
				integrationResponses: [{ statusCode: '200' }],
				passthroughBehavior: apiGateway.PassthroughBehavior.NEVER,
				requestTemplates: {
					'application/json': '{ "statusCode": 200 }',
				},
			}),
			{
				methodResponses: [{ statusCode: '200' }],
				authorizer,
			}
		);
	}
}
