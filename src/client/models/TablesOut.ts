/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Compiler } from "./Compiler";
import type { Country } from "./Country";
import type { Driver } from "./Driver";
import type { Language } from "./Language";
import type { Proglang } from "./Proglang";
import type { Timezone } from "./Timezone";
import type { Verdict } from "./Verdict";
export type TablesOut = {
  compilers: Record<string, Compiler>;
  countries: Record<string, Country>;
  drivers: Record<string, Driver>;
  languages: Record<string, Language>;
  timezones: Record<string, Timezone>;
  verdicts: Record<string, Verdict>;
  proglangs: Array<Proglang>;
};
