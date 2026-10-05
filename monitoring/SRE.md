# CampusCare Site Reliability Engineering (SRE) Framework

This document outlines the Service Level Indicators (SLI), Service Level Objectives (SLO), Error Budget governance, automated alerting rules, incident response runbooks, and Kubernetes self-healing architecture for the CampusCare multi-container modular application.

---

## 1. SRE Lifecycle Flow

```
   ┌──────────────┐
   │   MONITOR    │  Continuous Prometheus metrics collection & cAdvisor telemetry
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │    DETECT    │  PromQL evaluation of health, error rates, latency, and pod states
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │    ALERT     │  Prometheus & Grafana alerting rules trigger (Normal -> Firing)
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ INVESTIGATE  │  Triage via Grafana SRE Dashboard & kubectl cluster inspection
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  SELF-HEAL   │  Kubernetes ReplicaSet controller automatically reconciles state
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │    VERIFY    │  End-to-end HTTP health checks (/api/health) & target recovery
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  MEASURE SLO │  Calculate downtime consumed against the monthly Error Budget
   └──────────────┘
```

---

## 2. Service Level Indicator (SLI)

The primary Service Level Indicator for CampusCare is **Application Availability**, defined as the proportion of successful HTTP transactions served by the backend service over a measurement window:

$$\text{Availability SLI} = \frac{\text{Successful HTTP Requests (HTTP 2xx, 3xx)}}{\text{Total Valid HTTP Requests}} \times 100$$

### PromQL Measurement Formula
```promql
((sum(campuscare_http_requests_total{status_code=~"[23].."}) or on() vector(0)) / (sum(campuscare_http_requests_total) or on() vector(1))) * 100
```

- **Successful Responses:** HTTP status codes in the `200–399` range.
- **Unsuccessful Responses:** Server errors (`5xx`) and user-facing failures (`4xx`).
- **Scrape Filter:** The `/metrics` endpoint is excluded from request tracking to ensure telemetry collection does not skew user-facing availability.

---

## 3. Service Level Objective (SLO)

The agreed target for CampusCare service availability is:

$$\mathbf{99.0\% \text{ Availability over a Rolling 30-Day Period}}$$

> [!IMPORTANT]
> The 99.0% availability target represents the engineering objective and design commitment. It is not an unverified historical assertion of 30-day continuous runtime, but rather the operational standard against which system behavior, alerting, and incident recovery are evaluated.

---

## 4. Error Budget

The Error Budget is the allowable margin of service degradation permitted by the SLO before user experience is compromised and feature deployments are halted in favor of reliability engineering:

$$\text{Error Budget} = 100\% - 99.0\% = \mathbf{1.0\%}$$

### Budget Breakdown

| Calculation Window | Total Duration | Allowed Downtime / Error Margin |
|---|---|---|
| **Monthly (30 Days)** | $30 \times 24 \text{ hours} = 720 \text{ hours}$ | $720 \times 1\% = \mathbf{7.2 \text{ hours}} \quad (432 \text{ minutes})$ |
| **Weekly (7 Days)** | $7 \times 24 \text{ hours} = 168 \text{ hours}$ | $168 \times 1\% = \mathbf{1.68 \text{ hours}} \quad (100.8 \text{ minutes})$ |
| **Daily (24 Hours)** | $24 \text{ hours} = 1,440 \text{ minutes}$ | $1,440 \times 1\% = \mathbf{14.4 \text{ minutes}}$ |

### Error Budget Policy
- **Healthy State ($> 0.5\%$ budget remaining):** Normal feature velocity and regular CI/CD deployments through Jenkins.
- **Degraded State ($< 0.2\%$ budget remaining):** Non-critical releases frozen; engineering priorities shift to root-cause analysis and stability.
- **Exhausted State ($0\%$ budget):** Immediate deployment freeze; all engineering effort dedicated to SRE hardening, bug fixes, and infrastructure resilience.

---

## 5. Alerting Catalog & Rules

Alert rules are defined declaratively in Prometheus (`serverFiles.alerting_rules.yml`) and rendered in Grafana dashboards.

### Rule Definitions

```yaml
groups:
  - name: campuscare-sre-alerts
    rules:
      # -------------------------------------------------------------
      # Alert 1: Complete Backend Service Outage
      # -------------------------------------------------------------
      - alert: CampusCareBackendDown
        expr: up{job="campuscare-backend"} < 1
        for: 1m
        labels:
          severity: critical
          tier: application
        annotations:
          summary: "CampusCare backend service is unavailable"
          description: "Prometheus target campuscare-backend has been unreachable for > 1 minute."

      # -------------------------------------------------------------
      # Alert 2: High HTTP Error Rate
      # -------------------------------------------------------------
      - alert: CampusCareHighErrorRate
        expr: (sum(rate(campuscare_http_errors_total[5m])) / sum(rate(campuscare_http_requests_total[5m]))) > 0.05
        for: 5m
        labels:
          severity: warning
          tier: application
        annotations:
          summary: "CampusCare HTTP error rate exceeds 5%"
          description: "High error ratio detected across API endpoints over the last 5 minutes."

      # -------------------------------------------------------------
      # Alert 3: Latency Degradation (p95)
      # -------------------------------------------------------------
      - alert: CampusCareHighLatency
        expr: histogram_quantile(0.95, sum(rate(campuscare_http_request_duration_seconds_bucket[5m])) by (le)) > 1
        for: 5m
        labels:
          severity: warning
          tier: performance
        annotations:
          summary: "CampusCare p95 latency exceeds 1.0 second"
          description: "95% of API requests took longer than 1 second to complete over a 5m window."

      # -------------------------------------------------------------
      # Alert 4: Pod Degradation (Workload Health)
      # -------------------------------------------------------------
      - alert: CampusCarePodHealth
        expr: count(count by (pod) (container_memory_working_set_bytes{namespace="campuscare", container="backend"})) < 2
        for: 2m
        labels:
          severity: warning
          tier: infrastructure
        annotations:
          summary: "CampusCare backend replica count degraded"
          description: "Active running backend pods count dropped below the desired target of 2."
```

### Alert States & Lifecycle
- **Inactive / Normal:** Metric is within healthy boundaries.
- **Pending:** Metric violated the threshold condition but has not yet exceeded the `for` duration timer.
- **Firing:** Condition persisted beyond the `for` duration; alert is active and displayed on operational dashboards.

---

## 6. Incident Response & Triage Runbook

### Incident Workflow: `Detect → Alert → Investigate → Recover → Verify → Record`

1. **Detection:**
   - Observability dashboard displays `CampusCareBackendDown` or `Firing Alerts > 0`.
   - Alert tile changes from `NORMAL` (green) to `FIRING` (red).
2. **Investigation:**
   - Verify pod status in namespace `campuscare`:
     ```bash
     kubectl get pods -n campuscare -o wide
     ```
   - Inspect backend application logs:
     ```bash
     kubectl logs -n campuscare -l app.kubernetes.io/name=campuscare-backend --tail=100
     ```
   - Check target scrape status in Prometheus:
     ```bash
     kubectl port-forward -n monitoring svc/prometheus-server 9090:80 &
     curl -s http://localhost:9090/api/v1/targets | jq .
     kill %1
     ```
3. **Recovery & Self-Healing:**
   - Allow Kubernetes native reconciliation: The `Deployment` controller automatically replaces failed pods.
   - If pods are stuck in error states due to resource pressure or crash loops:
     ```bash
     kubectl rollout restart deployment/campuscare-backend -n campuscare
     ```
4. **Verification:**
   - Confirm active pod count:
     ```bash
     kubectl get pods -n campuscare
     ```
   - Validate live HTTP response:
     ```bash
     curl -fsS http://16.4.36.223/api/health
     curl -fsSI http://16.4.36.223/
     ```
5. **Post-Incident Recording:**
   - Record outage duration in SRE log.
   - Deduct consumed minutes from the monthly Error Budget ($432 \text{ min}$).

---

## 7. Kubernetes Self-Healing Architecture

CampusCare relies on Kubernetes native reconciliation loops to achieve automated self-healing without manual operator intervention:

1. **High Availability Replication:** The backend deployment runs $N=2$ replicas distributed across the cluster. If one replica terminates or crashes, the surviving replica continues serving traffic without dropping ingress requests.
2. **Desired State Reconciliation:** The Kubernetes `kube-controller-manager` continuously monitors the cluster state against the declared specification (`spec.replicas: 2`). Upon pod termination, the ReplicaSet immediately provisions a replacement pod.
3. **Readiness & Liveness Probes:** K3s health probes detect application deadlock or unresponsiveness and restart the container before cascade failures occur.
4. **Volume Decoupling:** Database state is anchored to the persistent volume `campuscare-mongodb-pvc`, ensuring application restarts never affect stored data.
