// src/providers/facebook/facebookAuth.ts
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

// src/providers/facebook/authFlow.ts
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

// src/providers/facebook/authFlow.ts
var AuthFlow = class {
  client_id;
  client_secret;
  redirect_uri;
  scope;
  fields;
  state;
  code;
  token;
  user;
  constructor({
    client_id,
    client_secret,
    redirect_uri,
    scope,
    state,
    fields,
    code,
    token
  }) {
    this.client_id = client_id;
    this.client_secret = client_secret;
    this.redirect_uri = redirect_uri;
    this.scope = scope;
    this.fields = fields;
    this.state = state;
    this.code = code;
    this.token = token;
    this.user = void 0;
  }
  redirect() {
    const parsedOptions = toQueryParams({
      client_id: this.client_id,
      redirect_uri: this.redirect_uri,
      response_type: ["code", "granted_scopes"],
      scope: this.scope,
      state: this.state
    });
    return `https://www.facebook.com/v18.0/dialog/oauth?${parsedOptions}`;
  }
  async getTokenFromCode() {
    const parsedOptions = toQueryParams({
      client_id: this.client_id,
      redirect_uri: this.redirect_uri,
      client_secret: this.client_secret,
      code: this.code
    });
    const url = `https://graph.facebook.com/v18.0/oauth/access_token?${parsedOptions}`;
    const response = await fetch(url).then((res) => res.json());
    if ("error" in response) {
      throw new HTTPException(400, { message: response.error?.message });
    }
    if ("access_token" in response) {
      this.token = {
        token: response.access_token,
        expires_in: response.expires_in
      };
    }
  }
  async getUserId() {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${this.token?.token}`
    ).then((res) => res.json());
    if ("error" in response) {
      throw new HTTPException(400, { message: response.error?.message });
    }
    if ("id" in response) {
      this.user = response;
    }
  }
  async getUserData() {
    await this.getTokenFromCode();
    await this.getUserId();
    const parsedFields = this.fields.join();
    const response = await fetch(
      `https://graph.facebook.com/${this.user?.id}?fields=${parsedFields}&access_token=${this.token?.token}`
    ).then((res) => res.json());
    if ("error" in response) {
      throw new HTTPException(400, { message: response.error?.message });
    }
    if ("id" in response) {
      this.user = response;
    }
  }
};

// src/providers/facebook/facebookAuth.ts
function facebookAuth(options) {
  return async (c, next) => {
    const newState = getRandomState();
    const auth = new AuthFlow({
      client_id: options.client_id || env(c).FACEBOOK_ID,
      client_secret: options.client_secret || env(c).FACEBOOK_SECRET,
      redirect_uri: options.redirect_uri || c.req.url.split("?")[0],
      scope: options.scope,
      fields: options.fields,
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
    c.set("user-facebook", auth.user);
    c.set("granted-scopes", c.req.query("granted_scopes")?.split(","));
    await next();
  };
}
export {
  facebookAuth
};
