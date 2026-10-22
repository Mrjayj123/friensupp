from pathlib import Path

from app.database import connect_migration_database


def main() -> None:
    migrations_dir = Path(__file__).resolve().parents[2] / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))
    if not migration_files:
        raise RuntimeError(f"No SQL migrations found in {migrations_dir}")

    with connect_migration_database() as connection:
        with connection.transaction():
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version TEXT PRIMARY KEY,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )

        for migration_file in migration_files:
            with connection.transaction():
                applied = connection.execute(
                    "SELECT 1 FROM schema_migrations WHERE version = %s",
                    (migration_file.name,),
                ).fetchone()
                if applied:
                    continue
                connection.execute(
                    migration_file.read_text(encoding="utf-8"),
                    prepare=False,
                )
                connection.execute(
                    "INSERT INTO schema_migrations (version) VALUES (%s)",
                    (migration_file.name,),
                )
            print(f"Applied {migration_file.name}")


if __name__ == "__main__":
    main()
