type GoogleErrorResponse = {
    error?: {
        code: number;
        message: string;
        status: string;
    };
    error_description: string;
};
type GoogleTokenResponse = {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token: string;
    refresh_token?: string;
};
type GoogleTokenInfoResponse = {
    issued_to: string;
    audience: string;
    user_id: string;
    scope: string;
    expires_in: number;
    email: string;
    verified_email: boolean;
    access_type: string;
};
type GoogleUser = {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    locale: string;
};

export type { GoogleErrorResponse, GoogleTokenInfoResponse, GoogleTokenResponse, GoogleUser };
