const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/token');
const { User } = require('../models');

// Verifies the Bearer token and loads the current user from the database on every request, so a
// deactivated or deleted account is locked out immediately even if its token has not expired.
const authenticate = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized('Authentication required');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or disabled');
  req.user = user;
  next();
});

// Role-based access control. The role always comes from the database record, never from the token.
const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`This action is restricted to: ${roles.join(', ')}`));
  }
  next();
};

module.exports = { authenticate, authorize };
