import { MiddlewareHandler } from 'hono';
import { GoogleTokenResponse, GoogleUser } from './types.js';
export { GoogleErrorResponse, GoogleTokenInfoResponse } from './types.js';
import { OAuthVariables } from '../../index.js';

declare function googleAuth(options: {
    scope: string[];
    login_hint?: string;
    prompt?: 'none' | 'consent' | 'select_account';
    access_type?: 'online' | 'offline';
    client_id?: string;
    client_secret?: string;
    state?: string;
    redirect_uri?: string;
}): MiddlewareHandler;

declare function refreshToken(client_id: string, client_secret: string, refresh_token: string): Promise<GoogleTokenResponse & {
    created: number;
}>;

declare function revokeToken(token: string): Promise<boolean>;

declare module 'hono' {
    interface ContextVariableMap extends OAuthVariables {
        'user-google': Partial<GoogleUser> | undefined;
    }
}

export { GoogleTokenResponse, GoogleUser, googleAuth, refreshToken, revokeToken };
