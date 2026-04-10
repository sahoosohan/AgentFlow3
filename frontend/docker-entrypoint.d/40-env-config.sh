#!/bin/sh
set -eu

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__APP_CONFIG__ = {
  VITE_API_URL: "${VITE_API_URL:-/api}",
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL:-}",
  VITE_SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY:-}"
};
EOF
