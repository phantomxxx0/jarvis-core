export interface SignatureValidator {
  /**
   * Validates a webhook signature.
   * @param rawPayload The raw body buffer or string of the request
   * @param signature The signature provided in the headers
   * @param secret The shared secret for HMAC verification
   * @returns true if valid, false otherwise
   */
  validate(rawPayload: Buffer, signature: string, secret: string): boolean;
}
