#!/usr/bin/env python3
"""HNR opening music: public read, loopback-only write, no database or analytics."""
import argparse
import hashlib
import ipaddress
import json
import mimetypes
import os
from pathlib import Path
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import tempfile
import threading
import time
from urllib.parse import urlsplit, unquote

MAX_FILE = 32 * 1024 * 1024
ASSET = re.compile(r'^[a-f0-9]{64}\.(?:mp3|wav|ogg)$')
TYPES = {'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg'}
LOCK = threading.Lock()

class MusicHTTPServer(ThreadingHTTPServer):
    request_queue_size = 128

def loopback(host):
    if host == 'localhost':
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False

def create_handler(root, data_dir, port):
    root, data_dir = root.resolve(), data_dir.resolve()
    assets = data_dir / 'assets'
    assets.mkdir(parents=True, exist_ok=True)
    state_path = data_dir / 'settings.json'

    def settings():
        try:
            state = json.loads(state_path.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            state = {'enabled': False, 'asset': None, 'volume': .28, 'version': 'initial'}
        name = state.get('asset')
        valid = isinstance(name, str) and ASSET.fullmatch(name) and (assets / name).is_file()
        return {'enabled': bool(state.get('enabled')) and bool(valid), 'asset': name if valid else None,
                'url': '/music-assets/' + name if valid else None,
                'volume': min(1, max(0, float(state.get('volume', .28)))), 'version': str(state.get('version', 'initial'))}

    class Handler(SimpleHTTPRequestHandler):
        server_version = 'HNRMusic/1'
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(root), **kwargs)

        def log_message(self, format, *args):
            # No participant access log or visit counter.
            pass

        def end_headers(self):
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'same-origin')
            super().end_headers()

        def reply(self, status, payload):
            body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)

        def path_only(self):
            return unquote(urlsplit(self.path).path)

        def admin_allowed(self):
            try:
                host = urlsplit('http://' + self.headers.get('Host', ''))
                origin = urlsplit(self.headers.get('Origin', ''))
                return (loopback(self.client_address[0]) and loopback(host.hostname or '')
                        and host.port == port and origin.scheme == 'http'
                        and loopback(origin.hostname or '') and origin.port == port
                        and origin.netloc == host.netloc and not origin.path
                        and self.headers.get('X-HNR-Admin') == '1')
            except ValueError:
                return False

        def do_GET(self):
            path = self.path_only()
            if path == '/api/music':
                with LOCK:
                    self.reply(200, settings())
                return
            if path.startswith('/api/'):
                self.reply(404, {'error': 'not_found'})
                return
            if path.startswith('/music-assets/'):
                name = path[len('/music-assets/'):]
                if not ASSET.fullmatch(name):
                    self.reply(404, {'error': 'not_found'})
                    return
                target = assets / name
                if not target.is_file() or target.is_symlink():
                    self.reply(404, {'error': 'not_found'})
                    return
                self.send_response(200)
                self.send_header('Content-Type', TYPES[target.suffix[1:]])
                self.send_header('Content-Length', str(target.stat().st_size))
                self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
                self.end_headers()
                if self.command != 'HEAD':
                    with target.open('rb') as src:
                        while chunk := src.read(65536):
                            self.wfile.write(chunk)
                return
            # Prevent directory listings and hidden/private source files on the shared LAN server.
            parts = Path(path.replace('\\', '/')).parts
            if any(p.startswith('.') or p.lower() in ('auth.json', 'tools', 'node_modules') for p in parts):
                self.reply(403, {'error': 'forbidden'})
                return
            target = Path(self.translate_path(path)).resolve()
            if target != root and root not in target.parents:
                self.reply(403, {'error': 'forbidden'})
                return
            super().do_GET()

        def do_HEAD(self):
            self.do_GET()

        def list_directory(self, path):
            self.reply(403, {'error': 'forbidden'})
            return None

        def do_OPTIONS(self):
            self.reply(403, {'error': 'local_admin_only'})

        def body(self, limit):
            if self.headers.get('Transfer-Encoding'):
                self.reply(400, {'error': 'content_length_required'})
                return None
            try:
                length = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                length = -1
            if length <= 0 or length > limit:
                self.reply(413 if length > limit else 400, {'error': 'invalid_size'})
                return None
            self.connection.settimeout(20)
            try:
                body = self.rfile.read(length)
            except (OSError, TimeoutError):
                self.reply(408, {'error': 'upload_timeout'})
                return None
            if len(body) != length:
                self.reply(400, {'error': 'incomplete_upload'})
                return None
            return body

        def do_POST(self):
            path = self.path_only()
            if path not in ('/api/music/upload', '/api/music/config'):
                self.reply(404, {'error': 'not_found'})
                return
            if not self.admin_allowed():
                self.reply(403, {'error': 'local_admin_only'})
                return
            raw = self.body(MAX_FILE if path.endswith('/upload') else 4096)
            if raw is None:
                return
            if path.endswith('/upload'):
                mime = self.headers.get('Content-Type', '').split(';')[0].lower()
                ext = ('wav' if len(raw) >= 44 and raw[:4] == b'RIFF' and raw[8:12] == b'WAVE'
                       else 'ogg' if len(raw) >= 28 and raw[:4] == b'OggS'
                       else 'mp3' if len(raw) >= 16 and (raw[:3] == b'ID3' or (raw[0] == 255 and raw[1] & 224 == 224))
                       else None)
                aliases = {'audio/x-wav': 'audio/wav', 'application/ogg': 'audio/ogg'}
                if not ext or aliases.get(mime, mime) != TYPES[ext]:
                    self.reply(415, {'error': 'invalid_audio'})
                    return
                name = hashlib.sha256(raw).hexdigest() + '.' + ext
                with LOCK:
                    target = assets / name
                    if not target.exists():
                        temporary = assets / (name + '.tmp')
                        temporary.write_bytes(raw)
                        os.replace(temporary, target)
                self.reply(200, {'asset': name, 'url': '/music-assets/' + name})
                return
            try:
                cfg = json.loads(raw)
                if type(cfg.get('enabled')) is not bool or type(cfg.get('volume')) not in (float, int):
                    raise ValueError()
                volume = cfg['volume']
                if not 0 <= volume <= 1:
                    raise ValueError()
                name = cfg.get('asset')
                if name is not None and (not isinstance(name, str) or not ASSET.fullmatch(name) or not (assets / name).is_file()):
                    raise ValueError()
                if cfg['enabled'] and not name:
                    raise ValueError()
                with LOCK:
                    state = {'enabled': cfg['enabled'], 'asset': name, 'volume': volume, 'version': str(time.time_ns())}
                    temporary = data_dir / 'settings.tmp'
                    temporary.write_text(json.dumps(state), encoding='utf-8')
                    os.replace(temporary, state_path)
                    result = settings()
                self.reply(200, result)
            except (ValueError, TypeError, AttributeError):
                self.reply(400, {'error': 'invalid_settings'})

    return Handler

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument('--data-dir', type=Path, default=Path(tempfile.gettempdir()) / 'hnr-opening-music')
    parser.add_argument('--bind', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=7121)
    args = parser.parse_args()
    if not 7100 <= args.port <= 7199:
        parser.error('Use a Codex local port from 7100 to 7199.')
    root, data = args.directory.resolve(), args.data_dir.resolve()
    if not root.is_dir() or root == data or root in data.parents:
        parser.error('Music data must be outside the website repository.')
    server = MusicHTTPServer((args.bind, args.port), create_handler(root, data, args.port))
    print(f'HNR music server: http://127.0.0.1:{args.port}/music-admin.html', flush=True)
    print('Only the server computer can change music. Participant access is read-only.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
