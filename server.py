"""Zero-dependency static development server. Run: python server.py"""
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, parse_qs, urlunsplit

class HomeHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        original = self.path
        url = urlsplit(original)
        if url.path in ('/', '/portal/index.html'):
            query = parse_qs(url.query, keep_blank_values=True)
            flight = query.get('embed') == ['joyflock'] or 'room' in query
            game = query.get('game', [''])[0]
            page = '/portal/native-flight.html' if game == 'flight' else '/portal/native-table.html' if game in ('pool','four','gomoku','chess','xo','cards','snooker','bubbles') else '/portal/index.html'
            self.path = urlunsplit(('', '', '/index.html' if url.path == '/' and (query.get('embed') == ['joyflock'] or flight and page == '/portal/index.html') else page, url.query, ''))
        try:
            return super().send_head()
        finally:
            self.path = original

os.chdir(Path(__file__).parent / 'dist')
print('JoyFlock: http://localhost:8080', flush=True)
ThreadingHTTPServer(('127.0.0.1', 8080), HomeHandler).serve_forever()
