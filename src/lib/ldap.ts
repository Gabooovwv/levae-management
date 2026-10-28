import { Client, type Entry } from "ldapts";

export class LdapConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LdapConfigError";
  }
}

function escapeFilter(value: string) {
  return value.replace(/[\\*()\0]/g, (char) => `\\${char.charCodeAt(0).toString(16).padStart(2, "0")}`);
}

function attribute(entry: Entry, name: string) {
  const value = entry[name] ?? entry[name.toLowerCase()];
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function configured() {
  return Boolean(process.env.LDAP_URL && (process.env.LDAP_SEARCH_BASE || process.env.LDAP_USER_DN_TEMPLATE));
}

export function ldapConfigured() {
  return configured();
}

async function bindAsUser(url: string, dn: string, password: string) {
  const client = new Client({ url, timeout: 8000, connectTimeout: 8000 });
  try {
    await client.bind(dn, password);
  } finally {
    await client.unbind().catch(() => undefined);
  }
}

export async function authenticateLdap(username: string, password: string) {
  const url = process.env.LDAP_URL;
  if (!configured() || !url) {
    throw new LdapConfigError("Az LDAP kapcsolat nincs beállítva.");
  }

  const template = process.env.LDAP_USER_DN_TEMPLATE;
  const searchBase = process.env.LDAP_SEARCH_BASE;

  if (searchBase) {
    const client = new Client({ url, timeout: 8000, connectTimeout: 8000 });
    try {
      const bindDn = process.env.LDAP_BIND_DN;
      const bindPassword = process.env.LDAP_BIND_PASSWORD ?? "";
      if (bindDn) await client.bind(bindDn, bindPassword);

      const filter = (process.env.LDAP_SEARCH_FILTER ?? "(mail={{username}})").replace(
        "{{username}}",
        escapeFilter(username),
      );
      const { searchEntries } = await client.search(searchBase, {
        scope: "sub",
        filter,
        attributes: ["mail", "uid"],
        sizeLimit: 1,
      });
      const entry = searchEntries[0];
      if (!entry?.dn) return null;

      await bindAsUser(url, entry.dn, password);
      return attribute(entry, "mail") ?? (username.includes("@") ? username : null);
    } finally {
      await client.unbind().catch(() => undefined);
    }
  }

  if (!template) return null;
  const dn = template.replace("{{username}}", username);
  await bindAsUser(url, dn, password);
  return username.includes("@") ? username : null;
}
