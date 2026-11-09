#!/usr/bin/env bash
#
# RaffOptimizer build script
#
# Produces a flashable Magisk / KernelSU / APatch module zip from the single
# source tree in this repository. The CLI scripts live only in scripts/ and are
# copied into system/bin/ while staging, so there is exactly one source of truth.
#
# Usage:
#   ./build.sh                 # build dist/RaffOptimizer-<version>.zip
#   BUILD_DIR=... ./build.sh   # use a custom staging directory
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${BUILD_DIR:-${ROOT_DIR}/build}"
DIST_DIR="${DIST_DIR:-${ROOT_DIR}/dist}"
STAGE_DIR="${BUILD_DIR}/module"

# ---------------------------------------------------------------------------
# Read and validate module metadata
# ---------------------------------------------------------------------------
prop() {
  sed -n "s/^$1=//p" "${ROOT_DIR}/module.prop" | tr -d '\r' | head -n 1
}

MODULE_ID="$(prop id)"
VERSION="$(prop version)"
VERSION_CODE="$(prop versionCode)"

if [ -z "${MODULE_ID}" ] || [ -z "${VERSION}" ] || [ -z "${VERSION_CODE}" ]; then
  echo "error: module.prop must define id, version and versionCode" >&2
  exit 1
fi

if ! [[ "${VERSION_CODE}" =~ ^[0-9]+$ ]]; then
  echo "error: versionCode must be an integer (got '${VERSION_CODE}')" >&2
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "error: 'zip' is required to build the module" >&2
  exit 1
fi

ZIP_NAME="${MODULE_ID}-${VERSION}.zip"
OUTPUT="${DIST_DIR}/${ZIP_NAME}"

# Keep line endings away from the packaged shell scripts, no matter what the
# host checkout used.
if grep -rIl $'\r' "${ROOT_DIR}/scripts" "${ROOT_DIR}/cleaner" \
    "${ROOT_DIR}"/*.sh "${ROOT_DIR}/webroot/cgi-bin" >/dev/null 2>&1; then
  echo "error: CRLF line endings found in shell scripts; convert them to LF" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Stage a clean module tree
# ---------------------------------------------------------------------------
rm -rf "${STAGE_DIR}" "${OUTPUT}"
mkdir -p "${STAGE_DIR}" "${DIST_DIR}"

echo "==> Building ${MODULE_ID} ${VERSION} (versionCode ${VERSION_CODE})"

# Module metadata + installer files
install -m 0644 "${ROOT_DIR}/module.prop" "${STAGE_DIR}/module.prop"
install -m 0644 "${ROOT_DIR}/system.prop" "${STAGE_DIR}/system.prop"
install -m 0644 "${ROOT_DIR}/LICENSE" "${STAGE_DIR}/LICENSE"
install -m 0755 "${ROOT_DIR}/customize.sh" "${STAGE_DIR}/customize.sh"
install -m 0755 "${ROOT_DIR}/service.sh" "${STAGE_DIR}/service.sh"
install -m 0755 "${ROOT_DIR}/action.sh" "${STAGE_DIR}/action.sh"
install -m 0755 "${ROOT_DIR}/uninstall.sh" "${STAGE_DIR}/uninstall.sh"
cp -R "${ROOT_DIR}/META-INF" "${STAGE_DIR}/META-INF"

# WebUI and bundled native payload
cp -R "${ROOT_DIR}/webroot" "${STAGE_DIR}/webroot"
mkdir -p "${STAGE_DIR}/system"
cp -R "${ROOT_DIR}/system/priv-app" "${STAGE_DIR}/system/priv-app"
cp -R "${ROOT_DIR}/system/xbin" "${STAGE_DIR}/system/xbin"

# Cache cleaner service (copied to /data/adb/raffoptimizer/cleaner on install)
mkdir -p "${STAGE_DIR}/cleaner"
cp -R "${ROOT_DIR}/cleaner/." "${STAGE_DIR}/cleaner/"

# Single source of truth: scripts/ -> system/bin/
mkdir -p "${STAGE_DIR}/system/bin"
for script in raff raff-debloat raff-flush raff-freeze raff-webui cleaner; do
  if [ ! -f "${ROOT_DIR}/scripts/${script}" ]; then
    echo "error: missing source script scripts/${script}" >&2
    exit 1
  fi
  install -m 0755 "${ROOT_DIR}/scripts/${script}" "${STAGE_DIR}/system/bin/${script}"
done

# ---------------------------------------------------------------------------
# Normalise permissions inside the zip
# ---------------------------------------------------------------------------
find "${STAGE_DIR}" -type d -exec chmod 0755 {} +
find "${STAGE_DIR}" -type f -exec chmod 0644 {} +

chmod 0755 \
  "${STAGE_DIR}/customize.sh" \
  "${STAGE_DIR}/service.sh" \
  "${STAGE_DIR}/action.sh" \
  "${STAGE_DIR}/uninstall.sh" \
  "${STAGE_DIR}/META-INF/com/google/android/update-binary" \
  "${STAGE_DIR}/webroot/cgi-bin/api.sh"
chmod 0755 "${STAGE_DIR}/system/bin/"*
chmod 0755 "${STAGE_DIR}/system/xbin/"*
chmod 0755 "${STAGE_DIR}/cleaner/"*

# ---------------------------------------------------------------------------
# Package and verify
# ---------------------------------------------------------------------------
(
  cd "${STAGE_DIR}"
  zip -r -9 -X "${OUTPUT}" . \
    -x '.git/*' \
    -x 'build/*' \
    -x 'dist/*' \
    -x '*.zip' >/dev/null
)

for required in \
  module.prop \
  customize.sh \
  service.sh \
  action.sh \
  system/bin/raff \
  system/bin/cleaner \
  system/bin/raff-flush \
  cleaner/cleaner.service \
  webroot/index.html \
  webroot/cgi-bin/api.sh; do
  if ! unzip -Z1 "${OUTPUT}" | grep -qx "${required}"; then
    echo "error: packaged module is missing ${required}" >&2
    exit 1
  fi
done

echo "==> Created ${OUTPUT}"
echo "    size: $(du -h "${OUTPUT}" | cut -f1)"
if command -v sha256sum >/dev/null 2>&1; then
  echo "    sha256: $(sha256sum "${OUTPUT}" | cut -d' ' -f1)"
fi
