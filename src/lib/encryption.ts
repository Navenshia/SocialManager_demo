import CryptoJS from 'crypto-js';

// This is just for development. In production, this would be an environment variable
// stored securely, not embedded in the code.
const ENCRYPTION_KEY = 'social-media-automation-tool-secret-key';

/**
 * Encrypts sensitive data before storing it
 */
export function encryptData(data: string): string {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
}

/**
 * Decrypts sensitive data for use in API requests
 */
export function decryptData(encryptedData: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Removes any API keys/tokens from an object for logging purposes
 */
export function sanitizeForLogging(obj: Record<string, any>): Record<string, any> {
  const sanitized = { ...obj };
  
  const sensitiveKeys = [
    'apiKey', 'key', 'secret', 'token', 'accessToken', 'refreshToken', 
    'clientSecret', 'password', 'credentials'
  ];
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sensitiveKey => key.toLowerCase().includes(sensitiveKey.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }
  
  return sanitized;
}