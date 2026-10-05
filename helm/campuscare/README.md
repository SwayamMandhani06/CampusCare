# CampusCare — Production Helm Chart

This directory contains the production-grade **Helm 3** chart for **CampusCare**, parameterizing and packaging the verified Kubernetes manifests (Phase 3) into a reusable, upgradeable release package (Phase 4).

---

## 1. Chart Purpose & Overview

The `campuscare` chart automates the deployment and lifecycle management of the CampusCare microservices architecture on single-node or multi-node Kubernetes clusters (tested and verified on **k3s with Traefik**):

- **Declarative Configuration:** Replaces static manifests with parameterized, environment-specific values (`values.yaml`).
- **Zero-Downtime Rollouts:** Manages rolling updates across multi-replica deployments (**2 backend replicas, 2 frontend replicas**).
- **Persistent Database:** Binds MongoDB 7 with a 2 GiB PersistentVolumeClaim backed by the k3s `local-path` storage provisioner.
- **Unified Ingress:** Binds external HTTP traffic through Traefik, routing `/api/*` to the Express backend and `/*` to the React/Nginx frontend.
- **Rollback Safety:** Enables instant one-command rollbacks (`helm rollback`) in case of failed upgrades.

---

## 2. Directory Structure

```text
helm/campuscare/
├── Chart.yaml                  # Chart metadata (name, version 0.1.0, appVersion 1.0.0)
├── values.yaml                 # Configurable deployment values, replicas, images, and resources
├── .helmignore                 # Standard file ignore rules for Helm packaging
├── README.md                   # Complete operational guide and command reference
└── templates/
    ├── _helpers.tpl            # Standard template naming and labeling helper macros
    ├── namespace.yaml          # Target workload namespace (default: campuscare)
    ├── configmap.yaml          # Non-sensitive application configuration (PORT, NODE_ENV, MONGO_HOST)
    ├── secret.yaml             # Placeholder/template secret definition (passwords, JWT)
    ├── mongodb-pvc.yaml        # 2Gi PersistentVolumeClaim for MongoDB data directory
    ├── mongodb-deployment.yaml # Single-replica MongoDB deployment (Recreate strategy)
    ├── mongodb-service.yaml    # Internal ClusterIP service on port 27017
    ├── backend-deployment.yaml # 2-replica Node.js Express REST API deployment
    ├── backend-service.yaml    # Internal ClusterIP service on port 5000
    ├── frontend-deployment.yaml# 2-replica React/Nginx frontend deployment
    ├── frontend-service.yaml   # Internal ClusterIP service on port 80
    └── ingress.yaml            # Traefik Ingress routing /api and / routes
```

---

## 3. Important Configurable Values (`values.yaml`)

| Parameter | Default | Description |
|---|---|---|
| `namespace` | `campuscare` | Target Kubernetes namespace for all resources |
| `config.nodeEnv` | `"production"` | `NODE_ENV` environment variable passed to backend |
| `config.port` | `"5000"` | Express server listening port |
| `config.mongoHost` | `"campuscare-mongodb-service"` | Internal DNS hostname of the MongoDB service |
| `secrets.mongoRootUsername` | `"campuscare_admin"` | MongoDB root admin username |
| `secrets.mongoRootPassword` | `"CHANGE_ME_SECURE_PASSWORD_2026"` | MongoDB root password (override via `--set` or secret file) |
| `secrets.jwtSecret` | `"CHANGE_ME_JWT_SECRET_KEY_CAMPUSCARE_2026"` | Secret key used for signing JWT tokens |
| `mongodb.enabled` | `true` | Enable or disable MongoDB deployment |
| `mongodb.image.repository` | `mongo` | MongoDB container image repository |
| `mongodb.image.tag` | `"7"` | MongoDB container image tag |
| `mongodb.persistence.size` | `2Gi` | Persistent volume claim size |
| `mongodb.persistence.storageClass` | `local-path` | Storage class (k3s built-in default provisioner) |
| `backend.replicaCount` | `2` | Number of backend application pod replicas |
| `backend.image.repository` | `swayammandhani06/campuscare-backend` | Backend Docker Hub repository |
| `backend.image.tag` | `"manual-test"` | Backend Docker image tag |
| `frontend.replicaCount` | `2` | Number of frontend application pod replicas |
| `frontend.image.repository` | `swayammandhani06/campuscare-frontend` | Frontend Docker Hub repository |
| `frontend.image.tag` | `"manual-test"` | Frontend Docker image tag |
| `ingress.enabled` | `true` | Enable or disable Traefik Ingress resource |
| `ingress.className` | `traefik` | Ingress class name (k3s default: `traefik`) |

---

## 4. Helm Command Reference

Run these commands from the repository root:

### A. Lint & Validate Chart Syntax
Verifies YAML formatting and structural conventions:
```bash
helm lint ./helm/campuscare
```

### B. Dry-Run Template Rendering
Inspect the rendered manifests locally before touching the cluster:
```bash
helm template campuscare ./helm/campuscare \
  --set secrets.mongoRootPassword="<YOUR_REAL_PASSWORD>" \
  --set secrets.jwtSecret="<YOUR_REAL_JWT_SECRET>"
```

### C. Install Release
Installs the application onto your Kubernetes cluster:
```bash
helm install campuscare ./helm/campuscare \
  --namespace campuscare \
  --create-namespace \
  --set secrets.mongoRootPassword="<YOUR_REAL_PASSWORD>" \
  --set secrets.jwtSecret="<YOUR_REAL_JWT_SECRET>"
```

*(Alternatively, create a private `values-secret.yaml` file ignored by Git, and install via `-f values-secret.yaml`)*:
```bash
helm install campuscare ./helm/campuscare -f values-secret.yaml
```

### D. Upgrade Release
Applies updates (e.g. new image tag, replica scale-out, or configuration change):
```bash
helm upgrade campuscare ./helm/campuscare \
  --namespace campuscare \
  --set backend.image.tag="v1.0.1" \
  --set frontend.image.tag="v1.0.1"
```

### E. Rollback Release
Instantly reverts to a previous release revision if an issue is detected:
```bash
# View release history and revisions
helm history campuscare -n campuscare

# Roll back to revision 1 (or any desired revision)
helm rollback campuscare 1 -n campuscare
```

### F. Uninstall Release
Cleans up all managed resources (deployments, services, ingress, and configmap):
```bash
helm uninstall campuscare -n campuscare
```
*(Note: PersistentVolumeClaims with data remain preserved depending on storage provisioner reclaim policy).*
