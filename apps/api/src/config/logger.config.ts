import { Params } from 'nestjs-pino';

export const loggerConfig: Params = {
  pinoHttp: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'req.body.password',
        'req.body.token',
        'req.body.refreshToken',
        'req.body.accessToken',
      ],
      censor: '[REDACTED]',
    },
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:standard',
            },
          }
        : undefined,
  },
};
