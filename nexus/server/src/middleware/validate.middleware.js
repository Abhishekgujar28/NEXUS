export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: result.error.flatten() },
    });
  }
  req.body = result.data;
  next();
};
