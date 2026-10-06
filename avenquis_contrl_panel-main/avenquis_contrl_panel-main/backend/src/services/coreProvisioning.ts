import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { config } from '../config/index.js';
import { ProvisioningCommand, ProvisioningCommandInput, provisioningResultSchema } from '../contracts/platform.js';
import { phase1Repo } from '../lib/phase1Repository.js';
import { AppError } from '../middleware/errorHandler.js';

export async function dispatchCoreProvisioning(input: ProvisioningCommandInput, actorId: string) {
  const command: ProvisioningCommand = {
    ...input,
    provisioningOperationId: input.provisioningOperationId ?? `prov-${randomUUID()}`,
  } as ProvisioningCommand;
  const operation = await phase1Repo.queueProvisioning(command, actorId);
  if (operation.status !== 'QUEUED' || !config.core.apiUrl || !config.core.serviceToken) {
    return { operation, result: null };
  }

  const outboundCommand = { ...command, provisioningOperationId: operation.provisioningOperationId };
  let response: globalThis.Response;
  try {
    response = await fetch(`${config.core.apiUrl.replace(/\/$/, '')}/api/v1/internal/provisioning`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.core.serviceToken}`,
        'x-correlation-id': command.correlationId,
      },
      body: JSON.stringify(outboundCommand),
    });
  } catch {
    await phase1Repo.completeProvisioning(operation.provisioningOperationId, 'FAILED', {}, {
      code: 'CORE_UNREACHABLE', message: 'Core provisioning endpoint was unreachable',
    });
    throw new AppError('Core provisioning endpoint is unavailable.', 502, 'CORE_UNREACHABLE');
  }

  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    await phase1Repo.completeProvisioning(operation.provisioningOperationId, 'FAILED', body, {
      code: 'CORE_PROVISIONING_FAILED', message: 'Core rejected the provisioning command',
    });
    throw new AppError('Core provisioning failed.', 502, 'CORE_PROVISIONING_FAILED');
  }

  const coreEnvelope = z.object({ success: z.literal(true), data: provisioningResultSchema }).parse(body);
  const completed = await phase1Repo.completeProvisioning(operation.provisioningOperationId, 'COMPLETED', coreEnvelope.data);
  return { operation: completed, result: coreEnvelope.data };
}
