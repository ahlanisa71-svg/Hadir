#!/usr/bin/env bash
# Mengunduh face-api.js + model dari npm (butuh internet). Jalankan dari folder proyek.
set -euo pipefail
cd "$(dirname "$0")"
tmp=$(mktemp -d); (cd "$tmp" && npm init -y >/dev/null && npm i @vladmandic/face-api@1.7.15 >/dev/null)
src="$tmp/node_modules/@vladmandic/face-api"
mkdir -p vendor/models
cp "$src/dist/face-api.js" vendor/face-api.min.js
cp "$src"/model/tiny_face_detector_model* "$src"/model/face_landmark_68_tiny_model* "$src"/model/face_recognition_model* vendor/models/
ls -la vendor vendor/models
