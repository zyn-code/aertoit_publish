#!/bin/sh
# =====================================================================
# Regenerates database/aertoit-dump.sql from the running database.
#
#     sh database/export-db.sh
#
# Rows of quote_requests and job_applications are deliberately omitted:
# they hold form submissions, which in production is customer PII. Their
# structure is still exported so a restore yields empty, ready tables.
# =====================================================================
set -e

MYSQLDUMP="${MYSQLDUMP:-/c/xampp/mysql/bin/mysqldump.exe}"
DB="${DB_NAME:-aertoit}"
USER="${DB_USER:-root}"
OUT="$(dirname "$0")/aertoit-dump.sql"
TMP="$(mktemp -d)"

COMMON="-u $USER --default-character-set=utf8mb4 --skip-dump-date --single-transaction --routines --add-drop-table"

# shellcheck disable=SC2086
"$MYSQLDUMP" $COMMON --no-data "$DB" > "$TMP/structure.sql"
# shellcheck disable=SC2086
"$MYSQLDUMP" $COMMON --no-create-info \
  --ignore-table="$DB.quote_requests" \
  --ignore-table="$DB.job_applications" \
  "$DB" > "$TMP/data.sql"

{
  cat <<'HEADER'
-- =====================================================================
-- Aertoit Couverture — full database export
--
-- Restore with:
--     mysql -u root < database/aertoit-dump.sql
--
-- Structure for every table; rows for content tables only. Submissions
-- (quote_requests, job_applications) are excluded — customer PII does not
-- belong in a repository. Their tables restore empty and ready.
--
-- Regenerate with: database/export-db.sh
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `aertoit`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `aertoit`;

HEADER
  cat "$TMP/structure.sql"
  printf '\n-- ---------------------------------------------------------------------\n'
  printf -- '-- Content data\n'
  printf -- '-- ---------------------------------------------------------------------\n'
  cat "$TMP/data.sql"
  printf '\nSET FOREIGN_KEY_CHECKS = 1;\n'
} > "$OUT"

rm -rf "$TMP"

# Fail loudly rather than silently shipping PII.
if grep -q 'INSERT INTO `quote_requests`\|INSERT INTO `job_applications`' "$OUT"; then
  echo "ERROR: submission rows leaked into the dump" >&2
  exit 1
fi

echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
