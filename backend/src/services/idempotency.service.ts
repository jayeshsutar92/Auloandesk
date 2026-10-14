import crypto from "crypto";
import { prisma } from "../config/db.js";
import { AppError } from "../middleware/error.middleware.js";

/**
 * Computes a deterministic SHA-256 hash for an arbitrary request body.
 * Normalizes object key ordering so identical payloads generate identical hashes.
 */
export function computePayloadHash(payload: unknown): string {
  if (payload === undefined || payload === null) {
    return crypto.createHash("sha256").update("").digest("hex");
  }

  if (typeof payload !== "object") {
    return crypto.createHash("sha256").update(String(payload)).digest("hex");
  }

  // Canonicalize keys recursively
  const canonicalize = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(canonicalize);
    }
    const record = obj as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const result: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      result[k] = canonicalize(record[k]);
    }
    return result;
  };

  const canonicalJson = JSON.stringify(canonicalize(payload));
  return crypto.createHash("sha256").update(canonicalJson).digest("hex");
}

export interface IdempotentResult<T> {
  status: number;
  body: T;
  fromCache: boolean;
}

/**
 * Executes an action with database-backed idempotency protection.
 * - Uses PostgreSQL transaction advisory locks to eliminate race conditions between concurrent requests with the same key.
 * - Checks for previous successful responses under the same key.
 * - If identical payload: returns the stored response.
 * - If differing payload: rejects with 400 IDEMPOTENCY_PAYLOAD_MISMATCH.
 * - If new key: executes action and persists response in idempotency_records within the transaction.
 */
export async function executeIdempotentRequest<T>(
  key: string,
  requestPath: string,
  requestMethod: string,
  payload: unknown,
  executeAction: () => Promise<{ status: number; body: T }>
): Promise<IdempotentResult<T>> {
  const trimmedKey = key.trim();
  if (!trimmedKey || trimmedKey.length < 4 || trimmedKey.length > 255) {
    throw new AppError(
      400,
      "Idempotency-Key header must be between 4 and 255 characters.",
      "INVALID_IDEMPOTENCY_KEY"
    );
  }

  const currentHash = computePayloadHash(payload);

  // Execute within interactive transaction to guarantee atomicity and serialization
  return await prisma.$transaction(async (tx) => {
    // 1. Acquire transaction advisory lock based on idempotency key
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'idempotency:' + trimmedKey}))`;

    // 2. Check if key was already processed
    const existing = await tx.idempotencyRecord.findUnique({
      where: { key: trimmedKey }
    });

    if (existing) {
      if (existing.requestHash !== currentHash) {
        throw new AppError(
          400,
          "The provided Idempotency-Key has already been used with a different request payload.",
          "IDEMPOTENCY_PAYLOAD_MISMATCH"
        );
      }

      return {
        status: existing.responseStatus,
        body: existing.responseBody as T,
        fromCache: true
      };
    }

    // 3. Key does not exist: execute the core business action
    const result = await executeAction();

    // 4. Save response in idempotency_records
    await tx.idempotencyRecord.create({
      data: {
        key: trimmedKey,
        requestPath,
        requestMethod: requestMethod.toUpperCase(),
        requestHash: currentHash,
        responseStatus: result.status,
        responseBody: result.body as object
      }
    });

    return {
      status: result.status,
      body: result.body,
      fromCache: false
    };
  });
}
