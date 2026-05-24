#!/usr/bin/env python

# The MIT License (MIT)
#
# Copyright (c) 2018 Sunaina Pai
#      modified 2020 David Norton
#
# Permission is hereby granted, free of charge, to any person obtaining
# a copy of this software and associated documentation files (the
# "Software"), to deal in the Software without restriction, including
# without limitation the rights to use, copy, modify, merge, publish,
# distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so, subject to
# the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
# IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
# CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
# TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
# SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


"""Make static website/blog with Python."""


import os
import shutil
import re
import glob
import sys
import json
import datetime
import argparse
import time
import webbrowser
import http.server
import socketserver
import threading

class DocsHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='docs', **kwargs)

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def fread(filename):
    """Read file and close the file."""
    with open(filename, 'r') as f:
        return f.read()

#color codes
RED = '\033[91m'
RESET = '\033[0m'


def fwrite(filename, text):
    """Write content to file and close the file."""
    basedir = os.path.dirname(filename)
    if not os.path.isdir(basedir):
        os.makedirs(basedir)

    with open(filename, 'w') as f:
        f.write(text)


def log(msg, *args):
    """Log message with specified arguments."""
    sys.stderr.write(msg.format(*args) + '\n')


def truncate(text, words=25):
    """Remove tags and truncate text to the specified number of words."""
    return ' '.join(re.sub('(?s)<.*?>', ' ', text).split()[:words])


def read_headers(text):
    """Parse headers in text and yield (key, value, end-index) tuples."""
    for match in re.finditer(r'\s*<!--\s*(.+?)\s*:\s*(.+?)\s*-->\s*|.+', text):
        if not match.group(1):
            break
        yield match.group(1), match.group(2), match.end()


def rfc_2822_format(date_str):
    """Convert yyyy-mm-dd date string to RFC 2822 format date string."""
    d = datetime.datetime.strptime(date_str, '%Y-%m-%d')
    return d.strftime('%a, %d %b %Y %H:%M:%S +0000')


def read_content(filename):
    """Read content and metadata from file into a dictionary."""
    # Read file content.
    text = fread(filename)

    # Read metadata and save it in a dictionary.
    date_slug = os.path.basename(filename).split('.')[0]
    match = re.search(r'^(?:(\d\d\d\d-\d\d-\d\d)-)?(.+)$', date_slug)
    content = {
        'date': match.group(1) or '1970-01-01',
        'slug': match.group(2),
    }

    # Read headers.
    end = 0
    for key, val, end in read_headers(text):
        content[key] = val

    # Separate content from headers.
    text = text[end:]

    # Convert Markdown content to HTML.
    if filename.endswith(('.md', '.mkd', '.mkdn', '.mdown', '.markdown')):
        try:
            import commonmark
            text = commonmark.commonmark(text)
        except ImportError as e:
            log('WARNING: Cannot render Markdown in {}: {}', filename, str(e))

    # Update the dictionary with content and RFC 2822 date.
    content.update({
        'content': text,
        'rfc_2822_date': rfc_2822_format(content['date'])
    })

    return content


def render(template, **params):
    """Replace placeholders in template with values from params."""
    return re.sub(r'{{\s*([^}\s]+)\s*}}',
                  lambda match: str(params.get(match.group(1), match.group(0))),
                  template)


def make_pages(src, dst, layout, **params):
    """Generate pages from page content."""
    items = []

    for src_path in glob.glob(src):
        content = read_content(src_path)

        page_params = dict(params, **content)

        # Populate placeholders in content if content-rendering is enabled.
        if page_params.get('render') == 'yes':
            rendered_content = render(page_params['content'], **page_params)
            page_params['content'] = rendered_content
            content['content'] = rendered_content

        items.append(content)

        dst_path = render(dst, **page_params)
        output = render(layout, **page_params)

        log('Rendering {} => {} ...', src_path, dst_path)
        fwrite(dst_path, output)

    return sorted(items, key=lambda x: x['date'], reverse=True)

def use_blog_item_as_home_page(blogitem, dst, layout, **params):
    page_params = dict(params, **blogitem)

    # Populate placeholders in content if content-rendering is enabled.
    if page_params.get('render') == 'yes':
        rendered_content = render(page_params['content'], **page_params)
        page_params['content'] = rendered_content
        blogitem['content'] = rendered_content

    dst_path = render(dst, **page_params)
    output = render(layout, **page_params)

    log('Rendering blog item as home page:  {} {}', blogitem['date'],blogitem['title'])
    fwrite(dst_path, output)

def make_list(posts, dst, list_layout, item_layout, **params):
    """Generate list page for a blog."""
    items = []
    for post in posts:
        item_params = dict(params, **post)
        item_params['summary'] = truncate(post['content'])
        item = render(item_layout, **item_params)
        items.append(item)

    params['content'] = ''.join(items)
    dst_path = render(dst, **params)
    output = render(list_layout, **params)

    log('Rendering list => {} ...', dst_path)
    fwrite(dst_path, output)

def source_mtime():
    """Return the latest mtime of all source inputs."""
    mtimes = []
    for src in ('content', 'layout', 'static', 'pics'):
        for root, _, files in os.walk(src):
            for f in files:
                mtimes.append(os.path.getmtime(os.path.join(root, f)))
    for f in ('params.json', 'makesite.py'):
        if os.path.isfile(f):
            mtimes.append(os.path.getmtime(f))
    return max(mtimes) if mtimes else 0

def delete_and_rebuild(cache_bust=False):
    # Create a new docs directory from scratch.
    if os.path.isdir('docs'):
        shutil.rmtree('docs')
    shutil.copytree('static', 'docs')
    shutil.copytree('pics', 'docs/pics')

    # Default parameters.
    params = {
        'base_path': '',
        'subtitle': 'A blog about learning, teaching, and intuition.',
        'author': 'David Norton',
        'site_url': 'http://localhost:4000',
        'current_year': datetime.datetime.now().year,
        'css_cache_bust': f'?v={int(time.time())}' if cache_bust else '',
    }

    # If params.json exists, load it.
    if os.path.isfile('params.json'):
        params.update(json.loads(fread('params.json')))

    # Load layouts.
    page_layout = fread('layout/page.html')
    post_layout = fread('layout/post.html')
    list_layout = fread('layout/list.html')
    item_layout = fread('layout/item.html')
    feed_xml = fread('layout/feed.xml')
    item_xml = fread('layout/item.xml')

    # Combine layouts to form final layouts.
    post_layout = render(page_layout, content=post_layout)
    list_layout = render(page_layout, content=list_layout)

    # Create site pages.
    make_pages('content/[!_]*.html', 'docs/{{ slug }}/index.html',
               page_layout, **params)

    # Create blogs.
    blog_posts = make_pages('content/blog/*.md',
                            'docs/blog/{{ slug }}/index.html',
                            post_layout, blog='blog', **params)

    # Create blog list pages.
    make_list(blog_posts, 'docs/blog/index.html',
              list_layout, item_layout, blog='blog', title='Blog', **params)

    #create index page as just the most recent blog post
    use_blog_item_as_home_page(blog_posts[0], 'docs/index.html',
               post_layout, blog='blog', **params)

    # Create RSS feeds.
    make_list(blog_posts, 'docs/blog/rss.xml',
              feed_xml, item_xml, blog='blog', title='Blog', **params)
    # make_list(news_posts, 'docs/news/rss.xml',
              # feed_xml, item_xml, blog='news', title='News', **params)

#This is a fairly brittle check, I guess, but it does work
def check_links(docs_dir='docs'):
    from html.parser import HTMLParser

    class LinkParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.links = []
        def handle_starttag(self, tag, attrs):
            if tag == 'a':
                self.links.extend(v for k, v in attrs if k == 'href')

    broken = []
    for root, _, files in os.walk(docs_dir):
        for f in files:
            if not f.endswith('.html'):
                continue
            path = os.path.join(root, f)
            base = os.path.dirname(path)
            parser = LinkParser()
            parser.feed(fread(path))
            for link in set(parser.links):
                if '://' in link or link.startswith(('#', 'mailto:', 'tel:', 'data:', 'javascript:')):
                    continue
                target = os.path.join(docs_dir, link.lstrip('/')) if link.startswith('/') else os.path.normpath(os.path.join(base, link))
                if not any(os.path.exists(t) for t in (target, target + '.html', os.path.join(target, 'index.html'))):
                    broken.append((path, link))
    for path, link in broken:
        log('{}BROKEN LINK: {} -> {}{}', RED, path, link, RESET)
    return broken

def main():
    port = 4000
    parser = argparse.ArgumentParser(description='Builds website from the markdown files in the `content/` folder')
    parser.add_argument('--monitor-for-changes', action='store_true', help='Monitors for changes and rebuilds website for rapid prototyping.')
    parser.add_argument('--open', action='store_true', help='Opens site in browser; new tab if content changes')
    parser.add_argument('--serve', action='store_true', help=f'Serve docs/ folder on port {port}. Not for production use.')
    parser.add_argument('--check', action='store_true', help='Check internal blog post links for typos')
    args = parser.parse_args()

    cache_bust = bool(args.monitor_for_changes)

    url = f'http://localhost:{port}'

    delete_and_rebuild(cache_bust=cache_bust)

    if args.check:
        check_links()

    if args.serve:
        httpd = ReusableTCPServer(('', port), DocsHandler)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        log(f'Serving on {url}')

    if args.open:
       webbrowser.open(url, new=2)

    if args.monitor_for_changes and args.serve:
        last_modified_time = source_mtime()
        while True:
            time.sleep(1)
            new_last_modified_time = source_mtime()
            if last_modified_time != new_last_modified_time:
                last_modified_time = new_last_modified_time
                log('Changes detected, rebuilding...')
                delete_and_rebuild(cache_bust=cache_bust)
                if args.check:
                    check_links()
                if args.open:
                   webbrowser.open(url, new=2)

    # if we wanted to serve but not monitor for file changes,
    # we need to spin to hold the daemon server open
    if (not args.monitor_for_changes) and args.serve:
            # Keep main thread alive so the daemon server thread survives
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                pass #user requested end, we hit end of program and daemon server thread dies

if __name__ == '__main__':
    main()
