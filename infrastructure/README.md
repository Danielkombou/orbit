# ORBIT Infrastructure

## Docker

```bash
cd infrastructure/docker
docker compose up --build
```

- `web` — Next.js frontend (port 3000)
- `api` — Node.js API gateway (port 3001)
- `agent` — Python agent brain (port 8000)

## VM

Provisioning scripts for deploying ORBIT on a VM.
