'use strict';

const { z } = require('zod');
const logger = require('../utils/logger');

/**
 * Factory: returns Express middleware that validates req.body against a Zod schema.
 * On failure, responds with 422 and a structured error listing every field issue.
 *
 * @param {z.ZodSchema} schema
 * @param {'body' | 'query' | 'params'} [source='body']
 * @returns {import('express').RequestHandler}
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
        code: i.code,
      }));
      logger.debug({ event: 'validation.failed', source, issues }, 'Request validation failed');
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', issues },
      });
    }
    // Replace req[source] with the parsed (and coerced/stripped) data
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
