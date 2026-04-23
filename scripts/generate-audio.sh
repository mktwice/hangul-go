#!/usr/bin/env bash
# Generate pre-recorded Korean audio files for every Hangul character in
# src/data/hangul.ts, using the macOS `say` command with the premium Yuna voice.
#
# Output: public/audio/hangul/<char>.m4a   (AAC in MP4 container)
#
# Note: afconvert on macOS cannot encode MP3 — no lame ships with the OS — so
# we produce .m4a instead. AAC has identical browser coverage to MP3 (Safari,
# iOS Safari, Chrome, Firefox, Edge) and usually better compression.
#
# Usage:  bash scripts/generate-audio.sh
# Requires: macOS with "Yuna (Premium)" voice installed (System Settings →
# Accessibility → Spoken Content → System Voice → Manage Voices).

set -euo pipefail

VOICE="Yuna (Premium)"
OUT_DIR="public/audio/hangul"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# Must match src/data/hangul.ts — 40 characters in set order.
CHARS=(
  # Basic vowels I
  'ㅏ' 'ㅓ' 'ㅗ' 'ㅜ' 'ㅡ'
  # Basic vowels II
  'ㅣ' 'ㅐ' 'ㅔ' 'ㅑ' 'ㅕ'
  # Y-vowels
  'ㅛ' 'ㅠ' 'ㅒ' 'ㅖ'
  # Consonants I
  'ㄱ' 'ㄴ' 'ㄷ' 'ㄹ' 'ㅁ'
  # Consonants II
  'ㅂ' 'ㅅ' 'ㅇ' 'ㅈ' 'ㅊ'
  # Consonants III
  'ㅋ' 'ㅌ' 'ㅍ' 'ㅎ'
  # Double consonants
  'ㄲ' 'ㄸ' 'ㅃ' 'ㅆ' 'ㅉ'
  # Compound vowels I
  'ㅘ' 'ㅙ' 'ㅚ' 'ㅝ' 'ㅞ'
  # Compound vowels II
  'ㅟ' 'ㅢ'
)

# Sanity-check the voice is installed.
if ! say -v '?' | grep -q "^Yuna (Premium)"; then
  echo "Error: '$VOICE' is not installed." >&2
  echo "Install via System Settings → Accessibility → Spoken Content → Manage Voices." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "Generating ${#CHARS[@]} audio files with voice: $VOICE"
echo "Output: $OUT_DIR/"
echo

for ch in "${CHARS[@]}"; do
  aiff="$TMP_DIR/$ch.aiff"
  out="$OUT_DIR/$ch.m4a"

  # Record using `say`'s default format (AIFF-C).
  say -v "$VOICE" -o "$aiff" "$ch"

  # Convert to AAC @ 64kbps mono. Quality is indistinguishable from source
  # for a one-second clip and cuts file size by ~80% vs AIFF.
  afconvert \
    -f m4af \
    -d aac \
    -b 64000 \
    -c 1 \
    -q 127 \
    "$aiff" "$out" >/dev/null

  printf "  %s -> %s  (%s)\n" "$ch" "$out" "$(du -h "$out" | cut -f1)"
done

echo
echo "Done. Total size:"
du -sh "$OUT_DIR"
