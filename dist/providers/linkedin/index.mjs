// src/providers/linkedin/linkedinAuth.ts
import { getCookie, setCookie } from "hono/cookie";
import { env } from "hono/adapter";
import { HTTPException as HTTPException2 } from "hono/http-exception";

// src/utils/getRandomState.ts
var rand = () => {
  return Math.random().toString(36).substr(2);
};
function getRandomState() {
  return `${rand()}-${rand()}-${rand()}`;
}

// src/providers/linkedin/authFlow.ts
import { HTTPException } from "hono/http-exception";

// src/utils/objectToQuery.ts
function toQueryParams(params) {
  const elements = Object.keys(params);
  elements.forEach((element) => {
    if (params[element] === void 0) {
      delete params[element];
    }
  });
  return new URLSearchParams(params).toString();
}

// src/providers/linkedin/authFlow.ts
var AuthFlow = class {
  client_id;
  client_secret;
  redirect_uri;
  scope;
  state;
  code;
  token;
  refresh_token;
  user;
  granted_scopes;
  constructor({
    client_id,
    client_secret,
    redirect_uri,
    scope,
    state,
    appAuth,
    code
  }) {
    this.client_id = client_id;
    this.client_secret = client_secret;
    this.redirect_uri = redirect_uri, this.scope = scope;
    this.state = state;
    this.code = appAuth ? "" : code;
    this.token = void 0;
    this.refresh_token = void 0;
    this.user = void 0;
    this.granted_scopes = void 0;
  }
  redirect() {
    const params = toQueryParams({
      response_type: "code",
      client_id: this.client_id,
      redirect_uri: this.redirect_uri,
      scope: this.scope?.join(" ") || void 0,
      state: this.state
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  }
  async getTokenFromCode() {
    const params = toQueryParams({
      grant_type: "authorization_code",
      code: this.code,
      client_id: this.client_id,
      client_secret: this.client_secret,
      redirect_uri: this.redirect_uri
    });
    const response = await fetch(`https://www.linkedin.com/oauth/v2/accessToken?${params}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }).then((res) => res.json());
    if ("error" in response) {
      throw new HTTPException(400, { message: response.error_description });
    }
    if ("access_token" in response) {
      this.token = {
        token: response.access_token,
        expires_in: response.expires_in
      };
      this.refresh_token = {
        token: response.refresh_token,
        expires_in: response.refresh_token_expires_in
      };
      this.granted_scopes = response.scope?.split(",");
    }
  }
  async getUserData() {
    if (!this.token) {
      await this.getTokenFromCode();
    }
    const response = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${this.token?.token}`
      }
    }).then((res) => res.json());
    if ("message" in response) {
      throw new HTTPException(400, { message: response.message });
    }
    if ("sub" in response) {
      this.user = response;
    }
  }
  async getAppToken() {
    const params = toQueryParams({
      grant_type: "client_credentials",
      client_id: this.client_id,
      client_secret: this.client_secret
    });
    const response = await fetch(`https://www.linkedin.com/oauth/v2/accessToken?${params}`).then(
      (res) => res.json()
    );
    if ("error" in response) {
      throw new HTTPException(400, { message: response.error_description });
    }
    if ("access_token" in response) {
      this.token = {
        token: response.access_token,
        expires_in: response.expires_in
      };
      this.granted_scopes = response.scope?.split(",");
    }
  }
};

// src/providers/linkedin/linkedinAuth.ts
function linkedinAuth(options) {
  return async (c, next) => {
    const newState = getRandomState();
    const auth = new AuthFlow({
      client_id: options.client_id || env(c).LINKEDIN_ID,
      client_secret: options.client_secret || env(c).LINKEDIN_SECRET,
      redirect_uri: options.redirect_uri || c.req.url.split("?")[0],
      scope: options.scope,
      state: newState,
      appAuth: options.appAuth || false,
      code: c.req.query("code")
    });
    if (!auth.code && !options.appAuth) {
      setCookie(c, "state", newState, {
        maxAge: 60 * 10,
        httpOnly: true,
        path: "/"
        // secure: true,
      });
      return c.redirect(auth.redirect());
    }
    if (c.req.url.includes("?")) {
      const storedState = getCookie(c, "state");
      if (c.req.query("state") !== storedState) {
        throw new HTTPException2(401);
      }
    }
    if (options.appAuth) {
      await auth.getAppToken();
    } else {
      await auth.getUserData();
    }
    c.set("token", auth.token);
    c.set("refresh-token", auth.refresh_token);
    c.set("user-linkedin", auth.user);
    c.set("granted-scopes", auth.granted_scopes);
    await next();
  };
}

// src/providers/linkedin/refreshToken.ts
import { HTTPException as HTTPException3 } from "hono/http-exception";
async function refreshToken(client_id, client_secret, refresh_token) {
  const params = toQueryParams({
    grant_type: "refresh_token",
    refresh_token,
    client_id,
    client_secret
  });
  const response = await fetch(`POST https://www.linkedin.com/oauth/v2/accessToken?${params}`, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }).then((res) => res.json());
  if ("error" in response) {
    throw new HTTPException3(400, { message: response.error });
  }
  return response;
}
export {
  linkedinAuth,
  refreshToken
};
