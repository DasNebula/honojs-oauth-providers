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

// src/providers/github/index.ts
var github_exports = {};
__export(github_exports, {
  githubAuth: () => githubAuth
});
module.exports = __toCommonJS(github_exports);

// src/providers/github/githubAuth.ts
var import_cookie = require("hono/cookie");
var import_adapter = require("hono/adapter");
var import_http_exception2 = require("hono/http-exception");

// src/utils/getRandomState.ts
var rand = () => {
  return Math.random().toString(36).substr(2);
};
function getRandomState() {
  return `${rand()}-${rand()}-${rand()}`;
}

// src/providers/github/authFlow.ts
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

// src/providers/github/authFlow.ts
var userAgent = "Hono-Auth-App";
var AuthFlow = class {
  client_id;
  client_secret;
  scope;
  state;
  oauthApp;
  code;
  token;
  refresh_token;
  user;
  granted_scopes;
  constructor({ client_id, client_secret, scope, state, oauthApp, code }) {
    this.client_id = client_id;
    this.client_secret = client_secret;
    this.scope = scope;
    this.state = state;
    this.oauthApp = oauthApp;
    this.code = code;
    this.token = void 0;
    this.refresh_token = void 0;
    this.user = void 0;
    this.granted_scopes = void 0;
  }
  redirect() {
    const url = "https://github.com/login/oauth/authorize?";
    const queryParams = toQueryParams({
      client_id: this.client_id,
      state: this.state,
      // For GitHub apps, the scope is configured during the app setup / creation.
      // For OAuth apps, we need to provide the scope.
      ...this.oauthApp && { scope: this.scope }
    });
    return url.concat(queryParams);
  }
  async getTokenFromCode() {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      body: JSON.stringify({
        client_id: this.client_id,
        client_secret: this.client_secret,
        code: this.code
      }),
      headers: { Accept: "application/json", "Content-Type": "application/json" }
    }).then((res) => res.json());
    if ("error_description" in response) {
      throw new import_http_exception.HTTPException(400, { message: response.error_description });
    }
    if ("access_token" in response) {
      this.token = {
        token: response.access_token,
        expires_in: response.expires_in
      };
      this.granted_scopes = response.scope.split(",");
      if (response.refresh_token && response.refresh_token_expires_in) {
        this.refresh_token = {
          token: response.refresh_token,
          expires_in: response.refresh_token_expires_in
        };
      }
    }
  }
  async getEmail() {
    const emails = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${this.token?.token}`,
        "User-Agent": userAgent
      }
    }).then((res) => res.json());
    if ("message" in emails) {
      throw new import_http_exception.HTTPException(400, { message: emails.message });
    }
    let email = emails.find((emails2) => emails2.primary === true)?.email;
    if (email === void 0) {
      email = emails.find((emails2) => !emails2.email.includes("@users.noreply.github.com"))?.email;
    }
    return email;
  }
  async getUserData() {
    if (!this.token?.token) {
      await this.getTokenFromCode();
    }
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${this.token?.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": userAgent
      }
    }).then((res) => res.json());
    if ("message" in response) {
      throw new import_http_exception.HTTPException(400, { message: response.message });
    }
    response.email = await this.getEmail();
    if ("id" in response) {
      this.user = response;
    }
  }
};

// src/providers/github/githubAuth.ts
function githubAuth(options) {
  return async (c, next) => {
    const newState = getRandomState();
    const auth = new AuthFlow({
      client_id: options.client_id || (0, import_adapter.env)(c).GITHUB_ID,
      client_secret: options.client_secret || (0, import_adapter.env)(c).GITHUB_SECRET,
      scope: options.scope,
      state: newState,
      oauthApp: options.oauthApp || false,
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
      return c.redirect(
        auth.redirect().concat(options.oauthApp ? "" : `&redirect_uri=${options.redirect_uri || c.req.url}`)
      );
    }
    await auth.getUserData();
    c.set("token", auth.token);
    c.set("refresh-token", auth.refresh_token);
    c.set("user-github", auth.user);
    c.set("granted-scopes", auth.granted_scopes);
    await next();
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  githubAuth
});
