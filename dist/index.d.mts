type OAuthVariables = {
    token: Token | undefined;
    'refresh-token': Token | undefined;
    'granted-scopes': string[] | undefined;
};
type Token = {
    token: string;
    expires_in: number;
    created?: number;
};

export type { OAuthVariables };
