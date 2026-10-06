const DNS_ENDPOINT = "https://dns.google/resolve";
const RECORD_TYPES = [
  { label: "A", query: "A", ipVersion: "ipv4" },
  { label: "AAAA", query: "AAAA", ipVersion: "ipv6" },
];

const form = document.querySelector("#lookup-form");
const input = document.querySelector("#url-input");
const clearButton = document.querySelector("#clear-button");
const submitButton = document.querySelector("#submit-button");
const formError = document.querySelector("#form-error");
const panel = document.querySelector("#result-panel");
const resultContent = document.querySelector("#result-content");
const statusText = document.querySelector("#result-status-text");
const lookupTime = document.querySelector("#lookup-time");

input.addEventListener("input", () => {
  clearButton.hidden = input.value.length === 0;
  formError.hidden = true;
});

clearButton.addEventListener("click", () => {
  input.value = "";
  clearButton.hidden = true;
  formError.hidden = true;
  input.focus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const domain = getHostname(input.value);

  if (!domain) {
    showInputError("Enter a valid URL or domain name, such as example.com.");
    input.focus();
    return;
  }

  formError.hidden = true;
  await lookupDomain(domain);
});

async function lookupDomain(domain) {
  setState("loading", "CHECKING DNS RECORDS");
  lookupTime.textContent = "";
  panel.setAttribute("aria-busy", "true");
  submitButton.disabled = true;
  submitButton.querySelector("span:first-child").textContent = "Looking up...";
  resultContent.innerHTML = `<div class="empty-state"><span class="empty-glyph" aria-hidden="true">···</span><p>Asking DNS for ${escapeHTML(domain)}</p><span>Checking IPv4 and IPv6 records.</span></div>`;

  const startedAt = performance.now();
  try {
    const answers = await Promise.all(RECORD_TYPES.map(({ query }) => fetchDNS(domain, query)));
    const duration = Math.round(performance.now() - startedAt);
    const records = answers.flatMap((answer, index) =>
      (answer.Answer ?? [])
        .filter((item) => item.type === (index === 0 ? 1 : 28))
        .map((item) => ({ address: item.data, ttl: item.TTL, type: RECORD_TYPES[index].label, ipVersion: RECORD_TYPES[index].ipVersion })),
    );

    setState(records.length ? "success" : "error", records.length ? "LOOKUP COMPLETE" : "NO IP RECORDS FOUND");
    lookupTime.textContent = `${duration} ms`;
    renderResults(domain, records);
  } catch (error) {
    setState("error", "LOOKUP FAILED");
    lookupTime.textContent = "";
    resultContent.innerHTML = `<div class="no-records">${escapeHTML(error.message)}</div><p class="record-note">Check your connection and try again. DNS over HTTPS requests are sent to Google Public DNS.</p>`;
  } finally {
    panel.setAttribute("aria-busy", "false");
    submitButton.disabled = false;
    submitButton.querySelector("span:first-child").textContent = "Find IP address";
  }
}

async function fetchDNS(domain, type) {
  const url = new URL(DNS_ENDPOINT);
  url.searchParams.set("name", domain);
  url.searchParams.set("type", type);

  const response = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!response.ok) throw new Error("The DNS service could not complete this lookup.");
  const data = await response.json();
  if (data.Status !== 0 && data.Status !== 3) {
    throw new Error(`DNS lookup returned ${dnsStatusName(data.Status)}.`);
  }
  return data;
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

function renderResults(domain, records) {
  resultContent.classList.remove("is-updating");
  void resultContent.offsetWidth;
  resultContent.classList.add("is-updating");

  if (!records.length) {
    resultContent.innerHTML = `<div class="result-domain"><strong>${escapeHTML(domain)}</strong><span class="record-count">0 IP ADDRESSES</span></div><div class="no-records">No A or AAAA records were found for this domain.</div><p class="record-note">The domain may not exist, or its DNS configuration may not publish IP address records.</p>`;
    return;
  }

  const rows = records.map(({ address, ttl, type, ipVersion }) => `
    <div class="record-row">
      <span class="record-type ${ipVersion}">${type}</span>
      <code class="record-address">${escapeHTML(address)}</code>
      <span class="record-ttl">TTL ${formatTTL(ttl)}</span>
      <button class="copy-button" type="button" data-copy="${escapeHTML(address)}" aria-label="Copy ${escapeHTML(address)}" title="Copy IP address">⧉</button>
    </div>`).join("");

  resultContent.innerHTML = `
    <div class="result-domain"><strong>${escapeHTML(domain)}</strong><span class="record-count">${records.length} IP ${records.length === 1 ? "ADDRESS" : "ADDRESSES"}</span></div>
    <div class="record-list">${rows}</div>
    <p class="record-note">DNS responses can vary by location and time. These are the records returned for this query.</p>`;

  resultContent.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = "✓";
        button.setAttribute("aria-label", "IP address copied");
        window.setTimeout(() => {
          button.textContent = "⧉";
          button.setAttribute("aria-label", `Copy ${button.dataset.copy}`);
        }, 1400);
      } catch {
        button.title = "Clipboard access is unavailable in this browser";
      }
    });
  });
}

function showInputError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function setState(state, label) {
  panel.dataset.state = state;
  statusText.textContent = label;
}

function dnsStatusName(status) {
  return ({ 1: "a malformed request", 2: "a server failure", 4: "a request the server does not support", 5: "a refused request" })[status] ?? "an unexpected response";
}

function formatTTL(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}