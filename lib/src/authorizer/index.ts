import { SSM } from 'aws-sdk';

import {
	IBandwidthCreds,
	GetHeaderCredsType,
	HandlerType,
	ResponseFactoryType,
	VerifyCredsType,
	BuildAllowAllPolicyType,
} from './authorizerTypes';

const ssm = new SSM();

export const getSecretParams = async <T>(
	paramName: string,
	ssm: SSM
): Promise<T> => {
	const params: SSM.GetParameterRequest = {
		Name: paramName,
		WithDecryption: true,
	};
	try {
		const response = await ssm.getParameter(params).promise();
		const parsedValue =
			response.Parameter?.Value && JSON.parse(response.Parameter.Value);
		return parsedValue;
	} catch (error) {
		console.error('getSecretParams() failed to get SSM Parameters:', error);
		throw error;
	}
};

// TODO: handle string scalibility
const secrets = getSecretParams<IBandwidthCreds>(
	process.env.BANDWIDTH_PATH,
	ssm
);

export const getHeaderCreds: GetHeaderCredsType = authHeader => {
	const encodedCreds = authHeader.split(' ')[1];
	const plainCreds = Buffer.from(encodedCreds, 'base64').toString().split(':');
	const reqUsername = plainCreds[0];
	const reqPassword = plainCreds[1];

	return { reqUsername, reqPassword };
};

export const buildAllowAllPolicy: BuildAllowAllPolicyType = (
	event,
	principalId
) => {
	const tmp = event.methodArn.split(':');
	const apiGatewayArnTmp = tmp[5].split('/');
	const awsAccountId = tmp[4];
	const awsRegion = tmp[3];
	const restApiId = apiGatewayArnTmp[0];
	const stage = apiGatewayArnTmp[1];
	const apiArn =
		'arn:aws:execute-api:' +
		awsRegion +
		':' +
		awsAccountId +
		':' +
		restApiId +
		'/' +
		stage +
		'/*/*';
	const policy = {
		principalId: principalId,
		policyDocument: {
			Version: '2012-10-17',
			Statement: [
				{
					Action: 'execute-api:Invoke',
					Effect: 'Allow',
					Resource: [apiArn],
				},
			],
		},
	};

	return policy;
};

export const verifyCreds: VerifyCredsType = (
	{ bandwidth_username, bandwidth_password },
	{ reqUsername, reqPassword }
) => {
	if (
		reqUsername !== bandwidth_username ||
		reqPassword !== bandwidth_password
	) {
		return false;
	}

	return reqUsername;
};

export const responseFactory: ResponseFactoryType = (event, bandwidthCreds) => {
	const authorizationHeader = event.headers?.Authorization;

	if (!authorizationHeader) {
		console.error(
			`Auth failed in responseFactory(): authorization header is "${authorizationHeader}"`
		);
		throw new Error('Unauthorized');
	}

	const headerCreds = getHeaderCreds(authorizationHeader);

	const isValidCreds = verifyCreds(bandwidthCreds, headerCreds);

	if (!isValidCreds) {
		console.error(
			'Auth failed in responseFactory(): credentials could not be validated'
		);
		throw new Error('Unauthorized');
	}

	const reqUsername = isValidCreds;

	const authResponse = buildAllowAllPolicy(event, reqUsername);

	return authResponse;
};

export const handler: HandlerType = async (event, _, callback) => {
	try {
		const authResponse = responseFactory(event, await secrets);
		callback(null, authResponse);
	} catch (error) {
		console.error(`Error in handler(): ${error}`);
		callback('Unauthorized');
	}
};
