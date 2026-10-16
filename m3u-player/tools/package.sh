#!/bin/sh
# Stage only runtime files, then build the .ipk into dist/
set -e
cd "$(dirname "$0")/.."
rm -rf build dist && mkdir -p build dist
cp -r appinfo.json index.html manifest.json css js images build/
ares-package build -o dist
rm -rf build
