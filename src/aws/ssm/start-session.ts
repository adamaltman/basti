import { StartSessionCommand } from '@aws-sdk/client-ssm';

import { parseStartSsmSessionResponse } from './parse-ssm-response.js';
import { ssmClient } from './ssm-client.js';
import { AwsSsmSessionDescriptor } from './types.js';

export interface StartSsmPortForwardingSession {
  bastionInstanceId: string;

  targetHost: string;
  targetPort: number;

  localPort: number;
}

export async function startSsmPortForwardingSession({
  bastionInstanceId,
  targetHost,
  targetPort,
  localPort,
}: StartSsmPortForwardingSession): Promise<AwsSsmSessionDescriptor> {
  const request = {
    Target: bastionInstanceId,
    DocumentName: 'AWS-StartPortForwardingSessionToRemoteHost',
    Parameters: {
      host: [targetHost],
      portNumber: [String(targetPort)],
      localPortNumber: [String(localPort)],
    },
  };

  const response = await ssmClient.send(new StartSessionCommand(request));

  return {
    request,
    response: parseStartSsmSessionResponse(response),
    region: await getSsmClientRegion(),
    endpoint: await getSsmClientEndpoint(),
  };
}

async function getSsmClientRegion(): Promise<string> {
  const clientRegion = ssmClient.client.config.region;

  return typeof clientRegion === 'string' ? clientRegion : await clientRegion();
}

async function getSsmClientEndpoint(): Promise<string> {
  const { protocol, hostname, port, path } =
    await ssmClient.client.config.endpoint();

  const portPart = port !== undefined ? `:${port}` : '';
  return `${protocol}://${hostname}${portPart}${path}`;
}
