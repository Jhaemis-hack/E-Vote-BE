import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET_KEY,
  jwtExpiry: process.env.JWT_EXPIRY,
  adminSecret: process.env.ADMIN_SECRET,
}));
