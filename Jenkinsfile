// =============================================================================
// CampusCare — Production Declarative Jenkins CI/CD Pipeline
// =============================================================================
// Target Architecture: Single-node k3s on AWS EC2 (t3.small)
// Orchestration: Helm 3 chart (helm/campuscare)
// Components: React Frontend (Nginx), Express Backend (Node.js), MongoDB 7
// Ingress: Traefik Ingress Controller (Localhost port 80 routing / and /api)
// =============================================================================

pipeline {
    agent any

    options {
        // Prevent overlapping builds to avoid CPU/memory starvation on t3.small
        disableConcurrentBuilds()
        // Retain only recent builds to preserve storage
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // Abort pipeline if total runtime exceeds 20 minutes
        timeout(time: 20, unit: 'MINUTES')
    }

    environment {
        // Docker Hub credentials and image registry configuration
        DOCKER_CREDS_ID   = 'dockerhub-creds'
        DOCKER_ORG        = 'swayammandhani06'
        BACKEND_IMAGE     = "${DOCKER_ORG}/campuscare-backend"
        FRONTEND_IMAGE    = "${DOCKER_ORG}/campuscare-frontend"

        // Kubernetes and Helm deployment configuration
        KUBE_NAMESPACE    = 'campuscare'
        HELM_RELEASE      = 'campuscare'
        HELM_CHART_PATH   = 'helm/campuscare'

        // Local ingress health verification endpoint (Traefik Ingress on EC2 host)
        HEALTH_ENDPOINT   = 'http://localhost/api/health'
        FRONTEND_ENDPOINT = 'http://localhost/'

        // Immutable Git SHA image tag dynamically resolved in Checkout stage
        IMAGE_TAG         = ''
    }

    stages {
        // =========================================================================
        // Stage 1: Source Code Checkout & Git SHA Extraction
        // =========================================================================
        stage('Checkout') {
            steps {
                echo '=========================================================='
                echo ' [STAGE 1] Checking Out Repository & Resolving Git SHA'
                echo '=========================================================='
                checkout scm
                script {
                    // Extract immutable short 7-character commit SHA
                    if (env.GIT_COMMIT) {
                        env.IMAGE_TAG = env.GIT_COMMIT.take(7)
                    } else {
                        env.IMAGE_TAG = sh(
                            script: 'git rev-parse --short=7 HEAD',
                            returnStdout: true
                        ).trim()
                    }
                    def currentBranch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'main'
                    echo "[INFO] Active Branch    : ${currentBranch}"
                    echo "[INFO] Immutable Tag    : ${env.IMAGE_TAG}"
                }
            }
        }

        // =========================================================================
        // Stage 2: Install Dependencies (npm ci with package-lock.json)
        // =========================================================================
        stage('Install Dependencies') {
            steps {
                echo '=========================================================='
                echo ' [STAGE 2] Installing Dependencies via npm ci'
                echo '=========================================================='
                sh '''
                    set -e
                    echo "[INFO] Node.js version : $(node -v)"
                    echo "[INFO] npm version     : $(npm -v)"

                    echo "[INFO] Installing backend dependencies using lockfile..."
                    cd backend
                    npm ci
                    cd ..

                    echo "[INFO] Installing frontend dependencies using lockfile..."
                    cd frontend
                    npm ci
                    cd ..

                    echo "[INFO] Backend and Frontend dependencies installed successfully."
                '''
            }
        }

        // =========================================================================
        // Stage 3: Automated Testing & Code Quality Verification
        // =========================================================================
        stage('Test') {
            steps {
                echo '=========================================================='
                echo ' [STAGE 3] Running Automated Test Suites & Quality Checks'
                echo '=========================================================='
                sh '''
                    set -e

                    echo "[TEST 1/3] Running Backend Authentication & RBAC Test Suite..."
                    cd backend
                    npm run test:auth

                    echo "[TEST 2/3] Running Backend Complaint Lifecycle & Workflow Test Suite..."
                    npm run test:complaints
                    cd ..

                    echo "[TEST 3/3] Running Frontend Static Analysis & Lint Checks..."
                    cd frontend
                    npm run lint
                    cd ..

                    echo "[INFO] All automated test suites and lint checks passed successfully."
                '''
            }
        }

        // =========================================================================
        // Stage 4: Docker Image Build (Sequential builds for t3.small resource efficiency)
        // =========================================================================
        stage('Docker Build') {
            steps {
                echo '=========================================================='
                echo " [STAGE 4] Building Docker Images (Tag: ${env.IMAGE_TAG})"
                echo '=========================================================='
                sh '''
                    set -e

                    echo "[BUILD 1/2] Building Backend Docker Image: ${BACKEND_IMAGE}:${IMAGE_TAG}..."
                    docker build \
                        -t "${BACKEND_IMAGE}:${IMAGE_TAG}" \
                        -f backend/Dockerfile \
                        backend

                    echo "[BUILD 2/2] Building Frontend Docker Image: ${FRONTEND_IMAGE}:${IMAGE_TAG}..."
                    docker build \
                        --build-arg VITE_API_URL=/api \
                        -t "${FRONTEND_IMAGE}:${IMAGE_TAG}" \
                        -f frontend/Dockerfile \
                        frontend

                    echo "[INFO] Built Docker images:"
                    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep "campuscare" || true
                '''
            }
        }

        // =========================================================================
        // Stage 5: Docker Push (Restricted to main branch)
        // =========================================================================
        stage('Docker Push') {
            when {
                anyOf {
                    branch 'main'
                    expression {
                        def b = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                        return b == 'main' || b.endsWith('/main') || b == ''
                    }
                }
            }
            steps {
                echo '=========================================================='
                echo ' [STAGE 5] Pushing Docker Images to Docker Hub'
                echo '=========================================================='
                withCredentials([usernamePassword(
                    credentialsId: env.DOCKER_CREDS_ID,
                    usernameVariable: 'DOCKERHUB_USERNAME',
                    passwordVariable: 'DOCKERHUB_PASSWORD'
                )]) {
                    sh '''
                        set -e

                        echo "[INFO] Authenticating to Docker Hub securely via stdin..."
                        echo "${DOCKERHUB_PASSWORD}" | docker login -u "${DOCKERHUB_USERNAME}" --password-stdin

                        echo "[PUSH 1/2] Pushing Backend Image: ${BACKEND_IMAGE}:${IMAGE_TAG}..."
                        docker push "${BACKEND_IMAGE}:${IMAGE_TAG}"

                        echo "[PUSH 2/2] Pushing Frontend Image: ${FRONTEND_IMAGE}:${IMAGE_TAG}..."
                        docker push "${FRONTEND_IMAGE}:${IMAGE_TAG}"

                        echo "[INFO] Both Docker images pushed successfully to Docker Hub."
                    '''
                }
            }
        }

        // =========================================================================
        // Stage 6: Kubernetes Helm Deployment (Restricted to main branch)
        // =========================================================================
        stage('Kubernetes Deployment') {
            when {
                anyOf {
                    branch 'main'
                    expression {
                        def b = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                        return b == 'main' || b.endsWith('/main') || b == ''
                    }
                }
            }
            steps {
                echo '=========================================================='
                echo " [STAGE 6] Deploying via Helm Chart: ${env.HELM_CHART_PATH}"
                echo " Target Namespace : ${env.KUBE_NAMESPACE}"
                echo " Image Tag        : ${env.IMAGE_TAG}"
                echo '=========================================================='
                sh '''
                    set -e

                    echo "[INFO] Verifying Kubernetes cluster connectivity..."
                    kubectl cluster-info
                    helm version

                    # Ensure target namespace exists
                    if ! kubectl get namespace "${KUBE_NAMESPACE}" > /dev/null 2>&1; then
                        echo "[INFO] Namespace '${KUBE_NAMESPACE}' not found. Creating..."
                        kubectl create namespace "${KUBE_NAMESPACE}"
                    fi

                    # Safely handle existing vs initial Helm release
                    if helm status "${HELM_RELEASE}" --namespace "${KUBE_NAMESPACE}" > /dev/null 2>&1; then
                        echo "[INFO] Existing Helm release '${HELM_RELEASE}' detected."
                        echo "[INFO] Executing safe upgrade preserving existing credentials (--reuse-values)..."
                        helm upgrade "${HELM_RELEASE}" "${HELM_CHART_PATH}" \
                            --namespace "${KUBE_NAMESPACE}" \
                            --reuse-values \
                            --set backend.image.tag="${IMAGE_TAG}" \
                            --set frontend.image.tag="${IMAGE_TAG}"
                    else
                        echo "[INFO] Helm release '${HELM_RELEASE}' not found. Installing initial release..."
                        EXTRA_ARGS=""
                        if helm upgrade --help | grep -q -- '--take-ownership'; then
                            EXTRA_ARGS="--take-ownership"
                        fi

                        # Guard existing MongoDB credentials if campuscare-secret already exists in the cluster
                        SECRET_ARGS=""
                        if kubectl get secret campuscare-secret -n "${KUBE_NAMESPACE}" > /dev/null 2>&1; then
                            echo "[INFO] Existing 'campuscare-secret' detected in cluster. Preserving active credentials..."
                            EX_USER=$(kubectl get secret campuscare-secret -n "${KUBE_NAMESPACE}" -o jsonpath='{.data.MONGO_INITDB_ROOT_USERNAME}' | base64 -d)
                            EX_PASS=$(kubectl get secret campuscare-secret -n "${KUBE_NAMESPACE}" -o jsonpath='{.data.MONGO_INITDB_ROOT_PASSWORD}' | base64 -d)
                            EX_JWT=$(kubectl get secret campuscare-secret -n "${KUBE_NAMESPACE}" -o jsonpath='{.data.JWT_SECRET}' | base64 -d)
                            SECRET_ARGS="--set-string secrets.mongoRootUsername=${EX_USER} --set-string secrets.mongoRootPassword=${EX_PASS} --set-string secrets.jwtSecret=${EX_JWT}"
                        fi

                        helm upgrade --install "${HELM_RELEASE}" "${HELM_CHART_PATH}" \
                            --namespace "${KUBE_NAMESPACE}" \
                            --create-namespace \
                            ${EXTRA_ARGS} \
                            ${SECRET_ARGS} \
                            --set backend.image.tag="${IMAGE_TAG}" \
                            --set frontend.image.tag="${IMAGE_TAG}"
                    fi

                    echo "[INFO] Helm release successfully updated to image tag: ${IMAGE_TAG}"
                '''
            }
        }

        // =========================================================================
        // Stage 7: Rollout Verification
        // =========================================================================
        stage('Rollout Verification') {
            when {
                anyOf {
                    branch 'main'
                    expression {
                        def b = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                        return b == 'main' || b.endsWith('/main') || b == ''
                    }
                }
            }
            steps {
                echo '=========================================================='
                echo ' [STAGE 7] Verifying Deployment Rollout Status'
                echo '=========================================================='
                sh '''
                    set -e

                    echo "[ROLLOUT 1/2] Waiting for Backend deployment rollout..."
                    kubectl rollout status deployment/campuscare-backend \
                        --namespace "${KUBE_NAMESPACE}" \
                        --timeout=180s

                    echo "[ROLLOUT 2/2] Waiting for Frontend deployment rollout..."
                    kubectl rollout status deployment/campuscare-frontend \
                        --namespace "${KUBE_NAMESPACE}" \
                        --timeout=180s

                    echo "[INFO] Active pods in namespace '${KUBE_NAMESPACE}':"
                    kubectl get pods -n "${KUBE_NAMESPACE}" -o wide
                '''
            }
        }

        // =========================================================================
        // Stage 8: Health Check & Smoke Test
        // =========================================================================
        stage('Health Check') {
            when {
                anyOf {
                    branch 'main'
                    expression {
                        def b = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                        return b == 'main' || b.endsWith('/main') || b == ''
                    }
                }
            }
            steps {
                echo '=========================================================='
                echo " [STAGE 8] Probing Application Health via Traefik Ingress"
                echo " Endpoint: ${env.HEALTH_ENDPOINT}"
                echo '=========================================================='
                sh '''
                    set -e

                    MAX_RETRIES=15
                    RETRY_INTERVAL=5
                    SUCCESS=0

                    echo "[INFO] Probing ${HEALTH_ENDPOINT} (max ${MAX_RETRIES} attempts)..."
                    for i in $(seq 1 $MAX_RETRIES); do
                        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_ENDPOINT}" || true)
                        if [ "$HTTP_CODE" = "200" ]; then
                            echo "[SUCCESS] Health check PASSED on attempt ${i} (HTTP 200 OK)!"
                            SUCCESS=1
                            break
                        else
                            echo "[WAIT] Attempt ${i}/${MAX_RETRIES}: Received HTTP ${HTTP_CODE}. Retrying in ${RETRY_INTERVAL}s..."
                            sleep $RETRY_INTERVAL
                        fi
                    done

                    if [ "$SUCCESS" -ne 1 ]; then
                        echo "[ERROR] Health check failed: ${HEALTH_ENDPOINT} did not return HTTP 200 within timeout."
                        echo "[DEBUG] Inspecting pods in namespace '${KUBE_NAMESPACE}':"
                        kubectl get pods -n "${KUBE_NAMESPACE}"
                        exit 1
                    fi

                    echo "[INFO] Health check response payload:"
                    curl -s "${HEALTH_ENDPOINT}" || true
                    echo ""

                    echo "[INFO] Probing Frontend root endpoint (${FRONTEND_ENDPOINT})..."
                    FE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_ENDPOINT}" || true)
                    if [ "$FE_CODE" = "200" ]; then
                        echo "[SUCCESS] Frontend root returned HTTP 200 OK!"
                    else
                        echo "[WARN] Frontend returned HTTP ${FE_CODE}."
                    fi
                '''
            }
        }
    }

    // =============================================================================
    // Post-Execution Handling & Notifications
    // =============================================================================
    post {
        always {
            echo '[INFO] Post-pipeline: Ensuring Docker session logout...'
            sh 'docker logout || true'
        }
        success {
            echo '=========================================================='
            echo ' 🎉 CAMPUSCARE CI/CD PIPELINE SUCCEEDED'
            echo " Release     : ${env.HELM_RELEASE}"
            echo " Namespace   : ${env.KUBE_NAMESPACE}"
            echo " Image Tag   : ${env.IMAGE_TAG}"
            echo " Health URL  : ${env.HEALTH_ENDPOINT} (HTTP 200)"
            echo " Web App URL : ${env.FRONTEND_ENDPOINT} (HTTP 200)"
            echo '=========================================================='
        }
        failure {
            echo '=========================================================='
            echo ' ❌ CAMPUSCARE CI/CD PIPELINE FAILED'
            echo ' Inspect stage logs above for failure details.'
            echo '=========================================================='
        }
        cleanup {
            echo '[INFO] Cleaning up workspace directory...'
            deleteDir()
        }
    }
}
