// src/providers/discord/discordAuth.ts
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

// src/providers/discord/authFlow.ts
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

// src/providers/discord/authFlow.ts
var AuthFlow = class {
  client_id;
  client_secret;
  redirect_uri;
  scope;
  state;
  code;
  token;
  refresh_token;
  granted_scopes;
  user;
  constructor({
    client_id,
    client_secret,
    redirect_uri,
    scope,
    state,
    code,
    token
  }) {
    this.client_id = client_id;
    this.client_secret = client_secret;
    this.redirect_uri = redirect_uri;
    this.scope = scope.join(" ");
    this.state = state;
    this.code = code;
    this.refresh_token = void 0;
    this.token = token;
    this.granted_scopes = void 0;
    this.user = void 0;
  }
  redirect() {
    const parsedOptions = toQueryParams({
      response_type: "code",
      client_id: this.client_id,
      scope: this.scope,
      state: this.state,
      prompt: "consent",
      redirect_uri: this.redirect_uri
    });
    return `https://discord.com/oauth2/authorize?${parsedOptions}`;
  }
  async getTokenFromCode() {
    const parsedOptions = toQueryParams({
      client_id: this.client_id,
      client_secret: this.client_secret,
      grant_type: "authorization_code",
      code: this.code,
      redirect_uri: this.redirect_uri
    });
    const url = "https://discord.com/api/oauth2/token";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: parsedOptions
    }).then((res) => res.json());
    if ("error_description" in response) {
      throw new HTTPException(400, { message: response.error_description });
    }
    if ("error" in response) {
      throw new HTTPException(400, { message: response.error });
    }
    if ("message" in response) {
      throw new HTTPException(400, { message: response.message });
    }
    if ("access_token" in response) {
      this.token = {
        token: response.access_token,
        expires_in: response.expires_in
      };
    }
    if ("refresh_token" in response) {
      this.refresh_token = {
        token: response.refresh_token,
        expires_in: 0
      };
    }
    if ("scope" in response) {
      this.granted_scopes = response.scope.split(" ");
    }
  }
  async getUserData() {
    await this.getTokenFromCode();
    const response = await fetch("https://discord.com/api/oauth2/@me", {
      headers: {
        authorization: `Bearer ${this.token?.token}`
      }
    }).then((res) => res.json());
    if ("error_description" in response) {
      throw new HTTPException(400, { message: response.error_description });
    }
    if ("error" in response) {
      throw new HTTPException(400, { message: response.error });
    }
    if ("message" in response) {
      throw new HTTPException(400, { message: response.message });
    }
    if ("user" in response) {
      this.user = response.user;
    }
  }
};

// src/providers/discord/discordAuth.ts
function discordAuth(options) {
  return async (c, next) => {
    const newState = getRandomState();
    const auth = new AuthFlow({
      client_id: options.client_id || env(c).DISCORD_ID,
      client_secret: options.client_secret || env(c).DISCORD_SECRET,
      redirect_uri: options.redirect_uri || c.req.url.split("?")[0],
      scope: options.scope,
      state: newState,
      code: c.req.query("code"),
      token: {
        token: c.req.query("access_token"),
        expires_in: Number(c.req.query("expires_in"))
      }
    });
    if (!auth.code) {
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
    await auth.getUserData();
    c.set("token", auth.token);
    c.set("refresh-token", auth.refresh_token);
    c.set("user-discord", auth.user);
    c.set("granted-scopes", auth.granted_scopes);
    await next();
  };
}

// src/providers/discord/refreshToken.ts
import { HTTPException as HTTPException3 } from "hono/http-exception";
async function refreshToken(client_id, client_secret, refresh_token) {
  const params = toQueryParams({
    grant_type: "refresh_token",
    refresh_token,
    client_id,
    client_secret
  });
  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  }).then((res) => res.json());
  if ("error" in response) {
    throw new HTTPException3(400, { message: response.error });
  }
  return response;
}

// src/providers/discord/revokeToken.ts
import { HTTPException as HTTPException4 } from "hono/http-exception";
async function revokeToken(client_id, client_secret, token) {
  const params = toQueryParams({
    token_type_hint: "access_token",
    token,
    client_id,
    client_secret
  });
  const response = await fetch("https://discord.com/api/oauth2/token/revoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });
  if (response.status !== 200) {
    throw new HTTPException4(400, { message: "Something went wrong" });
  }
  return true;
}
export {
  discordAuth,
  refreshToken,
  revokeToken
};
