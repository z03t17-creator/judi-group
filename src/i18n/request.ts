import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import ar from "../messages/ar.json";
import ckb from "../messages/ckb.json";
import en from "../messages/en.json";
import { routing } from "./routing";

type MessageTree = Record<string, unknown>;

/** Deep-merge locale messages over English so missing keys never crash the UI. */
function mergeMessages(base: MessageTree, overlay: MessageTree): MessageTree {
  const out: MessageTree = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const existing = out[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      out[key] = mergeMessages(existing as MessageTree, value as MessageTree);
    } else {
      out[key] = value;
    }
  }
  return out;
}

const catalogs: Record<(typeof routing.locales)[number], MessageTree> = {
  en: en as MessageTree,
  ar: mergeMessages(en as MessageTree, ar as MessageTree),
  ckb: mergeMessages(en as MessageTree, ckb as MessageTree),
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: catalogs[locale],
  };
});
