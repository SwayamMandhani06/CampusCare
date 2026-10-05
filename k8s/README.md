# CampusCare FA2 — Phase 3: Raw Kubernetes (k3s) Manifests

This directory contains the declarative Kubernetes manifests for running **CampusCare FA2** on a single-node **k3s** cluster provisioned on AWS EC2 (`t3.small`, `ap-south-1`).

> [!NOTE]
> **Phase 3 Scope Boundary:**
> - These manifests establish the baseline Kubernetes resources (**Namespace, ConfigMap, Secret, PVC, Deployments, Services, and Ingress**).
> - **Phase 4** subsequently packages and parameterizes these manifests into a production-style **Helm Chart**.
> - CI/CD automation (**Jenkins**), container registry pipelines (**Docker Hub**), and monitoring (**Prometheus & Grafana**) will be implemented in later phases.

---

## 1. Architecture & Resource Topology

```text
                           Internet / Client Browser
                                      │
                                      ▼
                        HTTP Request (:80) to <AWS_IP>
                                      │
                 ┌────────────────────┴────────────────────┐
                 │          Traefik Ingress Controller     │
                 │         (campuscare-ingress)            │
                 └──────────┬───────────────────┬──────────┘
                            │                   │
                     Path: /api/*             Path: /*
                            │                   │
                            ▼                   ▼
                 ┌────────────────────┐ ┌────────────────────┐
                 │  Backend Service   │ │  Frontend Service  │
                 │    (ClusterIP)     │ │    (ClusterIP)     │
                 │     Port: 5000     │ │      Port: 80      │
                 └──────────┬─────────┘ └──────────┬─────────┘
                            │                      │
             ┌──────────────┴──────────────┐       │
             ▼                             ▼       ▼
    ┌─────────────────┐           ┌─────────────────┐
    │  Backend Pod 1  │           │  Frontend Pod 1 │
    │   (Node.js)     │           │ (React/Nginx)   │
    ├─────────────────┤           ├─────────────────┤
    │  Backend Pod 2  │           │  Frontend Pod 2 │
    │   (Node.js)     │           │ (React/Nginx)   │
    └────────┬────────┘           └─────────────────┘
             │
             │ Internal TCP (:27017)
             ▼
    ┌─────────────────┐
    │ MongoDB Service │
    │   (ClusterIP)   │
    │   Port: 27017   │
    └────────┬────────┘
             ▼
    ┌─────────────────┐
    │   MongoDB Pod   │
    │   (1 Replica)   │
    └────────┬────────┘
             │
             ▼ Volume Mount (/data/db)
    ┌─────────────────┐
    │ PersistentVolume│
    │   Claim (2Gi)   │
    │ (k3s local-path)│
    └─────────────────┘
```

---

## 2. Manifest Inventory

| File | Resource Kind | Resource Name | Purpose |
|---|---|---|---|
| [`namespace.yaml`](file:///D:/Projects/CampusCare/k8s/namespace.yaml) | `Namespace` | `campuscare` | Isolates all CampusCare FA2 workloads |
| [`configmap.yaml`](file:///D:/Projects/CampusCare/k8s/configmap.yaml) | `ConfigMap` | `campuscare-config` | Non-sensitive runtime variables (`NODE_ENV`, `PORT`, `MONGO_HOST`) |
| [`secret.yaml`](file:///D:/Projects/CampusCare/k8s/secret.yaml) | `Secret` | `campuscare-secret` | Sensitive runtime credentials (`MONGO_INITDB_ROOT_*`, `JWT_SECRET`) |
| [`mongodb-pvc.yaml`](file:///D:/Projects/CampusCare/k8s/mongodb-pvc.yaml) | `PersistentVolumeClaim` | `campuscare-mongodb-pvc` | 2 GiB persistent storage backed by k3s `local-path` provisioner |
| [`mongodb-deployment.yaml`](file:///D:/Projects/CampusCare/k8s/mongodb-deployment.yaml) | `Deployment` | `campuscare-mongodb` | Single replica MongoDB 7 database engine |
| [`mongodb-service.yaml`](file:///D:/Projects/CampusCare/k8s/mongodb-service.yaml) | `Service` | `campuscare-mongodb-service` | ClusterIP service exposing MongoDB internally on port `27017` |
| [`backend-deployment.yaml`](file:///D:/Projects/CampusCare/k8s/backend-deployment.yaml) | `Deployment` | `campuscare-backend` | 2 replicas running Node.js REST API with health probes |
| [`backend-service.yaml`](file:///D:/Projects/CampusCare/k8s/backend-service.yaml) | `Service` | `campuscare-backend-service` | ClusterIP service exposing backend internally on port `5000` |
| [`frontend-deployment.yaml`](file:///D:/Projects/CampusCare/k8s/frontend-deployment.yaml) | `Deployment` | `campuscare-frontend` | 2 replicas running React SPA compiled onto Nginx |
| [`frontend-service.yaml`](file:///D:/Projects/CampusCare/k8s/frontend-service.yaml) | `Service` | `campuscare-frontend-service` | ClusterIP service exposing frontend internally on port `80` |
| [`ingress.yaml`](file:///D:/Projects/CampusCare/k8s/ingress.yaml) | `Ingress` | `campuscare-ingress` | Traefik ingress routing external HTTP traffic (`/api` and `/`) |

---

## 3. Traffic Flow & Routing Logic

1. **External Ingress:** All inbound web requests hit the EC2 instance on public HTTP port 80.
2. **Traefik Router:** Traefik evaluates the request path:
   - Requests matching prefix `/api` (e.g. `/api/health`, `/api/auth/login`, `/api/complaints`) are forwarded to `campuscare-backend-service:5000`.
   - Requests matching prefix `/` are forwarded to `campuscare-frontend-service:80` which serves the React single-page application.
3. **Database Security:** The MongoDB instance has no public ingress route and no NodePort/LoadBalancer. It is accessible solely inside the Kubernetes virtual network via `campuscare-mongodb-service:27017`.

---

## 4. Kubernetes Self-Healing & High Availability

- **Replica Redundancy:** Both `campuscare-backend` and `campuscare-frontend` run **2 replicas**. If any individual container crashes or is deleted, Kubernetes automatically schedules a replacement pod within seconds to maintain the desired count of 2.
- **Readiness Probes:** Traffic is withheld from pods until they pass health probes (`/api/health` for backend; `/` for frontend). This prevents cold-start errors during rolling updates.
- **Liveness Probes:** If a deadlock or hung process occurs, kubelet detects failed health checks and restarts the affected container automatically.
- **Data Persistence:** MongoDB state is written to `/data/db` backed by `campuscare-mongodb-pvc`. If the MongoDB pod restarts, the volume reattaches seamlessly with no loss of complaints, users, or tickets.

---

## 5. Manual Application & Verification Workflow

Execute these commands from your workstation / WSL session:

### Step 1: Copy Manifests to the EC2 Host
```bash
scp -i ~/.ssh/campuscare-aws-key -r /mnt/d/Projects/CampusCare/k8s ubuntu@16.4.36.223:~/k8s
```

### Step 2: Create the Namespace & Real Secret Safely
```bash
# 1. Apply the namespace first
kubectl apply -f ~/k8s/namespace.yaml

# 2. Safely create or update the real Secret directly in cluster memory (avoids saving plaintext passwords to disk)
kubectl create secret generic campuscare-secret \
  --namespace=campuscare \
  --from-literal=MONGO_INITDB_ROOT_USERNAME="admin" \
  --from-literal=MONGO_INITDB_ROOT_PASSWORD="<YOUR_STRONG_PASSWORD>" \
  --from-literal=JWT_SECRET="<YOUR_STRONG_JWT_SECRET>" \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 3: Apply the Core Infrastructure & Database Manifests
```bash
kubectl apply -f ~/k8s/configmap.yaml
kubectl apply -f ~/k8s/mongodb-pvc.yaml
kubectl apply -f ~/k8s/mongodb-deployment.yaml
kubectl apply -f ~/k8s/mongodb-service.yaml
```

### Step 4: Apply Application Workloads & Ingress Routing
```bash
# Workload manifests are already pre-configured with image swayammandhani06/campuscare-*:manual-test
kubectl apply -f ~/k8s/backend-deployment.yaml
kubectl apply -f ~/k8s/backend-service.yaml
kubectl apply -f ~/k8s/frontend-deployment.yaml
kubectl apply -f ~/k8s/frontend-service.yaml
kubectl apply -f ~/k8s/ingress.yaml
```

### Step 5: Verification Commands
```bash
# Inspect overall cluster pod status
kubectl get pods -n campuscare -o wide

# Verify Services
kubectl get svc -n campuscare

# Verify PVC binding status
kubectl get pvc -n campuscare

# Verify Ingress configuration
kubectl get ingress -n campuscare

# Check backend container logs
kubectl logs deployment/campuscare-backend -n campuscare --tail=50
```

### Step 6: Test Self-Healing
```bash
# 1. Note the name of one backend pod
POD_NAME=$(kubectl get pods -n campuscare -l app=campuscare-backend -o jsonpath='{.items[0].metadata.name}')

# 2. Terminate the pod manually
kubectl delete pod $POD_NAME -n campuscare

# 3. Immediately watch Kubernetes recreate the replacement replica
kubectl get pods -n campuscare -w
```
