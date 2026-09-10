import * as Joi from 'joi';

const tokenExpirationPattern = /^[1-9]\d*(ms|s|m|h|d|w|y)?$/;

const commaSeparatedOrigins = Joi.string().custom((value: string, helpers) => {
  const origins = value.split(',').map((origin) => origin.trim());

  if (origins.some((origin) => !origin || origin === '*')) {
    return helpers.error('any.invalid');
  }

  try {
    origins.forEach((origin) => {
      const parsedOrigin = new URL(origin);

      if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.origin !== origin) {
        throw new Error('Invalid HTTP origin');
      }
    });
  } catch {
    return helpers.error('any.invalid');
  }

  return origins.join(',');
}, 'comma-separated HTTP origins');

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
  PORT: Joi.number().port().required(),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().pattern(tokenExpirationPattern).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().pattern(tokenExpirationPattern).required(),
  ALLOWED_ORIGINS: commaSeparatedOrigins.required(),
  SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
});
