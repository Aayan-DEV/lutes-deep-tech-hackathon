"""Serves the tracker console on http://127.0.0.1:8765.

Run:  python3 dashboard/serve.py   (optional: a port number, e.g. python3 dashboard/serve.py 8766)

Why not plain `python3 -m http.server`: it queues only 5 connections, and the console loads about
15 files at once, so some were dropped ("connection reset") and the page loaded half-broken.
This one queues 64, serves files in parallel, and tells the browser not to cache, so a refresh
always gets the newest files.

POST /log?name=session-<time>.jsonl appends the body to dashboard/logs/<name>: the page's session
log (js/app/sessionlog.js) of everything the Arduino sent, every command, and what the page showed.
Only that name pattern, only into logs/, at most 2 MB per request, and the server only listens on
127.0.0.1.
"""
import functools
import http.server
import pathlib
import re
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent
LOGS = ROOT / "logs"
LOG_NAME = re.compile(r"^session-[0-9A-Za-z_-]{1,60}\.jsonl$")
MAX_BODY = 2 * 1024 * 1024


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 64
    daemon_threads = True


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        name = urllib.parse.parse_qs(url.query).get("name", [""])[0]
        size = int(self.headers.get("Content-Length") or 0)
        if url.path != "/log" or not LOG_NAME.match(name) or size > MAX_BODY:
            self.send_error(400, "bad log request")
            return
        body = self.rfile.read(size)
        LOGS.mkdir(exist_ok=True)
        with open(LOGS / name, "ab") as f:
            f.write(body)
        self.send_response(204)
        self.end_headers()

    def log_request(self, code="-", size="-"):  # keep the terminal quiet; errors still show
        if str(code).isdigit() and int(code) < 400:
            return
        super().log_request(code, size)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    try:
        httpd = Server(("127.0.0.1", port), functools.partial(Handler, directory=str(ROOT)))
    except OSError:
        sys.exit(f"Port {port} is already in use: another server (maybe an older one) is running.\n"
                 f"Stop it with Ctrl+C in its terminal, or see what holds it:  lsof -iTCP:{port} -sTCP:LISTEN\n"
                 f"Or use another port:  python3 dashboard/serve.py {port + 1}")
    with httpd:
        print(f"Tracker console: http://127.0.0.1:{port}  (Ctrl+C to stop)")
        httpd.serve_forever()
