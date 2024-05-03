import * as vscode from "vscode";
import axios from "axios";
import fs from "fs";

import { AuthenticationService } from "./client";

import { getExtensionContext } from "./context";

export async function isUserAuthenticated(): Promise<boolean> {
  const context = getExtensionContext();
  const token = await context.secrets.get("jutgeToken");
  if (!token) {
    return false;
  }
  try {
    // Check if token is valid (not expired or revoked).
    const tokenCheck = await AuthenticationService.check();
    const isTokenValid = tokenCheck.success;
    return isTokenValid;
  } catch (error) {
    console.log("Existing token is invalid.");
    return false;
  }
}

async function getTokenFromCredentials(): Promise<string | undefined> {
  const context = getExtensionContext();

  const default_email = (await context.secrets.get("email")) || "";
  const email = await vscode.window.showInputBox({
    title: "Jutge Sign-In",
    placeHolder: "your email",
    prompt: "Please write your email for Jutge.org.",
    value: default_email,
  });
  if (!email) {
    return;
  }

  const password = await vscode.window.showInputBox({
    title: "Jutge Sign-In",
    placeHolder: "your password",
    prompt: "Please write your password for Jutge.org.",
    value: "",
    password: true,
  });
  if (!password) {
    return;
  }

  let credentials;
  try {
    credentials = await AuthenticationService.login({ requestBody: { email, password } });
  } catch (error) {
    vscode.window.showErrorMessage("Jutge.org: Invalid credentials to sign in.");
    return;
  }

  await context.secrets.store("email", email);
}

function getTokenFromEnvironment(): string | undefined {
  return process.env.JUTGE_TOKEN;
}

function getTokenFromConfigFile(): string | undefined {
  // TODO: Search over several possible paths.
  const tokenFile = `${process.env.HOME}/.config/jutge/token.txt`;
  if (!fs.existsSync(tokenFile)) {
    return;
  }
  return fs.readFileSync(tokenFile, "utf8");
}

export async function signInToJutge() {
  const token_getters = [
    { id: "env", fn: getTokenFromEnvironment },
    { id: "config", fn: getTokenFromConfigFile },
    { id: "credentials", fn: getTokenFromCredentials },
  ];

  for (const getter of token_getters) {
    const token = await getter.fn();
    if (token) {
      await getExtensionContext().secrets.store("jutgeToken", token);
      axios.defaults.headers.common["Authorization"] = "Bearer " + token;

      vscode.commands.executeCommand("jutge-vscode.refreshTree");
      vscode.window.showInformationMessage(
        "Jutge.org: You have signed in (token from " + getter.id + ")"
      );
      return;
    }
  }
}

export async function signOutFromJutge() {
  const context = getExtensionContext();
  await context.secrets.delete("jutgeToken");
  await context.secrets.delete("email");

  delete axios.defaults.headers.common["Authorization"];

  vscode.commands.executeCommand("jutge-vscode.refreshTree");
  vscode.window.showInformationMessage("Jutge.org: You have signed out.");
}

export function registerAuthCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand("jutge-vscode.signIn", signInToJutge));
  context.subscriptions.push(
    vscode.commands.registerCommand("jutge-vscode.signOut", signOutFromJutge)
  );
}
