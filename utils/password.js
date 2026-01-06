import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashPasswordSHA256 = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

