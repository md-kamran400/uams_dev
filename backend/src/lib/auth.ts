import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'

export interface AuthPayload {
  id: string
  email: string
  name: string
  role: string
}

const SECRET = process.env.JWT_SECRET!

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, SECRET) as AuthPayload
}

// Extend Request to carry auth user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Authorization header is the primary source. ?token= query is a fallback
  // for cases where setting a header is impractical — e.g., <img src> / <video src>
  // for inline media rendering. Only used on safe GET endpoints (file streaming).
  const header = req.headers.authorization
  let token: string | null = null
  if (header?.startsWith('Bearer ')) {
    token = header.slice(7)
  } else if (typeof req.query.token === 'string' && req.method === 'GET') {
    token = req.query.token
  }
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}
