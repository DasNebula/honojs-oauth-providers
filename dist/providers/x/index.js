"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/providers/x/index.ts
var x_exports = {};
__export(x_exports, {
  refreshToken: () => refreshToken,
  revokeToken: () => revokeToken,
  xAuth: () => xAuth
});
module.exports = __toCommonJS(x_exports);

// src/providers/x/xAuth.ts
var import_cookie = require("hono/cookie");
var import_adapter = require("hono/adapter");
var import_http_exception2 = require("hono/http-exception");

// src/utils/getCodeChallenge.ts
async function getCodeChallenge() {
  const codeVerifier = generateRandomString();
  const encoder = new TextEncoder();
  const encoded = encoder.encode(codeVerifier);
  const shaEncoded = await crypto.subtle.digest("SHA-256", encoded);
  const strEncoded = btoa(String.fromCharCode(...new Uint8Array(shaEncoded)));
  const codeChallenge = base64URLEncode(strEncoded);
  return { codeVerifier, codeChallenge };
}
function generateRandomString() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const length = Math.floor(Math.random() * (128 - 43 + 1)) + 43;
  const randomString = Array.from({ length }, () => {
    const randomIndex = Math.floor(Math.random() * characters.length);
    return characters.charAt(randomIndex);
  }).join("");
  return randomString;
}
function base64URLEncode(str) {
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// src/utils/getRandomState.ts
var rand = () => {
  return Math.random().toString(36).substr(2);
};
function getRandomState() {
  return `${rand()}-${rand()}-${rand()}`;
}

// src/providers/x/authFlow.ts
var import_http_exception = require("hono/http-exception");

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

// src/providers/x/authFlow.ts
var AuthFlow = class {
  client_id;
  client_secret;
  redirect_uri;
  code;
  token;
  refresh_token;
  scope;
  fields;
  state;
  code_verifier;
  code_challenge;
  authToken;
  granted_scopes;
  user;
  constructor({
    client_id,
    client_secret,
    redirect_uri,
    scope,
    fields,
    state,
    codeVerifier,
    codeChallenge,
    code
  }) {
    if (client_id === void 0 || client_secret === void 0 || scope === void 0) {
      throw new import_http_exception.HTTPException(400, {
        message: "Required parameters were not found. Please provide them to proceed."
      });
    }
    this.client_id = client_id;
    this.client_secret = client_secret;
    this.redirect_uri = redirect_uri;
    this.scope = scope.join(" ");
    this.fields = fields;
    this.state = state;
    this.code_verifier = codeVerifier;
    this.code_challenge = codeChallenge;
    this.authToken = btoa(`${encodeURIComponent(client_id)}:${encodeURIComponent(client_secret)}`);
    this.code = code;
    this.token = void 0;
    this.refresh_token = void 0;
    this.granted_scopes = void 0;
  }
  redirect() {
    const parsedOptions = toQueryParams({
      response_type: "code",
      redirect_uri: this.redirect_uri,
      client_id: this.client_id,
      scope: this.scope,
      state: this.state,
      code_challenge: this.code_challenge,
      code_challenge_method: "S256"
    });
    return `https://twitter.com/i/oauth2/authorize?${parsedOptions}`;
  }
  async getTokenFromCode() {
    const parsedOptions = toQueryParams({
      code: this.code,
      grant_type: "authorization_code",
      client_id: this.client_id,
      redirect_uri: this.redirect_uri,
      code_verifier: this.code_verifier
    });
    const response = await fetch(`https://api.twitter.com/2/oauth2/token?${parsedOptions}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${this.authToken}`
      }
    }).then((res) => res.json());
    if ("error" in response) {
      throw new import_http_exception.HTTPException(400, { message: response.error_description });
    }
    if ("access_token" in response) {
      this.token = {
        token: response.access_token,
        expires_in: response.expires_in
      };
      this.granted_scopes = response.scope.split(" ");
      this.refresh_token = response.refresh_token ? { token: response.refresh_token, expires_in: 0 } : void 0;
    }
  }
  async getUserData() {
    await this.getTokenFromCode();
    const parsedOptions = toQueryParams({
      "user.fields": this.fields
    });
    const response = await fetch(`https://api.twitter.com/2/users/me?${parsedOptions}`, {
      headers: {
        authorization: `Bearer ${this.token?.token}`
      }
    }).then((res) => res.json());
    if ("error_description" in response) {
      throw new import_http_exception.HTTPException(400, { message: response.error_description });
    }
    if ("data" in response) {
      this.user = response.data;
    }
  }
};

// src/providers/x/xAuth.ts
function xAuth(options) {
  return async (c, next) => {
    const newState = getRandomState();
    const challenge = await getCodeChallenge();
    const auth = new AuthFlow({
      client_id: options.client_id || (0, import_adapter.env)(c).X_ID,
      client_secret: options.client_secret || (0, import_adapter.env)(c).X_SECRET,
      redirect_uri: options.redirect_uri || c.req.url.split("?")[0],
      scope: options.scope,
      fields: options.fields,
      state: newState,
      codeVerifier: (0, import_cookie.getCookie)(c, "code-verifier") || challenge.codeVerifier,
      codeChallenge: challenge.codeChallenge,
      code: c.req.query("code")
    });
    if (c.req.url.includes("?")) {
      const storedState = (0, import_cookie.getCookie)(c, "state");
      if (c.req.query("state") !== storedState) {
        throw new import_http_exception2.HTTPException(401);
      }
    }
    if (!auth.code) {
      (0, import_cookie.setCookie)(c, "state", newState, {
        maxAge: 60 * 10,
        httpOnly: true,
        path: "/"
        // secure: true,
      });
      (0, import_cookie.setCookie)(c, "code-verifier", challenge.codeVerifier, {
        maxAge: 60 * 10,
        httpOnly: true,
        path: "/"
        // secure: true,
      });
      return c.redirect(auth.redirect());
    }
    await auth.getUserData();
    c.set("token", auth.token);
    c.set("refresh-token", auth.refresh_token);
    c.set("user-x", auth.user);
    c.set("granted-scopes", auth.granted_scopes);
    await next();
  };
}

// src/providers/x/refreshToken.ts
var import_http_exception3 = require("hono/http-exception");
async function refreshToken(client_id, client_secret, refresh_token) {
  const authToken = btoa(`${encodeURIComponent(client_id)}:${encodeURIComponent(client_secret)}`);
  const params = toQueryParams({
    grant_type: "refresh_token",
    refresh_token
  });
  const response = await fetch(`https://api.twitter.com/2/oauth2/token?${params}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authToken}`
    }
  }).then((res) => res.json());
  if ("error_description" in response) {
    throw new import_http_exception3.HTTPException(400, { message: response.error_description });
  }
  return response;
}

// src/providers/x/revokeToken.ts
var import_http_exception4 = require("hono/http-exception");
async function revokeToken(client_id, client_secret, token) {
  const authToken = btoa(`${encodeURIComponent(client_id)}:${encodeURIComponent(client_secret)}`);
  const params = toQueryParams({
    token,
    token_type_hint: "access_token"
  });
  const response = await fetch(`https://api.twitter.com/2/oauth2/revoke?${params}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authToken}`
    }
  }).then((res) => res.json());
  if ("error_description" in response) {
    throw new import_http_exception4.HTTPException(400, { message: response.error_description });
  }
  return response.revoked;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  refreshToken,
  revokeToken,
  xAuth
});
