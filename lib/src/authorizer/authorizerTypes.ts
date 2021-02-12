import {
	APIGatewayAuthorizerResult,
	APIGatewayRequestAuthorizerEvent,
	Callback,
	PolicyDocument,
} from 'aws-lambda';

export interface IHeaderCreds {
	reqUsername: string;
	reqPassword: string;
}

export interface IBandwidthCreds {
	bandwidth_username: string;
	bandwidth_password: string;
}

export type BuildAllowAllPolicyType = (
	event: APIGatewayRequestAuthorizerEvent,
	principalId: string
) => {
	principalId: string;
	policyDocument: PolicyDocument;
};

export type VerifyCredsType = (
	{ bandwidth_username, bandwidth_password }: IBandwidthCreds,
	{ reqUsername, reqPassword }: IHeaderCreds
) => string | false;

export type GetHeaderCredsType = (authHeader: string) => IHeaderCreds;

export type ResponseFactoryType = (
	event: APIGatewayRequestAuthorizerEvent,
	secrets: IBandwidthCreds
) => APIGatewayAuthorizerResult;

export type HandlerType = (
	event: APIGatewayRequestAuthorizerEvent,
	_: any,
	callback: Callback<APIGatewayAuthorizerResult>
) => Promise<void>;
