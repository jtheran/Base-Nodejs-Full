// src/middleware/validation.js
import Joi from 'joi';

// Esquemas de validación
export const validationSchemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder los 50 caracteres',
      'any.required': 'El nombre es requerido'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'El email debe ser válido',
      'any.required': 'El email es requerido'
    }),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'La contraseña debe tener al menos 8 caracteres',
        'string.max': 'La contraseña no puede exceder los 128 caracteres',
        'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
        'any.required': 'La contraseña es requerida'
      }),
    role: Joi.string().valid('USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN')
      .default('USER')
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'El email debe ser válido',
      'any.required': 'El email es requerido'
    }),
    password: Joi.string().required().messages({
      'any.required': 'La contraseña es requerida'
    })
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'El refresh token es requerido'
    })
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional().messages({
      'string.email': 'El email debe ser válido'
    })
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'La contraseña actual es requerida'
    }),
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
        'string.max': 'La nueva contraseña no puede exceder los 128 caracteres',
        'string.pattern.base': 'La nueva contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
        'any.required': 'La nueva contraseña es requerida'
      })
  })
};

// Middleware de validación genérico
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Error de validación',
        details: errors,
        code: 'VALIDATION_ERROR'
      });
    }

    // Reemplazar el body con los datos validados
    req.body = value;
    next();
  };
};