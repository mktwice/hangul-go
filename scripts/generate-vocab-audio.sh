#!/usr/bin/env bash
# Generate pre-recorded Korean audio for every vocab word in
# src/data/vocabulary.ts using macOS `say` with the premium Yuna voice.
#
# Output: public/audio/vocab/<word>.m4a   (AAC in MP4 container)
#
# Idempotent: skips words whose .m4a already exists, so re-running after
# adding new words to vocabulary.ts only generates the new ones.
#
# Usage:  bash scripts/generate-vocab-audio.sh
# Requires: macOS with "Yuna (Premium)" voice installed (System Settings →
# Accessibility → Spoken Content → System Voice → Manage Voices).

set -euo pipefail

VOICE="Yuna (Premium)"
# 100 wpm — about 57% of `say`'s default 175. Multi-syllable words still
# read naturally at this pace, but slow enough that learners can hear each
# syllable. A bit faster than the 80 used for single-syllable Hangul since
# 80 across longer words would feel painfully drawn out.
RATE=100
SRC="src/data/vocabulary.ts"
OUT_DIR="public/audio/vocab"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if ! say -v '?' | grep -q "^Yuna (Premium)"; then
  echo "Error: '$VOICE' is not installed." >&2
  echo "Install via System Settings → Accessibility → Spoken Content → Manage Voices." >&2
  exit 1
fi

if [[ ! -f "$SRC" ]]; then
  echo "Error: $SRC not found. Run from the repo root." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

# Each entry line in vocabulary.ts begins with `{ korean: 'X', ...`. Splitting
# on single quotes makes field 2 the Korean value. Lines without `korean:`
# (comments, blank lines, header) are skipped by the awk pattern.
WORDS=()
while IFS= read -r word; do
  [[ -n "$word" ]] && WORDS+=("$word")
done < <(awk -F"'" '/korean:/ { print $2 }' "$SRC")

if [[ ${#WORDS[@]} -eq 0 ]]; then
  echo "Error: no words parsed from $SRC." >&2
  exit 1
fi

echo "Found ${#WORDS[@]} words in $SRC"
echo "Output: $OUT_DIR/"
echo

generated=0
skipped=0

for word in "${WORDS[@]}"; do
  out="$OUT_DIR/$word.m4a"

  if [[ -f "$out" ]]; then
    skipped=$((skipped + 1))
    continue
  fi

  aiff="$TMP_DIR/$word.aiff"
  say -v "$VOICE" -r "$RATE" -o "$aiff" "$word"

  # AAC @ 64kbps mono — same encoding as the Hangul clips.
  afconvert \
    -f m4af \
    -d aac \
    -b 64000 \
    -c 1 \
    -q 127 \
    "$aiff" "$out" >/dev/null

  printf "  %s -> %s  (%s)\n" "$word" "$out" "$(du -h "$out" | cut -f1)"
  generated=$((generated + 1))
done

echo
echo "Generated: $generated   Skipped (already existed): $skipped"
echo
file_count=$(find "$OUT_DIR" -maxdepth 1 -type f -name '*.m4a' | wc -l | tr -d ' ')
echo "Files in $OUT_DIR: $file_count"
echo "Total size:"
du -sh "$OUT_DIR"
