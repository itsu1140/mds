.PHONY: dev down logs build

dev:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

build:
	docker compose -f docker-compose.prod.yml build
