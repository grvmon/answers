# acreNkey Answers

acreNkey answers hub for East Bengaluru homebuyers, served at https://answers.acrenkey.com/.

Plain static HTML, no build step or framework:

- `index.html`: the hub listing every answered question
- `<slug>/index.html`: one answer page per question (URL `/<slug>/`)
- `assets/style.css`: one shared stylesheet built from the acre&key style guide (https://acrenkey.com/style-guide/)
- `assets/chrome.css`, `assets/chrome.js`, `favicon.svg`: header, mobile menu, footer and favicon copied from the acrenkey.com homepage (grvmon/a-K); edit these, then paste the same header/footer HTML into every page
- `sitemap.xml`, `robots.txt`

Each answer page carries its FAQPage and BreadcrumbList JSON-LD in `<script type="application/ld+json">` tags in `<head>`. Host the repo root as-is (e.g. GitHub Pages, Netlify or Cloudflare Pages) on answers.acrenkey.com.
