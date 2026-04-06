import bcrypt from "bcryptjs";

export const normalizeSecurityPin = (securityPin = "") =>
  String(securityPin).trim();

export const isValidSecurityPin = (securityPin = "") =>
  /^\d{6}$/.test(normalizeSecurityPin(securityPin));

export const hashSecurityPin = async (securityPin) =>
  bcrypt.hash(normalizeSecurityPin(securityPin), 10);

export const compareSecurityPin = async (plainSecurityPin, hashedSecurityPin) => {
  if (!hashedSecurityPin) {
    return false;
  }

  return bcrypt.compare(
    normalizeSecurityPin(plainSecurityPin),
    hashedSecurityPin
  );
};

export const generateTemporarySecurityPin = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
