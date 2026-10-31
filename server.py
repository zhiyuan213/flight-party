"""Zero-dependency static development server. Run: python server.py"""
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
os.chdir(Path(__file__).parent / 'dist')
print('Flight Party: http://localhost:8080', flush=True)
ThreadingHTTPServer(('127.0.0.1', 8080), SimpleHTTPRequestHandler).serve_forever()
