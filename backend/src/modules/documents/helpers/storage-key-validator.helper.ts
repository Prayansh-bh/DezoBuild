import { ValidationError } from '../../../common/errors/app-error.js';

export interface StorageKeyValidationParams {
  storageObjectKey: string;
  expectedTenantId: string;
  expectedProjectId: string;
  expectedDocumentId: string;
}

/**
 * Validates that the client-supplied storage object key strictly matches the expected tenant,
 * project, and document isolation boundary and contains no path traversal sequences.
 *
 * Expected format:
 * tenants/{tenantId}/projects/{projectId}/documents/{documentId}/{filename_or_uuid}.{ext}
 */
export function validateStorageObjectKey(params: StorageKeyValidationParams): void {
  const { storageObjectKey, expectedTenantId, expectedProjectId, expectedDocumentId } = params;

  if (!storageObjectKey || typeof storageObjectKey !== 'string') {
    throw new ValidationError('Storage object key is required and must be a string');
  }

  // Reject path traversal and backslashes
  if (
    storageObjectKey.includes('..') ||
    storageObjectKey.includes('\\') ||
    storageObjectKey.includes('//') ||
    storageObjectKey.startsWith('/')
  ) {
    throw new ValidationError('Storage object key contains invalid characters or path traversal sequences');
  }

  const parts = storageObjectKey.split('/');
  // Expected parts: ["tenants", tenantId, "projects", projectId, "documents", documentId, filename]
  if (parts.length !== 7) {
    throw new ValidationError(
      `Malformed storage object key structure. Expected tenants/{tenantId}/projects/{projectId}/documents/{documentId}/{filename}`
    );
  }

  const [tPrefix, tenantId, pPrefix, projectId, dPrefix, documentId, filename] = parts;

  if (tPrefix !== 'tenants' || pPrefix !== 'projects' || dPrefix !== 'documents') {
    throw new ValidationError('Invalid storage object key hierarchy namespaces');
  }

  if (tenantId !== expectedTenantId) {
    throw new ValidationError('Storage object key tenant segment does not match authenticated tenant scope');
  }

  if (projectId !== expectedProjectId) {
    throw new ValidationError('Storage object key project segment does not match document project scope');
  }

  if (documentId !== expectedDocumentId) {
    throw new ValidationError('Storage object key document segment does not match target document id');
  }

  if (!filename || filename.trim().length === 0 || !filename.includes('.')) {
    throw new ValidationError('Storage object key must end with a valid filename including an extension');
  }
}

/**
 * Validates that the SHA-256 checksum string matches standard 64-character hexadecimal format.
 */
export function validateSha256Checksum(fileSha256: string): void {
  if (!fileSha256 || typeof fileSha256 !== 'string') {
    throw new ValidationError('File SHA-256 checksum is required');
  }

  const sha256Regex = /^[a-f0-9]{64}$/i;
  if (!sha256Regex.test(fileSha256.trim())) {
    throw new ValidationError('File SHA-256 checksum must be exactly 64 hexadecimal characters');
  }
}
