from __future__ import annotations

import ipaddress
import json
import socket
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse


MAX_BODY_BYTES = 2 * 1024 * 1024
TIMEOUT_SECONDS = 90
MIN_TIMEOUT_SECONDS = 5
MAX_TIMEOUT_SECONDS = 90
HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
}


def _is_public_hostname(hostname: str) -> bool:
    try:
        addresses = socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
    except socket.gaierror:
        return False

    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            return False
    return True


def _validate_target_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme != "https":
        raise ValueError("targetUrl must use https")
    if not parsed.hostname or not _is_public_hostname(parsed.hostname):
        raise ValueError("targetUrl host is not allowed")
    if not parsed.path.rstrip("/").endswith("/chat/completions"):
        raise ValueError("targetUrl must point to chat/completions")
    return value


class LlmProxyHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self) -> None:
        if self.path != "/chat/completions":
            self._send_json(404, {"error": "not found"})
            return

        try:
            request_body = self._read_json_body()
            target_url = _validate_target_url(str(request_body.get("targetUrl", "")))
            api_key = str(request_body.get("apiKey", "")).strip()
            payload = request_body.get("payload")
            if not api_key or not isinstance(payload, dict):
                raise ValueError("apiKey and payload are required")
            timeout_seconds = self._read_timeout_seconds(request_body.get("timeoutSeconds"))
        except ValueError as exc:
            self._send_json(400, {"error": str(exc)})
            return

        outbound = urllib.request.Request(
            target_url,
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json, text/event-stream",
                "User-Agent": "DocMind-LLM-Proxy/1.0",
            },
        )

        try:
            with urllib.request.urlopen(outbound, timeout=timeout_seconds) as response:
                self.send_response(response.status)
                is_stream = payload.get("stream") is True
                if is_stream:
                    for key, value in response.headers.items():
                        if key.lower() in HOP_BY_HOP_HEADERS or key.lower() == "content-length":
                            continue
                        self.send_header(key, value)
                    self.send_header("Connection", "close")
                    self.end_headers()
                    while True:
                        chunk = response.read(8192)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        self.wfile.flush()
                    self.close_connection = True
                else:
                    body = response.read()
                    for key, value in response.headers.items():
                        if key.lower() in HOP_BY_HOP_HEADERS or key.lower() == "content-length":
                            continue
                        self.send_header(key, value)
                    self.send_header("Content-Length", str(len(body)))
                    self.send_header("Connection", "close")
                    self.end_headers()
                    self.wfile.write(body)
                    self.close_connection = True
        except urllib.error.HTTPError as exc:
            self.send_response(exc.code)
            for key, value in exc.headers.items():
                if key.lower() in HOP_BY_HOP_HEADERS or key.lower() == "content-length":
                    continue
                self.send_header(key, value)
            body = exc.read()
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(body)
            self.close_connection = True
        except (TimeoutError, socket.timeout):
            self._send_json(504, {"error": f"upstream request timed out after {timeout_seconds}s"})
        except urllib.error.URLError as exc:
            reason = getattr(exc, "reason", None)
            if isinstance(reason, (TimeoutError, socket.timeout)):
                self._send_json(504, {"error": f"upstream request timed out after {timeout_seconds}s"})
                return

            message = str(reason or exc) or exc.__class__.__name__
            self._send_json(502, {"error": f"upstream request failed: {message}"})
        except Exception as exc:
            message = str(exc) or exc.__class__.__name__
            self._send_json(502, {"error": f"upstream request failed: {message}"})

    def _read_json_body(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise ValueError("invalid content length") from exc
        if length <= 0 or length > MAX_BODY_BYTES:
            raise ValueError("invalid request body size")

        try:
            body = self.rfile.read(length)
            data = json.loads(body.decode("utf-8"))
        except Exception as exc:
            raise ValueError("invalid json body") from exc
        if not isinstance(data, dict):
            raise ValueError("json body must be an object")
        return data

    def _read_timeout_seconds(self, value: object) -> int:
        if value is None:
            return TIMEOUT_SECONDS
        try:
            timeout_seconds = int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("timeoutSeconds must be a number") from exc
        return max(MIN_TIMEOUT_SECONDS, min(MAX_TIMEOUT_SECONDS, timeout_seconds))

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)
        self.close_connection = True

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"{self.address_string()} - {fmt % args}", flush=True)


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 18080), LlmProxyHandler)
    print("LLM proxy listening on http://127.0.0.1:18080", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
