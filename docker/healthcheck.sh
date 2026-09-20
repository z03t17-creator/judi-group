#!/bin/sh
set -eu
PORT="${PORT:-8080}"
curl -fsS "http://127.0.0.1:${PORT}/up" >/dev/null
