#!/usr/bin/env python3
"""Verify the answers.acrenkey.com internal-link plan.

Checks:
- every planned link is present (or listed as skipped, with a reason)
- 0 broken internal links
- 0 /properties/ links
- every indexable answer has at least 3 in-text inlinks
- HTML tags balance, JSON-LD parses, sitemap is valid
- no banned brand words in visible copy or JSON-LD prose

In-text inlinks are anchors inside an <article>, excluding the site header,
footer and breadcrumb. Hub-index cards are hub links, not in-text inlinks.
"""
from __future__ import annotations

import csv
import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
PLAN = Path("/home/ubuntu/.cursor/projects/workspace/uploads/link_plan_answers_e391.csv")
if not PLAN.exists():
    PLAN = ROOT / "link_plan_answers.csv"
SKIP_PATH = ROOT / "scripts" / "skipped_links.csv"
MIN_INLINKS = 3

BANNED = re.compile(
    r"(?i)(?<![A-Za-z0-9])(?:best|guaranteed|luxury|premium|unbiased|independent|objective|no\.1|dream home|100%)(?![A-Za-z0-9])"
)
HREF_RE = re.compile(
    r"""<a\b([^>]*?)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))([^>]*)>""",
    re.I | re.S,
)
VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "source", "track", "wbr",
}
# SVG presentation tags are often written without a close in this chrome.
SVG_VOID = {"path", "line", "polyline", "circle", "rect", "polygon"}


def canon_target(href: str) -> str | None:
    """Normalise an answers or acrenkey href to an absolute URL, or None if external/other."""
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
        return None
    href = href.split("#", 1)[0].split("?", 1)[0].strip()
    if href.startswith("https://answers.acrenkey.com"):
        path = href[len("https://answers.acrenkey.com") :]
        host = "https://answers.acrenkey.com"
    elif href.startswith("https://acrenkey.com"):
        path = href[len("https://acrenkey.com") :]
        host = "https://acrenkey.com"
    elif href.startswith("/") and not href.startswith("//"):
        path = href
        host = "https://answers.acrenkey.com"
    else:
        return None
    if path in ("",):
        path = "/"
    if not path.startswith("/"):
        path = "/" + path
    if path != "/" and not path.endswith("/") and "." not in path.rsplit("/", 1)[-1]:
        path += "/"
    return host + path


def page_url(path: Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    if rel == "index.html":
        return "https://answers.acrenkey.com/"
    return "https://answers.acrenkey.com/" + rel[: -len("index.html")]


def load_pages():
    pages = {}
    for path in ROOT.rglob("index.html"):
        text = path.read_text(encoding="utf-8")
        url = page_url(path)
        noindex = bool(re.search(r'<meta\b[^>]*name=["\']robots["\'][^>]*noindex', text, re.I))
        pages[url] = {"path": path, "text": text, "noindex": noindex}
    return pages


def article_html(text: str) -> str:
    m = re.search(r"<article\b.*?</article>", text, re.S | re.I)
    return m.group(0) if m else ""


def links_in(fragment: str):
    found = []
    for m in HREF_RE.finditer(fragment):
        href = next(g for g in m.groups()[1:4] if g)
        inner = ""
        found.append((href, m.start()))
    return found


def visible_text(text: str) -> str:
    text = re.sub(r"<script\b.*?</script>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<style\b.*?</style>", " ", text, flags=re.S | re.I)
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    return text


def jsonld_prose(text: str) -> str:
    chunks = []
    for m in re.finditer(r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', text, re.S | re.I):
        raw = m.group(1)
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            chunks.append(raw)
            continue

        def walk(node):
            if isinstance(node, dict):
                for k, v in node.items():
                    if k in ("@id", "url", "item", "image", "sameAs", "@context"):
                        continue
                    walk(v)
            elif isinstance(node, list):
                for v in node:
                    walk(v)
            elif isinstance(node, str):
                if node.startswith("http://") or node.startswith("https://"):
                    return
                chunks.append(node)

        walk(data)
    return "\n".join(chunks)


def tag_balance(text: str):
    cleaned = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    cleaned = re.sub(r"<script\b.*?</script>", "", cleaned, flags=re.S | re.I)
    cleaned = re.sub(r"<style\b.*?</style>", "", cleaned, flags=re.S | re.I)
    stack = []
    problems = []
    for m in re.finditer(r"<(/?)([a-zA-Z0-9]+)\b[^>]*?(/?)>", cleaned):
        closing, name, sc = m.group(1) == "/", m.group(2).lower(), m.group(3) == "/"
        if name in VOID or name in SVG_VOID or sc:
            continue
        if not closing:
            stack.append(name)
            continue
        if stack and stack[-1] == name:
            stack.pop()
            continue
        if name in stack:
            while stack and stack[-1] != name:
                problems.append("unclosed <" + stack.pop() + ">")
            if stack:
                stack.pop()
        else:
            problems.append("unexpected </" + name + ">")
    for name in stack:
        if name not in ("html", "body", "head"):
            problems.append("unclosed <" + name + ">")
    return problems


def resolve_internal(href: str, page: Path):
    """Return a Path if this href should exist inside the repo, else None.

    External acrenkey.com URLs (main site, including proposed area hubs) are
    not files in this repo and are not treated as broken.
    """
    if not href or href.startswith(("mailto:", "tel:", "javascript:")):
        return None
    bare, frag = (href.split("#", 1) + [""])[:2]
    bare = bare.split("?", 1)[0]
    if bare in ("",) and frag:
        return ("fragment", frag)
    if bare.startswith("https://answers.acrenkey.com"):
        path = bare[len("https://answers.acrenkey.com") :]
    elif bare.startswith("/") and not bare.startswith("//"):
        path = bare
    else:
        return None
    path = unquote(path)
    if path in ("", "/"):
        target = ROOT / "index.html"
    else:
        rel = path.lstrip("/")
        candidate = ROOT / rel
        if candidate.is_dir() or rel.endswith("/"):
            target = ROOT / rel.strip("/") / "index.html"
        elif "." in Path(rel).name:
            target = candidate
        else:
            target = ROOT / rel / "index.html"
    return ("file", target, frag)


def main():
    pages = load_pages()
    failures = []
    notes = []

    # --- planned links ---
    if not PLAN.exists():
        failures.append(f"link plan not found at {PLAN}")
        plan = []
    else:
        plan = list(csv.DictReader(PLAN.open()))
    recorded_skips = {}
    if SKIP_PATH.exists():
        for srow in csv.DictReader(SKIP_PATH.open()):
            src = srow["source"] if srow["source"].endswith("/") else srow["source"] + "/"
            recorded_skips[(src, canon_target(srow["target"]))] = srow["reason"]
    skipped = []
    missing = []
    present = 0
    for row in plan:
        source = row["source"]
        src_key = source if source.endswith("/") else source + "/"
        if src_key.startswith("https://answers.acrenkey.com") and not src_key.endswith("/"):
            src_key += "/"
        page = pages.get(src_key)
        if page is None:
            skipped.append((row["source"], row["target"], row["anchor"], "source page is not in this repo"))
            continue
        want = canon_target(row["target"])
        found = False
        for href, _ in links_in(page["text"]):
            got = canon_target(href)
            if got == want:
                found = True
                break
        if found:
            present += 1
            continue
        reason = recorded_skips.get((src_key, want))
        if reason:
            skipped.append((row["source"], row["target"], row["anchor"], reason))
        else:
            missing.append((row["source"], row["target"], row["anchor"], row["placement"][:80]))

    # --- properties ---
    properties = []
    for url, page in pages.items():
        if "/properties/" in page["text"] or 'href="/properties"' in page["text"]:
            properties.append(url)
    footer = ROOT / "homepage_footer.html"
    if footer.exists() and "/properties/" in footer.read_text(encoding="utf-8"):
        properties.append("homepage_footer.html")

    # --- in-text inlinks ---
    indexable = [u for u, p in pages.items() if not p["noindex"] and u != "https://answers.acrenkey.com/"]
    inlinks = defaultdict(set)
    for url, page in pages.items():
        art = article_html(page["text"])
        if not art:
            continue
        for href, _ in links_in(art):
            target = canon_target(href)
            if target in pages and target != url:
                inlinks[target].add(url)
    short = []
    for url in indexable:
        n = len(inlinks[url])
        if n < MIN_INLINKS:
            short.append((n, url))

    # --- broken internal links ---
    broken = []
    html_files = list(ROOT.rglob("index.html"))
    for path in html_files:
        text = path.read_text(encoding="utf-8")
        ids = set(re.findall(r'\bid=["\']([^"\']+)["\']', text))
        ids.update(re.findall(r"\bid=([^\s>]+)", text))
        for m in HREF_RE.finditer(text):
            href = next(g for g in m.groups()[1:4] if g)
            resolved = resolve_internal(href, path)
            if resolved is None:
                continue
            if resolved[0] == "fragment":
                if resolved[1] not in ids:
                    broken.append((str(path.relative_to(ROOT)), href, "missing fragment"))
                continue
            _, target, frag = resolved
            if not target.exists():
                broken.append((str(path.relative_to(ROOT)), href, "missing file"))
                continue
            if frag and target == path and frag not in ids:
                broken.append((str(path.relative_to(ROOT)), href, "missing fragment"))

    # --- HTML balance, JSON-LD, banned words ---
    unbalanced = []
    bad_json = []
    banned_hits = []
    for url, page in pages.items():
        problems = tag_balance(page["text"])
        if problems:
            unbalanced.append((url, problems[:6]))
        for m in re.finditer(
            r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
            page["text"],
            re.S | re.I,
        ):
            try:
                json.loads(m.group(1))
            except json.JSONDecodeError as exc:
                bad_json.append((url, str(exc)))
        for label, blob in (("copy", visible_text(page["text"])), ("json-ld", jsonld_prose(page["text"]))):
            for hit in BANNED.finditer(blob):
                start = max(0, hit.start() - 30)
                banned_hits.append((url, label, hit.group(), re.sub(r"\s+", " ", blob[start : hit.end() + 30])[:120]))

    # --- sitemap ---
    sitemap_errors = []
    sm_path = ROOT / "sitemap.xml"
    try:
        tree = ET.parse(sm_path)
    except ET.ParseError as exc:
        sitemap_errors.append(f"sitemap does not parse: {exc}")
        tree = None
    if tree is not None:
        root = tree.getroot()
        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        locs = [el.text.strip() for el in root.findall("sm:url/sm:loc", ns) if el.text]
        if not locs:
            sitemap_errors.append("sitemap has no <url><loc> entries")
        loc_set = set()
        for loc in locs:
            if not loc.startswith("https://answers.acrenkey.com/"):
                sitemap_errors.append(f"loc outside answers host: {loc}")
            if loc != "https://answers.acrenkey.com/" and not loc.endswith("/"):
                sitemap_errors.append(f"loc missing trailing slash: {loc}")
            loc_set.add(loc if loc.endswith("/") else loc + "/")
            page = pages.get(loc if loc.endswith("/") else loc + "/")
            if page is None:
                sitemap_errors.append(f"loc has no page: {loc}")
            elif page["noindex"]:
                sitemap_errors.append(f"loc points at a noindex page: {loc}")
        for url, page in pages.items():
            if page["noindex"]:
                continue
            if url not in loc_set:
                sitemap_errors.append(f"indexable page missing from sitemap: {url}")

    # --- report ---
    print(f"planned_links: {len(plan)}")
    print(f"present: {present}")
    print(f"missing: {len(missing)}")
    print(f"skipped: {len(skipped)}")
    print(f"properties_links: {len(properties)}")
    print(f"indexable_answers: {len(indexable)}")
    # --- density and related-list shape ---
    dump_hits = []
    crowded_related = []
    for url, page in pages.items():
        if "Read the full guide:" in page["text"] or "Run the numbers:" in page["text"]:
            dump_hits.append(url)
        lists = re.findall(r'<ul class="related-ak">(.*?)</ul>', page["text"], re.S)
        if len(lists) > 1:
            crowded_related.append((url, "more than one related list"))
        for ul in lists:
            n = len(re.findall(r"<li\b", ul))
            if n > 6:
                crowded_related.append((url, f"{n} related items"))

    print(f"answers_under_{MIN_INLINKS}_inlinks: {len(short)}")
    if indexable:
        print(f"min_intext_inlinks: {min(len(inlinks[u]) for u in indexable)}")
    print(f"broken_internal_links: {len(broken)}")
    print(f"unbalanced_pages: {len(unbalanced)}")
    print(f"jsonld_errors: {len(bad_json)}")
    print(f"sitemap_errors: {len(sitemap_errors)}")
    print(f"banned_word_hits: {len(banned_hits)}")

    if skipped:
        print("\nSKIPPED")
        for item in skipped:
            print(" -", " | ".join(item))
    if missing:
        print("\nMISSING")
        for item in missing[:40]:
            print(" -", item[0], "->", item[1])
    if short:
        print(f"\nUNDER {MIN_INLINKS}")
        for n, url in sorted(short):
            print(f" - {n} {url}")
    if dump_hits:
        print("\nDUMP PARAGRAPHS")
        for url in dump_hits[:20]:
            print(" -", url)
    if crowded_related:
        print("\nRELATED")
        for item in crowded_related[:20]:
            print(" -", item)
    if broken:
        print("\nBROKEN")
        for item in broken[:40]:
            print(" -", item)
    if unbalanced:
        print("\nUNBALANCED")
        for url, probs in unbalanced[:15]:
            print(" -", url, probs)
    if bad_json:
        print("\nJSONLD")
        for item in bad_json[:10]:
            print(" -", item)
    if sitemap_errors:
        print("\nSITEMAP")
        for item in sitemap_errors[:20]:
            print(" -", item)
    if banned_hits:
        print("\nBANNED")
        for item in banned_hits[:20]:
            print(" -", item)

    ok = not (
        missing or properties or short or broken or unbalanced or bad_json
        or sitemap_errors or banned_hits or dump_hits or crowded_related
    )
    print("\nRESULT", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
