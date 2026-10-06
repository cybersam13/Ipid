# Addressable

**A clean, browser-based URL-to-IP lookup tool.** Enter a URL or domain to see the IPv4 (A) and IPv6 (AAAA) addresses returned by DNS, along with record TTLs and one-click copy controls.

Addressable is a small portfolio project built with plain HTML, CSS, and JavaScript. It runs entirely as a static site and can be deployed to GitHub Pages without a server or build step.

## Live Demo

After enabling GitHub Pages, the published URL will be: <https://cybersam13.github.io/Ipid/>

## Features

- Accepts a complete URL or a domain name
- Looks up IPv4 and IPv6 records in parallel
- Shows all returned addresses and their DNS TTL
- Copies individual addresses to the clipboard
- Responsive layout, keyboard-accessible controls, and reduced-motion support
- No account, API key, backend, or build process required

## Install and Run on Linux/macOS

This project is a static site and has no package installation step.

1. Clone the repository:

```sh
git clone https://github.com/cybersam13/Ipid.git
cd Ipid
```

2. Start a local web server:

```sh
python3 -m http.server 8000
```

3. Open the app in a browser:

```text
http://localhost:8000
```

You can also open `index.html` directly in a browser, but serving it through a local web server is recommended for clipboard access and a more realistic local environment.

## Run from the Terminal

The command-line version requires Node.js 18 or newer and does not open the GUI. From the project folder, run:

```sh
node lookup.mjs example.com
```

You can also provide a full URL:

```sh
node lookup.mjs https://example.com/page
```

It prints the A and AAAA records and their TTL values. The command sends DNS-over-HTTPS requests to Google Public DNS, just like the browser version.

## Deploy to GitHub Pages

1. Create a GitHub repository and push these project files to its `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. The included workflow deploys the site when changes are pushed to `main`. After its first successful run, the Pages URL appears in the repository settings.

## How It Works

The browser sends DNS-over-HTTPS JSON requests to [Google Public DNS](https://developers.google.com/speed/public-dns/docs/doh/json), asking for A and AAAA records. The page displays the returned addresses and TTL values. It does not proxy or store lookups on its own server.

## Notes on Results

DNS can return different addresses depending on time, location, resolver, and load balancing. A domain can point to several servers, a CDN, or a proxy, so these results are not necessarily the origin server and should not be treated as a permanent IP address. This tool shows the DNS records returned for the current query only.

Lookups are sent to Google Public DNS. Avoid entering URLs containing private information in the path or query string; only the hostname is used for the DNS request.

## Project Structure

```text
.
├── .github/workflows/pages.yml  # GitHub Pages deployment
├── app.js                       # Input validation and DNS lookups
├── lookup.mjs                   # Terminal-based DNS lookup
├── favicon.svg                  # Site icon
├── index.html                   # Accessible page structure
├── styles.css                   # Responsive visual design
├── LICENSE                      # MIT license
└── README.md                    # Setup and project documentation
```

## License

MIT. See [LICENSE](LICENSE).