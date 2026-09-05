# Offline bill creation

Run `npm run build:offline-bills` after changing the create page or its components.
The build writes `public/downloads/bills-create.html`, which the create-page
toolbar offers through **Download Offline HTML**.

Open the HTML file directly in a modern browser. No server, installation, CDN,
or internet connection is required. The build bundles the actual create-page
React components and their dependencies, the compiled application stylesheet,
and local font assets. It does not read environment files or database records.

The file includes Create Bill and Preview navigation, the current preview's
layout customization controls, and PDF and Word downloads. PDF rendering code,
the PDF.js worker, and the PDF font are embedded in the same HTML file.
Summary and teacher-information pages are not included. Online staff records
and account layout customization are not fetched or synced; preview layout
changes remain in the locally saved bill. The existing Validate Data button retains its
website placeholder behavior. Older autosaves, drafts, and imported bills have
their page-break checkboxes reset to unchecked once by the offline edition.
Manual selections made afterward are retained with the bill.
Drafts and autosave use browser storage, which
can vary for local files or be disabled by browser settings. Use Export Data
for portable backups; Import Data accepts the website's JSON exports. Existing
website drafts must first be exported from the website to use them offline.

The builder uses the webpack bundled with the installed Next.js version and
TypeScript, without changing the website's Next.js export configuration.
