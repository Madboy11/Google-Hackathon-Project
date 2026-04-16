import * as jwt from 'jsonwebtoken';

// In a real implementation this would be Express/FastAPI middleware handler
export const verifyJWT = (token: string): boolean => {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined");
    }
    jwt.verify(token, secret);
    return true;
  } catch {
    return false;
  }
};

export const applySecurityHeaders = (res: any) => {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", "default-src 'self'");
};
