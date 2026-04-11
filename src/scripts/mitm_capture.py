import re
import os
import json
import hashlib
from datetime import datetime
from mitmproxy import http

# Configure your regex pattern and output directory here
HOST_PATTERN = re.compile(r"/catalog/officialPlaylists/([^?]+)(?:\?.*)?$")
OUTPUT_DIR = "D:\\itzst\\Documents\\Projects\\Compilation Website\\compilation-website-server\\mitmed\\raw\\officialPlaylists"


class ResponseCapture:
    def response(self, flow: http.HTTPFlow) -> None:
        host = flow.request.pretty_host
        if host != "api.m.nintendo.com":
            return

        path = flow.request.path
        match = HOST_PATTERN.search(path)
        if not match:
            return

        try:
            body = json.loads(flow.response.content)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return

        if body.get("type") != "SINGLE_GAME_ALL":
            return

        playlist_id = match.group(1)
        self._save_response(flow, playlist_id)

    def _save_response(self, flow: http.HTTPFlow, playlist_id: str) -> None:
        request = flow.request
        response = flow.response

        # Build a unique filename from method + host + path
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = f"{playlist_id}"

        # Save metadata as JSON
        meta = {
            "timestamp": timestamp,
            "method": request.method,
            "url": request.pretty_url,
            "host": request.pretty_host,
            "path": request.path,
            "query": dict(request.query),
            "status_code": response.status_code,
            "response_headers": dict(response.headers),
            "request_headers": dict(request.headers),
        }

        meta_path = os.path.join(OUTPUT_DIR, f"{base_name}.meta.json")
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=2)

        # Save raw response body
        body_path = os.path.join(OUTPUT_DIR, f"{base_name}.body")
        content_type = response.headers.get("content-type", "")

        if "json" in content_type:
            body_path += ".json"
        elif "html" in content_type:
            body_path += ".html"
        elif "xml" in content_type:
            body_path += ".xml"

        with open(body_path, "wb") as f:
            f.write(response.content)

        print(f"[CAPTURED] {request.method} {request.pretty_url} -> {base_name}")


addons = [ResponseCapture()]
