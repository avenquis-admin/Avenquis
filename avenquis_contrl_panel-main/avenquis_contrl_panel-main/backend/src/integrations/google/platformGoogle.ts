export type PlatformGooglePurpose =
  | 'ACCESS_REQUEST_EMAIL'
  | 'PLATFORM_INVITATION'
  | 'SYSTEM_COMMUNICATION';

export interface PlatformGoogleConnection {
  id: string;
  owner: 'PLATFORM';
  provider: 'GMAIL';
  connectedAccountEmail: string;
  scopes: readonly string[];
  status: 'CONNECTED' | 'REVOKED' | 'ERROR';
}

/** Internal encrypted-at-rest record. Never serialize it into Control or Core user responses. */
export interface EncryptedPlatformOAuthTokenRecord {
  connectionId: string;
  owner: 'PLATFORM';
  ciphertext: string;
  initializationVector: string;
  authenticationTag: string;
  keyVersion: string;
  expiresAt: Date | null;
}

export interface PlatformGoogleConnectionRepository {
  getPlatformGmailConnection(): Promise<PlatformGoogleConnection | null>;
  getEncryptedPlatformToken(connectionId: string): Promise<EncryptedPlatformOAuthTokenRecord | null>;
}

export interface PlatformGmailProvider {
  sendPlatformMessage(input: {
    purpose: PlatformGooglePurpose;
    connectionId: string;
    to: readonly string[];
    subject: string;
    textBody: string;
  }): Promise<{ providerMessageId: string }>;
}

// Tenant firm IDs and tenant OAuth records are intentionally absent from this platform boundary.
