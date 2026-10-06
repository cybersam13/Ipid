#!/usr/bin/env node

const DNS_ENDPOINT = "https://dns.google/resolve";
const RECORD_TYPES = [
  { label: "A", code: 1 },
  { label: "AAAA", code: 28 },
];

const input = process.argv[2];

if (!input || process.argv.length > 3) {
  console.error("Usage: node lookup.mjs <url-or-domain>");
  process.exit(2);
}

const domain = getHostname(input);
if (!domain) {
  console.error("Enter a valid URL or domain name, such as example.com.");
  process.exit(2);
}

try {
  const answers = await Promise.all(RECORD_TYPES.map(({ label }) => fetchDNS(domain, label)));
  const records = answers.flatMap((answer, index) =>
    (answer.Answer ?? [])
      .filter((record) => record.type === RECORD_TYPES[index].code)
      .map((record) => ({
        type: RECORD_TYPES[index].label,
        address: record.data,
        ttl: record.TTL,
      })),
  );

  console.log(`DNS results for ${domain}`);
  if (records.length === 0) {
    console.log("No A or AAAA records were found.");
  } else {
    for (const record of records) {
      console.log(`${record.type.padEnd(4)} ${record.address.padEnd(40)} TTL ${formatTTL(record.ttl)}`);
    }
  }
  console.log("\nLookups are sent to Google Public DNS.");
} catch (error) {
  console.error(`Lookup failed: ${error.message}`);
  process.exitCode = 1;
}

function getHostname(value) {
  const candidate = value.trim();
  if (!candidate || /[\u0000-\u0020]/.test(candidate)) return null;

  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
    if (!url.hostname || url.username || url.password) return null;
    return url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  } catch {
    return null;
  }
}

async function fetchDNS(name, type) {
  const url = new URL(DNS_ENDPOINT);
  url.searchParams.set("name", name);
  url.searchParams.set("type", type);

  const response = await fetch(url, {
    headers: { accept: "application/dns-json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("The DNS service could not complete this lookup.");

  const data = await response.json();
  if (data.Status !== 0 && data.Status !== 3) {
    const status = ({
      1: "a malformed request",
      2: "a server failure",
      4: "a request the server does not support",
      5: "a refused request",
    })[data.Status] ?? "an unexpected response";
    throw new Error(`DNS lookup returned ${status}.`);
  }
  return data;
}

function formatTTL(seconds) {
  if (!Number.isFinite(seconds)) return "unknown";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
