import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { query } from '../config/db';
import { signToken } from '../utils/jwt';
import { UserRecord } from '../types';
import { env } from '../config/env';

function publicUser(u: UserRecord) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    address: u.address,
    role: u.role,
  };
}

function randomState() {
  return randomBytes(24).toString('hex');
}

function readCookie(req: Request, name: string) {
  const cookie = req.headers.cookie ?? '';
  return cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function requireGoogleConfig() {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }
}

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
};

export async function googleStart(_req: Request, res: Response) {
  requireGoogleConfig();
  const state = randomState();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.googleClientId!);
  url.searchParams.set('redirect_uri', env.googleRedirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');

  res.cookie('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 10 * 60 * 1000,
  });
  res.redirect(url.toString());
}

export async function googleCallback(req: Request, res: Response) {
  requireGoogleConfig();
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const storedState = readCookie(req, 'oauth_state');

  res.clearCookie('oauth_state');

  if (!code || !state || !storedState || state !== storedState) {
    return res.redirect(`${env.clientOrigin}/oauth/callback?error=Invalid%20OAuth%20state`);
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId!,
      client_secret: env.googleClientSecret!,
      redirect_uri: env.googleRedirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokenRes.ok || !tokenJson.access_token) {
    const message = tokenJson.error_description ?? tokenJson.error ?? 'Google token exchange failed';
    return res.redirect(`${env.clientOrigin}/oauth/callback?error=${encodeURIComponent(message)}`);
  }

  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const profile = (await userInfoRes.json()) as GoogleUserInfo;
  if (!userInfoRes.ok || !profile.email || !profile.email_verified) {
    return res.redirect(`${env.clientOrigin}/oauth/callback?error=Google%20email%20is%20not%20verified`);
  }

  const { rows } = await query<UserRecord>(
    `INSERT INTO users (name, email, password, address, role, oauth_provider, oauth_subject)
     VALUES ($1, $2, NULL, $3, 'user', 'google', $4)
     ON CONFLICT (email) DO UPDATE
       SET name = COALESCE(users.name, EXCLUDED.name),
           oauth_provider = 'google',
           oauth_subject = EXCLUDED.oauth_subject,
           updated_at = now()
     RETURNING *`,
    [
      profile.name ?? profile.email.split('@')[0],
      profile.email.toLowerCase(),
      'Address pending profile completion',
      profile.sub,
    ],
  );

  const user = rows[0];
  const token = signToken({ id: user.id, role: user.role, email: user.email });
  res.redirect(`${env.clientOrigin}/oauth/callback?token=${encodeURIComponent(token)}`);
}

export async function me(req: Request, res: Response) {
  const { rows } = await query<UserRecord>(
    `SELECT * FROM users WHERE id = $1`,
    [req.user!.id],
  );
  if (!rows[0]) return res.status(404).json({ message: 'User not found.' });
  res.json({ user: publicUser(rows[0]) });
}
