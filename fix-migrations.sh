#!/usr/bin/env bash
# Apply pending VentureMate migrations to the local dev DB and fix the
# divergent investors table (created with an old schema: firm/email/notes).
set -euo pipefail

cd /home/edspike/sourcecode/vmsourcecode
set -a; . vm-backend/.env; set +a
export PGPASSWORD="$DB_PASSWORD"
PSQL="psql -X -q -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

echo "== Fix investors table (old schema, empty) =="
$PSQL -c "DROP TABLE IF EXISTS investors;"
$PSQL -c "DELETE FROM schema_migrations WHERE version='000011_create_investors';"

echo "== Apply pending migrations in order =="
cd vm-backend/migrations
for f in $(ls *.up.sql | sort); do
  version="${f%.up.sql}"
  applied=$($PSQL -tAc "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version='$version');")
  if [ "$applied" = "t" ]; then
    echo "skip (already applied): $version"
    continue
  fi
  echo "apply: $f"
  $PSQL -v ON_ERROR_STOP=1 -f "$f"
  $PSQL -c "INSERT INTO schema_migrations (version) VALUES ('$version');"
done

echo "== Verify =="
cd /home/edspike/sourcecode/vmsourcecode
$PSQL -c "SELECT column_name FROM information_schema.columns WHERE table_name='investors' ORDER BY ordinal_position;"
$PSQL -tAc "SELECT 'migrations applied: ' || COUNT(*) FROM schema_migrations;"
$PSQL -tAc "SELECT 'marketplace tables: ' || (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('service_providers','bookings'));"
