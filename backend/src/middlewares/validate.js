/**
 * Joi Validation Middleware
 * Validates req.body against a given Joi schema.
 * Returns 400 with structured error messages on failure.
 */
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, {
            abortEarly: false,    // Return all errors, not just the first
            stripUnknown: true,   // Remove unknown fields
        });

        if (error) {
            const messages = error.details.map((detail) => detail.message);
            return res.status(400).json({
                success: false,
                message: messages.join('. '),
                errors: messages,
            });
        }

        next();
    };
};

export default validate;
