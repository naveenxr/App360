const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generates a signed JSON Web Token
 * @param {Object} payload 
 * @returns {string} Signed JWT
 */
const signToken = (payload) => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  });
};

/**
 * Verifies and decodes a JSON Web Token
 * @param {string} token 
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, config.JWT_SECRET);
};

module.exports = {
  signToken,
  verifyToken
};
