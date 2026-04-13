# 🐳 PostgreSQL with Docker — Quick Guide

**Overview:** Using Docker for PostgreSQL is recommended for web app development because it provides a consistent environment, avoids system conflicts, and closely matches production setups.

**Setup:** Install Docker Desktop, create a project folder (e.g., `C:\projects\my-app`), and add a `docker-compose.yml` file defining a `postgres` service (image `postgres:16`, environment variables for user/password/database, port `5433:5432`, and a volume for persistence), then start it with `docker compose up -d` and verify using `docker ps`.

**Connection:** Use a GUI tool like pgAdmin or DBeaver with `Host: localhost`, `Port: 5433`, and your credentials, or connect via terminal using `docker exec -it my_postgres_db psql -U admin -d mydatabase`.

**Control:** Stop the database with `docker compose down`, restart with `docker compose up -d`, view logs using `docker logs my_postgres_db`, and reset (delete data) with `docker compose down -v`.

**Networking Rule:** Use `localhost` when connecting from your machine, but use the service name (`postgres`) when connecting from another Docker container.

**Key Concept:** Containers run PostgreSQL while volumes persist your data even if the container stops.
