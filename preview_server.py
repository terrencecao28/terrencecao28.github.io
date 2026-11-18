#!/usr/bin/env python3
"""Local preview server. Every time a page loads, it first adds any new photos
from the photos/ folders, so you only need to refresh to see them."""
import http.server
import os
import subprocess
import sys
import threading

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

LOCK = threading.Lock()


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/content/galleries.json") or self.path.startswith("/content/home.json"):
            with LOCK:
                # Runs the current update_photos.py each time (never a stale copy).
                subprocess.run([sys.executable, os.path.join(ROOT, "update_photos.py"), "--quiet"])
        super().do_GET()

    def log_message(self, *args):
        pass


port = int(os.environ.get("PORT", "8765"))
print(f"Previewing your website at http://localhost:{port}")
http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
