# CampusCare Observability & Monitoring Infrastructure

This directory contains the Helm values, architecture specifications, dashboard definitions, and operational runbooks for the Prometheus and Grafana observability stack deployed on the CampusCare Kubernetes cluster.

---

## 1. Project Phase Tracker

- **Phase 4A — Application Metrics:** `COMPLETE`
  - Node.js Prometheus client (`prom-client`) instrumentation in CampusCare backend.
  - Standard runtime telemetry and custom application metrics exported on `/metrics`.
- **Phase 4B — Prometheus Monitoring:** `COMPLETE`
  - Resource-conscious Prometheus server deployed via Helm in namespace `monitoring`.
  - Service-based scraping of `campuscare-backend-service:5000/metrics`.
- **Phase 4C — Grafana Observability Dashboard:** `COMPLETE`
  - Conservative Grafana deployment via official Helm chart in namespace `monitoring`.
  - Prometheus datasource provisioning and automated dashboard ingestion.
  - 9-panel real-time operational dashboard visualizing application health, throughput, errors, latency, and node metrics.
- **Phase 4D — Alerting & SRE:** `UPCOMING`
  - Alertmanager configuration, Slack/email notifications, and SLO-based alerting.

---

## 2. End-to-End Observability Architecture

```
[ Public Users / Browsers ]
             │
             ▼ (HTTP 80 / 443)
  [ Traefik Ingress Controller ]
        ├── /api/*  ──► [ CampusCare Backend Service:5000 ]
        └── /*      ──► [ CampusCare Frontend Service:80 ]

──────────────────────── Internal Kubernetes Network ────────────────────────

 [ CampusCare Backend Pods ]
   (campuscare-backend-service.campuscare.svc.cluster.local:5000/metrics)
             │
             │ Scrape (HTTP GET /metrics every 15s)
             ▼
  [ Prometheus Server ] (Namespace: monitoring)
   (prometheus-server.monitoring.svc.cluster.local:80)
             │
             │ PromQL Queries
             ▼
      [ Grafana ] (Namespace: monitoring)
   (grafana.monitoring.svc.cluster.local:80)
             │
             └──► CampusCare — DevOps Observability Dashboard

──────────────────────── Security Perimeter ────────────────────────
  • Prometheus: ClusterIP only (No external port / No Ingress)
  • Grafana:    ClusterIP only (Accessible exclusively via SSH / kubectl port-forward)
  • MongoDB:    ClusterIP only (No public exposure)
```

---

## 3. Helm Deployments & Releases

Both monitoring components reside in the dedicated `monitoring` namespace and are managed via declarative Helm charts:

| Component | Helm Release | Chart | Namespace | Service Type | Internal Port | Storage (PVC) |
|---|---|---|---|---|---|---|
| **Prometheus** | `prometheus` | `prometheus-community/prometheus` (v29.35.0) | `monitoring` | `ClusterIP` | `80` (target `9090`) | `2Gi` (`local-path`) |
| **Grafana** | `grafana` | `grafana/grafana` (v10.5.15) | `monitoring` | `ClusterIP` | `80` (target `3000`) | `1Gi` (`local-path`) |

---

## 4. Resource-Conscious Design for AWS `t3.small` (2 GiB RAM)

The production environment operates on a single AWS EC2 `t3.small` node with 2 vCPUs and ~2.0 GiB RAM. To guarantee cluster stability and ensure zero degradation of the core CampusCare application, monitoring workloads are constrained strictly:

### Resource Allocation Matrix

| Workload | CPU Requests | CPU Limits | Memory Requests | Memory Limits |
|---|---|---|---|---|
| **Prometheus Server** | `100m` | `250m` | `128Mi` | `256Mi` |
| **Grafana Server** | `50m` | `200m` | `64Mi` | `256Mi` |
| **Backend (2 pods)** | `100m` each | `200m` each | `128Mi` each | `256Mi` each |
| **Frontend (2 pods)** | `50m` each | `100m` each | `64Mi` each | `128Mi` each |
| **MongoDB (1 pod)** | `100m` | `250m` | `128Mi` | `256Mi` |

### Architectural Optimizations
1. **Disabled Ancillary Exporters:** Disabled standalone `node-exporter`, `kube-state-metrics`, and `alertmanager` sub-charts. Node and pod telemetry are scraped directly from the existing kubelet cAdvisor endpoint.
2. **Conservative Retention:** Prometheus TSDB retention is capped at 3 days (`3d`) to minimize memory footprint and disk IOPS.
3. **Dedicated PVCs:** Isolated PersistentVolumeClaims backed by k3s `local-path` provisioner ensure state retention without risking application storage (`campuscare-mongodb-pvc`).

---

## 5. Security & Admin Credential Governance

1. **Zero Hardcoded Credentials:** No admin passwords, tokens, or JWT secrets are stored in Git or version-controlled values files.
2. **Kubernetes Secret Integration:** Grafana retrieves admin credentials directly at runtime from the Kubernetes Secret `grafana-admin-secret` via `existingSecret` binding:
   ```yaml
   admin:
     existingSecret: "grafana-admin-secret"
     userKey: "admin-user"
     passwordKey: "admin-password"
   ```
3. **Strict Network Isolation (ClusterIP):** Neither Prometheus nor Grafana has a public Ingress route, LoadBalancer, or NodePort. Public AWS Security Groups remain locked to ports 22, 80, and 443 only.
4. **Zero PII Exposure:** Telemetry metrics use low-cardinality route patterns (e.g. `/api/health`, `/api/complaints`) and contain no user IDs, emails, query strings, or sensitive payloads.

---

## 6. Prometheus Datasource Configuration

Grafana automatically provisions the Prometheus datasource using internal Kubernetes Service DNS resolution:

- **Name:** `CampusCare Prometheus`
- **UID:** `campuscare-prometheus`
- **Type:** `prometheus`
- **URL:** `http://prometheus-server.monitoring.svc.cluster.local:80`
- **Default:** `true`
- **Scrape Time Interval:** `15s`

---

## 7. CampusCare Observability Dashboard Specification

The dashboard **CampusCare — DevOps Observability** (`UID: campuscare-devops`) is automatically provisioned into Grafana via Kubernetes ConfigMap (`campuscare-grafana-dashboard`).

### Panel Catalog & PromQL Queries

| # | Panel Name | Visualization | PromQL Query | Unit / Purpose |
|---|---|---|---|---|
| **1** | **Backend Availability** | Stat | `up{job="campuscare-backend"}` | Binary service availability (`1` = UP, `0` = DOWN). |
| **2** | **Backend Pod Availability** | Stat | `count(count by (pod) (container_memory_working_set_bytes{namespace="campuscare", container="backend"}))` | Active running backend replicas in the cluster. |
| **3** | **Total HTTP Requests** | Stat | `sum(campuscare_http_requests_total)` | Cumulative HTTP requests processed since deployment. |
| **4** | **Node CPU Usage** | Gauge | `100 * (rate(container_cpu_usage_seconds_total{id="/"}[2m]) / on(instance) machine_cpu_cores)` | EC2 node CPU utilization percentage from cAdvisor. |
| **5** | **Node Memory Usage** | Gauge | `100 * (container_memory_working_set_bytes{id="/"} / on(instance) machine_memory_bytes)` | EC2 node memory utilization percentage from cAdvisor. |
| **6** | **HTTP Request Rate** | Time Series | `sum(rate(campuscare_http_requests_total[1m]))` | Throughput (requests per second) across all API endpoints. |
| **7** | **HTTP Error Rate** | Time Series | `sum(rate(campuscare_http_errors_total[1m]))` | Rate of 4xx and 5xx responses per second. |
| **8** | **HTTP Latency p95** | Time Series | `histogram_quantile(0.95, sum(rate(campuscare_http_request_duration_seconds_bucket[1m])) by (le))` | 95th percentile response latency in seconds. |
| **9** | **HTTP Status Distribution** | Bar Gauge | `sum by (status_code) (campuscare_http_requests_total)` | Request distribution categorized by HTTP status code. |

- **Default Time Range:** Last 15 minutes (`now-15m` to `now`).
- **Auto-Refresh Rate:** `10s`.

---

## 8. Operational Runbook: Accessing Grafana

Because Grafana is deployed as an internal `ClusterIP` service for security, administrators access the UI via secure port-forwarding over SSH or kubectl.

### Secure Access Procedure

1. **Initiate Port-Forward:**
   ```bash
   kubectl port-forward -n monitoring svc/grafana 3000:80
   ```
2. **Access Dashboard:**
   Open a web browser and navigate to:
   ```
   http://localhost:3000
   ```
3. **Authentication:**
   Grafana is installed and secured with administrative credentials managed in the Kubernetes cluster. Log in using the generated admin credentials.

4. **Navigate to Dashboard:**
   Go to **Dashboards** > **CampusCare — DevOps Observability** to view live telemetry.

5. **Terminate Port-Forward:**
   Once observability inspection is complete, terminate the port-forward session (`Ctrl + C`) to ensure no local listening ports remain open.

---

## 9. Verification & Maintenance Commands

### Verify Monitoring Pods & Services
```bash
kubectl get pods,svc,pvc -n monitoring
```

### Check Grafana Datasource Health via API
```bash
kubectl port-forward -n monitoring svc/grafana 3000:80 &
curl -fsS http://localhost:3000/api/health
curl -fsS -u "admin:<PASSWORD>" http://localhost:3000/api/datasources/uid/campuscare-prometheus/health
kill %1
```

### Upgrade / Update Grafana Configuration
```bash
helm upgrade --install grafana grafana/grafana \
  --namespace monitoring \
  -f monitoring/grafana-values.yaml
```
