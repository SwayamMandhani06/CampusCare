# CampusCare Observability & Monitoring Infrastructure

This directory contains the Helm values, architecture specifications, dashboard definitions, operational runbooks, and SRE documentation for the Prometheus and Grafana observability and alerting stack deployed on the CampusCare Kubernetes cluster.

---

## 1. Project Phase Tracker

- **Phase 4A — Application Metrics:** `COMPLETE`
  - Node.js Prometheus client (`prom-client`) instrumentation in CampusCare backend (`src/server.js`, `src/utils/metrics.js`).
  - Standard runtime telemetry and custom application metrics exported on `/metrics` (`campuscare_http_requests_total`, `campuscare_http_errors_total`, `campuscare_http_request_duration_seconds`).
- **Phase 4B — Prometheus Monitoring:** `COMPLETE`
  - Resource-conscious Prometheus server deployed via Helm in namespace `monitoring`.
  - Service-based scraping of `campuscare-backend-service:5000/metrics`.
- **Phase 4C — Grafana Observability Dashboard:** `COMPLETE`
  - Conservative Grafana deployment via official Helm chart in namespace `monitoring`.
  - Prometheus datasource provisioning and automated dashboard ingestion via ConfigMap.
- **Phase 4D — Alerting & SRE Observability:** `COMPLETE`
  - Production-style alerting rules configured directly in Prometheus optimized for the academic AWS environment (`CampusCareBackendDown`, `CampusCareHighErrorRate`, `CampusCareHighLatency`, `CampusCarePodHealth`).
  - Grafana dashboard enhanced to **CampusCare — DevOps Observability & SRE** with 14 panels including SLI, SLO (99%), Error Budget (1%), Alert states, and runtime telemetry.
  - End-to-end Kubernetes self-healing demonstrated under controlled single-replica termination with zero application downtime.
  - Comprehensive SRE runbook and operational models documented in [`monitoring/SRE.md`](file:///d:/Projects/CampusCare/monitoring/SRE.md).

---

## 2. End-to-End DevOps & Observability Architecture

```
Developer
   ↓ (git commit & push)
GitHub
   ↓ (webhook / SCM poll)
Jenkins CI/CD (Pipeline)
   ├── Build & Test Backend / Frontend
   ├── Build Docker Images (immutable git SHA tags)
   ├── Push to Docker Hub (SwayamMandhani06/campuscare-backend / frontend)
   └── Helm Upgrade (campuscare release)
   ↓
Docker Hub
   ↓
Helm
   ↓
k3s (Single-Node Kubernetes on AWS EC2 t3.small)
   ↓
CampusCare Application (Namespace: campuscare)
   ├── campuscare-backend (2 replicas, ClusterIP:5000)
   ├── campuscare-frontend (2 replicas, ClusterIP:80)
   ├── campuscare-mongodb (1 replica, ClusterIP:27017, PVC 2Gi Bound)
   └── Traefik Ingress (Public HTTP 80 / HTTPS 443)
         │
         ▼ /metrics
Prometheus Server (Namespace: monitoring, ClusterIP:80)
   ├── Scrape Config (campuscare-backend, kubernetes nodes/pods)
   ├── Alert Rules (alerting_rules.yml)
   └── PromQL Evaluations
         │
         ▼ PromQL API Proxy
Grafana (Namespace: monitoring, ClusterIP:80)
   ├── Datasource: CampusCare Prometheus
   ├── Dashboard: CampusCare — DevOps Observability & SRE (UID: campuscare-devops)
   └── Alerts & SRE Panels (SLI, SLO, Error Budget, Active Alerts)
```

### Security Perimeter
- **Prometheus:** `ClusterIP` only (No public exposure, no external Ingress).
- **Grafana:** `ClusterIP` only (Access via secure SSH / kubectl port-forward).
- **Backend:** `ClusterIP` only (Port 5000 reachable internally; external traffic routed strictly via Traefik Ingress on `/api/`).
- **MongoDB:** `ClusterIP` only (Port 27017 strictly isolated within cluster; PVC protected).
- **Zero Committed Secrets:** Credentials managed exclusively in Kubernetes Secrets (`grafana-admin-secret`, `campuscare-secret`).

---

## 3. SRE Reliability Model: SLI, SLO & Error Budget

Full mathematical and operational details are documented in [`monitoring/SRE.md`](file:///d:/Projects/CampusCare/monitoring/SRE.md).

### Service Level Indicator (SLI)
Availability is measured as the ratio of successful HTTP transactions to total requests processed:

$$\text{Availability SLI} = \frac{\sum(\text{HTTP 2xx} + \text{HTTP 3xx})}{\sum(\text{Total HTTP Requests})} \times 100$$

**PromQL Expression:**
```promql
100 * (
  sum(rate(campuscare_http_requests_total{status_code=~"[23].."}[5m]))
  /
  sum(rate(campuscare_http_requests_total[5m]))
)
```

### Service Level Objective (SLO)
- **Target:** **99.0%** availability over any rolling 30-day evaluation window.
- *Clarification:* This is the defined organizational SLO target, not a claim of historical compliance across prior months.

### Error Budget
- **Budget:** $100\% - 99\% = \mathbf{1.0\%}$ permitted unreliability.
- **30-Day Budget:** $30 \times 24 \times 60 \times 0.01 = \mathbf{432\text{ minutes}}$ ($\mathbf{7\text{ hours } 12\text{ minutes}}$).
- **Daily Budget Equivalent:** $24 \times 60 \times 0.01 = \mathbf{14.4\text{ minutes/day}}$.

---

## 4. Alerting Rules Catalog

Alert rules are configured in `monitoring/prometheus-values.yaml` and loaded into `/etc/config/alerting_rules.yml` within the Prometheus server pod.

| Alert Name | Severity | Condition / PromQL | Duration (`for`) | Operational Meaning |
|---|---|---|---|---|
| **`CampusCareBackendDown`** | `critical` | `up{job="campuscare-backend"} < 1` | `1m` | Scrape target is unreachable or returning connection errors. |
| **`CampusCareHighErrorRate`** | `warning` | `(sum(rate(campuscare_http_errors_total[5m])) / sum(rate(campuscare_http_requests_total[5m]))) > 0.05` | `5m` | Sustained 4xx/5xx error rate exceeds 5% of all traffic. |
| **`CampusCareHighLatency`** | `warning` | `histogram_quantile(0.95, sum by (le) (rate(campuscare_http_request_duration_seconds_bucket[5m]))) > 1` | `5m` | p95 HTTP response latency exceeds 1.0 second. |
| **`CampusCarePodHealth`** | `warning` | `count(count by (pod) (container_memory_working_set_bytes{container="backend",namespace="campuscare"})) < 2` | `2m` | Running backend pod replica count falls below desired 2. |

### Live Alert Evaluation States
- **`CampusCareBackendDown`:** Evaluated successfully; currently `inactive`/Normal (target is UP).
- **`CampusCareHighErrorRate`:** Configured and evaluated successfully; currently `inactive`/Normal because the current error rate is below the configured threshold.
- **`CampusCareHighLatency`:** Configured and evaluated successfully; currently `inactive`/Normal because p95 latency is below the configured threshold.
- **`CampusCarePodHealth`:** Evaluated successfully; currently `inactive`/Normal (2 running backend replicas).

---

## 5. Grafana Dashboard Specification: DevOps Observability & SRE

- **Title:** `CampusCare — DevOps Observability & SRE`
- **UID:** `campuscare-devops`
- **ConfigMap:** `campuscare-grafana-dashboard` (auto-provisioned into `/var/lib/grafana/dashboards/default`)
- **Panels (14 Total):**
  1. **SLO Availability Target** (Stat, `99%` target display)
  2. **Current Availability (SLI)** (Stat, dynamic calculated percentage from Prometheus)
  3. **Error Budget (Allowed)** (Stat, `1%` allowed budget display)
  4. **Backend Target Health** (Stat, binary `up{job="campuscare-backend"}`)
  5. **Backend Alert Status** (Stat, alert firing indicator)
  6. **Firing Alerts** (Stat, count of currently active alerts)
  7. **Backend Pod Availability** (Stat, active container count)
  8. **Total HTTP Requests** (Stat, counter gauge)
  9. **Node CPU Usage** (Gauge, cAdvisor host percentage)
  10. **Node Memory Usage** (Gauge, cAdvisor host percentage)
  11. **HTTP Request Rate** (Time Series, throughput req/sec)
  12. **HTTP Request Error Rate** (Time Series, error rate req/sec)
  13. **HTTP Latency p95** (Time Series, 95th percentile latency)
  14. **HTTP Status Distribution** (Bar Gauge, 200 vs 404 vs 500)

---

## 6. Kubernetes Self-Healing & High Availability Demonstration

A controlled self-healing verification was executed on the live cluster to prove zero-downtime fault tolerance and automatic replica recovery:

### Execution Trace
1. **Initial State:** 2 backend replicas healthy (`campuscare-backend-6dc7cbc9d5-fmgl8`, `campuscare-backend-6dc7cbc9d5-97xdk`).
2. **Controlled Fault Injection:** Pod `campuscare-backend-6dc7cbc9d5-97xdk` was deleted via `kubectl delete pod`.
3. **Automatic Self-Healing:** The Kubernetes ReplicaSet controller instantly detected the deviation between desired (2) and actual (1) pod counts and spawned replacement pod `campuscare-backend-6dc7cbc9d5-mlx4n`.
4. **Zero-Downtime Traffic Preservation:** Continuous HTTP probes to `http://localhost/api/health` and `http://16.4.36.223/api/health` during pod replacement returned **HTTP 200** with zero dropped packets, routed cleanly by `campuscare-backend-service` to the surviving replica `fmgl8`.
5. **Replica Restoration:** Replacement pod entered `Running (1/1 Ready)` within 18 seconds. `kubectl rollout status deployment/campuscare-backend` confirmed clean 2/2 replica restoration.
6. **Prometheus Target Resilience:** Scrape target `job="campuscare-backend"` remained continuous `health: up` throughout the event.

---

## 7. Controlled Alert Lifecycle Demonstration

A controlled test verified that Prometheus alerting rules evaluate and fire as designed:
1. **Target Fault Simulation:** The Prometheus scrape target was temporarily pointed to an inactive port (`5001`).
2. **Alert Activation:** Within 60 seconds, Prometheus flagged `up{job="campuscare-backend"} = 0` and triggered `CampusCareBackendDown` into `state: firing` (`severity: critical`).
3. **Zero Impact on Production:** Concurrently, probes to `http://16.4.36.223/api/health` confirmed the real application remained 100% online (HTTP 200).
4. **Resolution:** Scrape configuration was restored to port 5000. On the subsequent evaluation cycle, `CampusCareBackendDown` resolved cleanly back to `state: inactive` (Normal), with 0 active alerts.
5. **Error Rate Tracking:** Controlled invalid requests generated HTTP 404 responses, validating that `campuscare_http_errors_total` accurately increments and feeds into the error-rate alert query.

---

## 8. Resource Stability on AWS `t3.small`

Host and pod resource consumption during steady-state monitoring operations:
- **Host Memory:** ~1.3 GiB used / 1.9 GiB total (71% utilization, healthy buffer).
- **Disk (`/dev/root`):** 11 GiB used of 29 GiB (38% utilization, 18 GiB available).
- **Backend Pods:** ~30 MiB RAM, 5m CPU each.
- **Frontend Pods:** ~3 MiB RAM, 1m CPU each.
- **MongoDB:** ~80 MiB RAM, 5m CPU.
- **Prometheus Server:** ~240 MiB RAM, 4m CPU.
- **Grafana Server:** ~106 MiB RAM, 3m CPU.

All workloads run comfortably within assigned requests and limits.
