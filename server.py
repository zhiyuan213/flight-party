"""Zero-dependency static development server. Run: python server.py"""
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, parse_qs, urlunsplit

class HomeHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        original = self.path
        url = urlsplit(original)
        if url.path == '/':
            query = parse_qs(url.query, keep_blank_values=True)
            flight = query.get('embed') == ['joyflock'] or 'room' in query
            self.path = urlunsplit(('', '', '/index.html' if flight else '/portal/index.html', url.query, ''))
        try:
            return super().send_head()
        finally:
            self.path = original

os.chdir(Path(__file__).parent / 'dist')
print('JoyFlock: http://localhost:8080', flush=True)
ThreadingHTTPServer(('127.0.0.1', 8080), HomeHandler).serve_forever()
