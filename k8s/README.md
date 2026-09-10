# BloomLater — Kubernetes & GitOps Guide

## Overview

The `/k8s` directory uses **Kustomize** for environment-overlay style deployment:

```
k8s/
├── base/                   # Shared resources (all environments)
│   ├── frontend/           # Deployment + Service
│   ├── backend/            # Deployment + Service
│   ├── mongodb/            # StatefulSet + headless Service + PVC docs
│   ├── configmap.yaml      # Non-secret config
│   └── secret.yaml         # !! PLACEHOLDER — see Secrets section !!
└── overlays/
    ├── dev/                # 1 replica, latest tags, bloomlater-dev namespace
    └── prod/               # 2+ replicas, SHA tags, Ingress, HPA, ArgoCD app
```

## Prerequisites

- `kubectl` ≥ 1.28
- `kustomize` ≥ 5.0 (or `kubectl kustomize`)
- nginx-ingress controller installed
- cert-manager installed (for TLS)
- ArgoCD installed (for GitOps)

## Deploy to Dev

```bash
# Create namespace
kubectl create namespace bloomlater-dev

# Create secrets first (see Secrets section)
kubectl apply -f k8s/base/secret.yaml -n bloomlater-dev

# Apply overlay
kubectl apply -k k8s/overlays/dev
```

## Deploy to Prod (GitOps with ArgoCD)

ArgoCD automatically reconciles the cluster to match `k8s/overlays/prod` on every push to `main`.

```bash
# One-time setup: register the ArgoCD Application
kubectl apply -f k8s/overlays/prod/argocd-app.yaml

# ArgoCD will sync automatically. To force a sync:
argocd app sync bloomlater-prod
```

## Secrets

> **Never commit real secrets.** The `secret.yaml` in `base/` is a placeholder.

### Option 1: Sealed Secrets (recommended for GitOps)

```bash
# Install kubeseal CLI and Sealed Secrets controller
# Then seal your secrets:
kubectl create secret generic bloomlater-secrets \
  --from-literal=JWT_ACCESS_SECRET=$(openssl rand -hex 64) \
  --from-literal=JWT_REFRESH_SECRET=$(openssl rand -hex 64) \
  --from-literal=MONGO_URI="mongodb://bloomlater:YOURPASS@mongo:27017/bloomlater?authSource=admin" \
  --from-literal=MONGO_ROOT_PASSWORD="YOURPASS" \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > k8s/overlays/prod/sealed-secret.yaml
```

### Option 2: External Secrets Operator

Wire to AWS Secrets Manager, HashiCorp Vault, or GCP Secret Manager via an `ExternalSecret` manifest.

### Option 3: Manual (CI/CD only — never Git)

```bash
kubectl create secret generic bloomlater-secrets \
  --from-literal=JWT_ACCESS_SECRET=$(openssl rand -hex 64) \
  --from-literal=JWT_REFRESH_SECRET=$(openssl rand -hex 64) \
  --from-literal=MONGO_URI="..." \
  --from-literal=MONGO_ROOT_PASSWORD="..." \
  -n bloomlater-prod
```

## GitOps Promotion Flow

```
Developer pushes to main
         ↓
GitHub Actions CI runs:
  1. Lint → Build → Trivy scan
  2. Push images to GHCR with git-SHA tag
  3. Run: kustomize edit set image ...:<sha-tag>
  4. Commit & push updated kustomization.yaml
         ↓
ArgoCD detects diff in k8s/overlays/prod/kustomization.yaml
         ↓
ArgoCD syncs cluster → new pods rolling update
         ↓
Health checks pass → rollout complete
```

## Scaling

The backend HPA scales from 2 to 10 replicas based on CPU (70%) and memory (80%).
To manually scale:

```bash
kubectl scale deployment prod-backend --replicas=5 -n bloomlater-prod
# (ArgoCD will eventually reconcile back to HPA-managed state)
```

## Checking Health

```bash
kubectl get pods -n bloomlater-prod
kubectl describe pod <pod-name> -n bloomlater-prod
kubectl logs deployment/prod-backend -n bloomlater-prod --follow
```
