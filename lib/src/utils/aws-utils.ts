import { SSM } from 'aws-sdk';

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
