#!/bin/bash

echo "Building and copying SPA"


npm --prefix ../../app install
npm --prefix ../../app run build

cp ../../app/dist/spa ../caddy/spa