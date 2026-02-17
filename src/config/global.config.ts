import { registerAs } from '@nestjs/config';

export default registerAs('global', () => ({
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
}));
