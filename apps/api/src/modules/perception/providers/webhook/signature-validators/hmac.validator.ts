import * as crypto from 'crypto';
import { SignatureValidator } from './signature-validator.interface';

export class HmacValidator implements SignatureValidator {
  constructor(
    private readonly algorithm: string = 'sha256',
    private readonly signaturePrefix: string = '',
  ) {}

  validate(rawPayload: Buffer, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac(this.algorithm, secret);
    const digest = hmac.update(rawPayload).digest('hex');
    const expectedSignature = `${this.signaturePrefix}${digest}`;

    // Use timingSafeEqual to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  }
}
