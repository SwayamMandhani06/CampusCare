# CampusCare Observability & Monitoring Infrastructure

This directory contains the Helm values, architecture specifications, and verification procedures for the Prometheus monitoring layer deployed on the CampusCare Kubernetes cluster.

---

## 1. Prometheus Purpose
Prometheus serves as the primary time-series metrics collection and monitoring engine for CampusCare. It scrapes operational metrics from the Express backend service, enabling real-time observability, latency tracking, error rate quantification, and SLI/SLO compliance evaluation.

---

## 2. Architecture & Data Flow

```
[ Public Users ]
       │
       ▼ (HTTP 80 / 443)
[ Traefik Ingress Controller ]
  ├── /api/*  ──► [ CampusCare Backend Service (port 5000) ]
  └── /*      ──► [ CampusCare Frontend Service (port 80) ]

────────────────────── Internal Cluster Network ──────────────────────

[ Prometheus Server (Namespace: monitoring) ]
       │
       │ HTTP GET /metrics (every 15s)
       ▼
[ CampusCare Backend Service:5000 ]
  (campuscare-backend-service.campuscare.svc.cluster.local:5000)
       │
       ├──► Backend Pod 1 (port 5000)
       └──► Backend Pod 2 (port 5000)
```

---

## 3. Resource-Conscious Design for `t3.small` (2 GiB RAM)

The production environment runs on a single AWS EC2 `t3.small` instance (2 vCPUs, 2 GiB RAM). To guarantee that monitoring never destabilizes the core application workloads, Prometheus is deployed with a minimal, optimized footprint:

- **Chart:** `prometheus-community/prometheus` (App version: `v3.15.0`, Chart version: `29.35.0`).
- **Sub-charts Disabled:** `alertmanager`, `prometheus-pushgateway`, `prometheus-node-exporter`, and `kube-state-metrics` are disabled in this phase.
- **Resource Limits:**
  - CPU: Requests `100m`, Limits `250m`
  - Memory: Requests `128Mi`, Limits `256Mi`
- **Data Retention:** 3 days (`3d`) to prevent disk exhaustion.
- **Persistence:** 2 GiB PersistentVolumeClaim on k3s `local-path` provisioner.

---

## 4. Helm Deployment Details

| Property | Value |
|---|---|
| **Namespace** | `monitoring` |
| **Helm Release** | `prometheus` |
| **Chart Repository** | `https://prometheus-community.github.io/helm-charts` |
| **Chart Name** | `prometheus-community/prometheus` |
| **Values File** | `monitoring/prometheus-values.yaml` |
| **Service Type** | `ClusterIP` (Internal only, port 80) |

### Installation / Upgrade Command
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --create-namespace \
  -f monitoring/prometheus-values.yaml
```

---

## 5. Scrape Configuration

Prometheus scrapes the CampusCare backend using its fully qualified Kubernetes Service DNS name:
- **Job Name:** `campuscare-backend`
- **Target:** `campuscare-backend-service.campuscare.svc.cluster.local:5000`
- **Metrics Path:** `/metrics`
- **Scrape Interval:** `15s`
- **Scrape Timeout:** `10s`

Using the Kubernetes Service DNS name ensures resilient service-based discovery independent of individual pod IP replacements during CI/CD rollouts.

---

## 6. Key Application Metrics Collected

The Express backend exports standard Node.js runtime metrics alongside custom low-cardinality application metrics:
- `campuscare_http_requests_total`: Total HTTP requests partitioned by `method`, `route`, and `status_code`.
- `campuscare_http_errors_total`: Total HTTP 4xx and 5xx error responses.
- `campuscare_http_request_duration_seconds`: Histogram measuring API latency distributions.
- `up{job="campuscare-backend"}`: Binary health status of the backend scrape target (`1` = healthy/up).

---

## 7. Security & Network Isolation

- **Internal ClusterIP:** Prometheus is strictly accessible inside the cluster network.
- **No Ingress Exposure:** Prometheus is not mapped into the Traefik Ingress routing table. Public requests to `/metrics` are directed to the frontend static Nginx container, returning frontend HTML rather than telemetry data.
- **Zero Secret Leakage:** Metrics labels are normalized to eliminate sensitive parameters (e.g. user IDs, tokens, credentials, query parameters).

---

## 8. Verification & Diagnostic Commands

### Check Prometheus Deployment & Pods
```bash
kubectl get pods -n monitoring -o wide
kubectl get svc -n monitoring
kubectl get pvc -n monitoring
```

### Access Prometheus UI / API Locally (via Port Forward)
```bash
kubectl port-forward -n monitoring svc/prometheus-server 9090:80
```
- Health probe: `curl http://localhost:9090/-/healthy`
- Target status: `curl http://localhost:9090/api/v1/targets`
- Query metric: `curl -G http://localhost:9090/api/v1/query --data-urlencode 'query=up{job="campuscare-backend"}'`

---

## 9. Phase Status & Roadmap

- **Phase 4B (Completed):** Prometheus server installation, resource tuning for `t3.small`, backend metrics scraping, and cluster validation.
- **Phase 4C (Upcoming):** Grafana dashboard installation, visual metrics panels, and alerting rules.
