"""Servidor de teste com busca de vídeo por HTTP Range. Python 3, sem dependências."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
import argparse, re

class Handler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.remaining = None
        path = Path(self.translate_path(self.path))
        requested = self.headers.get('Range')
        if path.suffix.lower() != '.mp4' or not path.is_file():
            return super().send_head()
        total = path.stat().st_size
        start, end = 0, total - 1
        if requested:
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', requested.strip())
            if not match or not any(match.groups()):
                self.send_error(416); return None
            a, b = match.groups()
            if a:
                start = int(a); end = min(int(b), end) if b else end
            else:
                start = max(0, total - int(b))
            if start > end or start >= total:
                self.send_response(416); self.send_header('Content-Range', f'bytes */{total}'); self.end_headers(); return None
        handle = path.open('rb'); handle.seek(start)
        self.remaining = end - start + 1
        self.send_response(206 if requested else 200)
        self.send_header('Content-Type', 'video/mp4')
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(self.remaining))
        if requested: self.send_header('Content-Range', f'bytes {start}-{end}/{total}')
        self.end_headers()
        return handle

    def copyfile(self, source, output):
        if self.remaining is None: return super().copyfile(source, output)
        try:
            while self.remaining:
                data = source.read(min(self.remaining, 128 * 1024))
                if not data: break
                output.write(data); self.remaining -= len(data)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Normal when the player switches to a different video range.

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--bind', default='127.0.0.1')
    args = parser.parse_args()
    handler = partial(Handler, directory=str(Path(__file__).resolve().parent))
    print(f'Pantanal: http://{args.bind}:{args.port}', flush=True)
    ThreadingHTTPServer((args.bind, args.port), handler).serve_forever()
