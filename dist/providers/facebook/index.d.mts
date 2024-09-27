import { OAuthVariables } from '../../index.mjs';
import { Permissions, Fields, FacebookUser } from './types.mjs';
export { FacebookErrorResponse, FacebookMeResponse, FacebookTokenResponse } from './types.mjs';
import { MiddlewareHandler } from 'hono';

declare function facebookAuth(options: {
    scope: Permissions[];
    fields: Fields[];
    client_id?: string;
    client_secret?: string;
    redirect_uri?: string;
}): MiddlewareHandler;

declare module 'hono' {
    interface ContextVariableMap extends OAuthVariables {
        'user-facebook': Partial<FacebookUser> | undefined;
    }
}

export { FacebookUser, Fields, Permissions, facebookAuth };
