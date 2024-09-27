import { OAuthVariables } from '../../index.mjs';
import { GitHubScope, GitHubUser } from './types.mjs';
export { GitHubEmailResponse, GitHubErrorResponse, GitHubTokenResponse } from './types.mjs';
import { MiddlewareHandler } from 'hono';

declare function githubAuth(options: {
    client_id?: string;
    client_secret?: string;
    scope?: GitHubScope[];
    oauthApp?: boolean;
    redirect_uri?: string;
}): MiddlewareHandler;

declare module 'hono' {
    interface ContextVariableMap extends OAuthVariables {
        'user-github': Partial<GitHubUser> | undefined;
    }
}

export { GitHubScope, GitHubUser, githubAuth };
