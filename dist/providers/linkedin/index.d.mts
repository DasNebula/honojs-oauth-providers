import { OAuthVariables } from '../../index.mjs';
import { LinkedInScope, LinkedInTokenResponse, LinkedInUser } from './types.mjs';
export { LinkedInErrorResponse } from './types.mjs';
import { MiddlewareHandler } from 'hono';

declare function linkedinAuth(options: {
    client_id?: string;
    client_secret?: string;
    scope?: LinkedInScope[];
    appAuth?: boolean;
    redirect_uri?: string;
}): MiddlewareHandler;

declare function refreshToken(client_id: string, client_secret: string, refresh_token: string): Promise<LinkedInTokenResponse>;

declare module 'hono' {
    interface ContextVariableMap extends OAuthVariables {
        'user-linkedin': Partial<LinkedInUser> | undefined;
    }
}

export { LinkedInScope, LinkedInTokenResponse, LinkedInUser, linkedinAuth, refreshToken };
