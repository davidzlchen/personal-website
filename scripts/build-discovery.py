#!/usr/bin/env python3
"""Generate public discovery artifacts from published HTML, without dependencies."""
import argparse
import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from zoneinfo import ZoneInfo
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://davidzlchen.com'
START = '<!-- discovery:start -->'
END = '<!-- discovery:end -->'
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

@dataclass
class Node:
    tag: str
    attrs: dict = field(default_factory=dict)
    children: list = field(default_factory=list)

class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.root = Node('document')
        self.stack = [self.root]
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs))
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def nodes(node):
    if isinstance(node, Node):
        yield node
        for child in node.children:
            yield from nodes(child)


def plain(node):
    if isinstance(node, str):
        return node
    return ''.join(plain(c) if not isinstance(c, Node) or c.tag != 'br' else ' ' for c in node.children)


def markdown(node, url):
    if isinstance(node, str):
        return re.sub(r'\s+', ' ', node)
    if node.attrs.get('aria-hidden') == 'true' or 'hidden' in node.attrs:
        return ''
    if node.tag in {'script', 'style', 'svg', 'aside', 'nav', 'button', 'input', 'select'}:
        return ''
    if {'desk', 'hero-art', 'writing-art'} & set(node.attrs.get('class', '').split()):
        return ''
    text = ''.join(markdown(c, url) for c in node.children)
    if re.fullmatch('h[1-6]', node.tag):
        return '\n\n' + '#' * int(node.tag[1]) + ' ' + text.strip() + '\n\n'
    if node.tag == 'a' and node.attrs.get('href') and text.strip():
        link = urljoin(url, node.attrs['href'])
        if '\n' in text.strip():
            label = next((plain(n).strip() for n in nodes(node) if n.tag in {'h2', 'h3'}), 'Read more')
            return text.strip() + '\n\n[' + label + '](' + link + ')\n\n'
        return '[' + text.strip() + '](' + link + ')'
    if node.tag == 'img':
        return '![' + node.attrs.get('alt', '') + '](' + urljoin(url, node.attrs['src']) + ')'
    if node.tag == 'span':
        return text + ' '
    if node.tag == 'br':
        return ' '
    if node.tag in {'strong', 'b'}:
        return '**' + text.strip() + '**'
    if node.tag == 'li':
        return '\n- ' + text.strip() + '\n'
    if node.tag == 'blockquote':
        return '\n\n' + '\n'.join('> ' + line for line in text.strip().splitlines()) + '\n\n'
    if node.tag in {'p', 'section', 'article', 'header', 'figure', 'div', 'ul', 'ol'}:
        return '\n\n' + text.strip() + '\n\n'
    return text


def generate():
    # Only editorial/public page HTML is read. No account exports or snapshots.
    paths = [ROOT / 'index.html', *sorted((ROOT / 'blog').rglob('index.html')), ROOT / 'pokemon-sleep/index.html']
    outputs = {}
    pages = []
    for path in paths:
        source = path.read_text()
        source = re.sub(re.escape(START) + r'.*?' + re.escape(END) + r'\s*', '', source, flags=re.S)
        doc = list(nodes(Document(source).root))
        title = next(plain(n).strip() for n in doc if n.tag == 'title')
        description = next(n.attrs['content'] for n in doc if n.tag == 'meta' and n.attrs.get('name') == 'description')
        relative = path.relative_to(ROOT).as_posix().removesuffix('index.html')
        url = ORIGIN + '/' + relative
        md_path = relative + 'index.md'
        main = next(n for n in doc if n.tag == 'main')
        if relative == 'pokemon-sleep/':
            main = next(n for n in doc if 'hero-copy' in n.attrs.get('class', '').split())
        content = re.sub(r'\n[ \t]+', '\n', markdown(main, url))
        content = '\n'.join(line.rstrip() for line in content.splitlines())
        content = re.sub(r'\n{3,}', '\n\n', content).strip()
        date = next((n.attrs['datetime'] for n in doc if n.tag == 'time' and 'datetime' in n.attrs), None)
        post = relative.startswith('blog/') and relative != 'blog/'
        if post and not date:
            raise ValueError(f'{path}: blog post needs a publication date')
        graph = [
            {'@type': 'Person', '@id': ORIGIN + '/#author', 'name': 'David Z. Chen', 'url': ORIGIN + '/', 'sameAs': ['https://github.com/davidzlchen', 'https://linkedin.com/in/davidzlchen']},
            {'@type': 'WebSite', '@id': ORIGIN + '/#website', 'url': ORIGIN + '/', 'name': 'David Z. Chen', 'inLanguage': 'en', 'publisher': {'@id': ORIGIN + '/#author'}},
            {'@type': 'BlogPosting' if post else ('Blog' if relative == 'blog/' else 'WebPage'), '@id': url + '#page', 'url': url, 'name': title, 'description': description, 'inLanguage': 'en', 'isPartOf': {'@id': ORIGIN + ('/blog/#page' if post else '/#website')}, 'author': {'@id': ORIGIN + '/#author'}},
        ]
        if post:
            graph[-1].update(headline=next(plain(n).strip() for n in doc if n.tag == 'h1'), datePublished=date, mainEntityOfPage=url)
            image = next((n.attrs['content'] for n in doc if n.tag == 'meta' and n.attrs.get('property') == 'og:image'), None)
            if image:
                graph[-1]['image'] = image
        tags = []
        if not any(n.tag == 'link' and n.attrs.get('rel') == 'canonical' for n in doc):
            tags.append(f'<link rel="canonical" href="{url}">')
        tags += [f'<link rel="alternate" type="text/markdown" href="/{md_path}" title="Markdown">', '<link rel="alternate" type="application/atom+xml" href="/blog/feed.xml" title="David Z. Chen’s blog">', '<link rel="alternate" type="text/plain" href="/llms.txt" title="AI content index">', '<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False).replace('<', '\\u003c') + '</script>']
        head = START + '\n' + '\n'.join(tags) + '\n' + END + '\n'
        outputs[path.relative_to(ROOT).as_posix()] = source.replace('</head>', head + '</head>')
        outputs[md_path] = f'# {title}\n\nSource: {url}\n\n' + (f'Published: {date}\n\n' if post else '') + content + '\n'
        pages.append({'url': url, 'markdown_url': ORIGIN + '/' + md_path, 'title': title, 'description': description, 'content': content, **({'date_published': date} if post else {})})

    sitemap = ET.Element('urlset', xmlns='http://www.sitemaps.org/schemas/sitemap/0.9')
    for page in pages:
        ET.SubElement(ET.SubElement(sitemap, 'url'), 'loc').text = page['url']
    outputs['sitemap.xml'] = '<?xml version="1.0" encoding="utf-8"?>\n' + ET.tostring(sitemap, encoding='unicode') + '\n'
    outputs['robots.txt'] = 'User-agent: *\nDisallow:\n\nSitemap: ' + ORIGIN + '/sitemap.xml\n'
    outputs['search-index.json'] = json.dumps({'version': 1, 'site': ORIGIN, 'pages': pages}, ensure_ascii=False, indent=2) + '\n'
    outputs['llms.txt'] = '# David Z. Chen\n\n> Software, side projects, and writing by David Z. Chen.\n\nCanonical HTML URLs are the sources for citations. Markdown copies are generated from published HTML. Field Notes is a dated public journal; its interactive account collection is not included in this text index.\n\n## Website and writing\n\n' + '\n'.join(f"- [{p['title']}]({p['markdown_url']}): {p['description']}" for p in pages) + '\n\n## Content feeds\n\n- [Full text](https://davidzlchen.com/llms-full.txt): All indexed page text in one file.\n- [Search index](https://davidzlchen.com/search-index.json): Titles, descriptions, URLs, and full page text for client-side search or ingestion.\n- [Sitemap](https://davidzlchen.com/sitemap.xml): Canonical public pages.\n- [Blog feed](https://davidzlchen.com/blog/feed.xml): Published posts in Atom format.\n'
    outputs['llms-full.txt'] = '\n\n---\n\n'.join(outputs[p['markdown_url'].removeprefix(ORIGIN + '/')] for p in pages).rstrip() + '\n'
    posts = [p for p in pages if 'date_published' in p]
    def timestamp(date):
        return datetime.fromisoformat(date).replace(tzinfo=ZoneInfo('America/New_York')).isoformat()
    ET.register_namespace('', 'http://www.w3.org/2005/Atom')
    def atom(tag):
        return '{http://www.w3.org/2005/Atom}' + tag
    feed = ET.Element(atom('feed'))
    for tag, value in [('id', ORIGIN + '/blog/'), ('title', 'David Z. Chen’s blog'), ('updated', timestamp(max(p['date_published'] for p in posts)))]:
        ET.SubElement(feed, atom(tag)).text = value
    ET.SubElement(feed, atom('link'), href=ORIGIN + '/blog/feed.xml', rel='self')
    ET.SubElement(feed, atom('link'), href=ORIGIN + '/blog/')
    ET.SubElement(ET.SubElement(feed, atom('author')), atom('name')).text = 'David Z. Chen'
    for p in sorted(posts, key=lambda p: p['date_published'], reverse=True):
        entry = ET.SubElement(feed, atom('entry'))
        for tag, value in [('id', p['url']), ('title', p['title']), ('published', timestamp(p['date_published'])), ('updated', timestamp(p['date_published'])), ('summary', p['description'])]:
            ET.SubElement(entry, atom(tag)).text = value
        ET.SubElement(entry, atom('link'), href=p['url'])
    outputs['blog/feed.xml'] = '<?xml version="1.0" encoding="utf-8"?>\n' + ET.tostring(feed, encoding='unicode') + '\n'
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail if generated files need refreshing')
    args = parser.parse_args()
    outputs = generate()
    stale = [name for name, text in outputs.items() if not (ROOT / name).exists() or (ROOT / name).read_text() != text]
    if args.check:
        if stale:
            parser.exit(1, 'Refresh discovery files: ' + ', '.join(stale) + '\n')
    else:
        for name, text in outputs.items():
            (ROOT / name).write_text(text)
    print(f'{len(outputs)} discovery files verified' if args.check else f'{len(outputs)} discovery files generated')

if __name__ == '__main__':
    main()
