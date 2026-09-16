# BloomLater

A 3-tier digital time capsule application (React frontend, Node.js/Express API, MongoDB) deployed on Amazon EKS through a full GitOps delivery pipeline. Users create capsules containing messages or memories, lock them until a future date, and a scheduled job on the backend unlocks them automatically when that date arrives. The application logic is deliberately simple. What this repository actually demonstrates is cloud infrastructure provisioning, container orchestration, stateful workload management on Kubernetes, and a GitOps deployment pipeline where the cluster's state is reconciled from Git rather than pushed to by hand.

## What This Project Covers

BloomLater runs on Amazon EKS, with ArgoCD continuously reconciling the cluster against what is declared in this repository's `k8s/` directory. A background cron job on the backend checks locked capsules on a schedule and unlocks the ones whose time has come. Authentication is JWT-based, with rate limiting on the login endpoint to slow down credential-stuffing attempts.

This project demonstrates:

- Provisioning AWS infrastructure through code rather than the console
- Running a stateful workload (MongoDB) on Kubernetes with persistent storage, rather than defaulting to a managed database service
- Using ArgoCD as the sole path for changes reaching the cluster
- Diagnosing real production-style failures: version mismatches, storage class issues, GitOps sync gaps, rather than only demonstrating a pipeline that never breaks

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React |
| Backend | Node.js, Express |
| Database | MongoDB |
| Authentication | JWT, rate-limited login |
| Container runtime | Docker |
| Orchestration | Kubernetes (Amazon EKS) |
| Ingress | ingress-nginx |
| GitOps / CD | ArgoCD |
| CI | Jenkins |
| Cloud provider | AWS |

## Repository Structure

```
BloomLater/
├── backend/
│   └── src/
│       └── jobs/
│           └── unlockCapsules.job.js
├── frontend/
├── k8s/
│   ├── namespace.yml
│   ├── mongo/
│   │   ├── deployment.yml
│   │   ├── pvc.yml
│   │   ├── secret.yml
│   │   ├── service.yml
│   │   └── storageclass.yml
│   ├── backend-deployment.yml
│   ├── backend-service.yml
│   ├── frontend-deployment.yml
│   ├── frontend-service.yml
│   └── ingress.yml
├── argocd/
│   └── application.yaml
├── Jenkinsfile
└── README.md
```

## How a Capsule Gets Unlocked

The backend runs a scheduled job that queries MongoDB for capsules whose unlock date has passed and are still marked as locked. When it finds one, it updates its status and makes the contents available to the owner through the API. This job depends on a live database connection at startup, which turned out to matter more than expected during deployment (see Lessons Learned below).

## Kubernetes Deployment

The application runs across three Deployments: frontend, backend, and MongoDB. MongoDB uses a `Recreate` deployment strategy rather than the Kubernetes default of `RollingUpdate`, because its PersistentVolumeClaim is mounted with `ReadWriteOnce` access. A rolling update would try to start the new pod before the old one releases the volume, which the volume does not support. Recreate strategy guarantees the old pod terminates and releases the claim before the new one starts.

An Ingress resource routes traffic: requests are split between the frontend and the backend API based on path. The backend exposes a health check the frontend polls to detect when the API is reachable.

## GitOps and Continuous Delivery (ArgoCD)

ArgoCD watches the `k8s/` directory of this repository and reconciles the cluster to match it. Jenkins builds and pushes images, then commits the updated image tag back to this repository. ArgoCD picks up that commit and handles the actual rollout. Jenkins never touches the cluster directly.

## Lessons Learned and Problems Solved

**A MongoDB version downgrade broke on startup.** After a deployment change, the new MongoDB pod entered CrashLoopBackOff while an older pod kept running successfully. The new pod was running `mongo:4.4` while the existing PersistentVolumeClaim held data written by `mongo:7`. MongoDB's WiredTiger storage engine will not open a data directory written by a newer major version, and mongod exits immediately when it tries. Since this was a non-production environment, the fix was deleting the PVC and letting MongoDB initialize a clean data directory rather than attempting an in-place downgrade, which MongoDB does not support.

**A PersistentVolumeClaim stuck in Terminating.** Deleting the PVC before deleting the pod still using it left the claim stuck behind its `pvc-protection` finalizer. Deleting the pod first, or clearing the finalizer manually with a merge patch when the ordering has already gone wrong, resolves it.

**ArgoCD reported a resource as unchanged when it clearly was not.** After committing a change to the MongoDB deployment's update strategy, ArgoCD's sync summary reported the resource as unchanged, and the live cluster kept the old strategy. The actual cause was upstream of that specific resource: the ArgoCD Application had no `directory.recurse` setting, which means ArgoCD only reads manifests sitting directly in the configured path and silently ignores anything in a subdirectory. Since the MongoDB manifests live in `k8s/mongo/`, ArgoCD was not tracking them at all. Setting `recurse: true` on the Application's source made it pick up the full manifest tree, at which point deployments, services, and the PVC all appeared under ArgoCD's management for the first time.

**A stuck sync obscured a completely unrelated problem underneath it.** The CrashLoopBackOff pod and the ArgoCD sync issue were investigated together initially, but they were unrelated. One was a data compatibility problem at the container level, the other a configuration gap in how ArgoCD discovers manifests. Solving one did not solve the other, which was a useful reminder to verify a fix against the original symptom rather than assuming adjacent problems share a cause.

## Setup Instructions

**1. Provision infrastructure**

```
cd terraform
terraform init
terraform apply
```

**2. Configure kubectl**

```
aws eks update-kubeconfig --region <region> --name <cluster-name>
kubectl get nodes
```

**3. Install ingress-nginx**

```
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=LoadBalancer
```

**4. Install ArgoCD and point it at this repository**

```
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f argocd/application.yaml
```

Confirm the Application's source block includes `directory.recurse: true` if your manifests are organized into subfolders, as they are in this repository.

## Future Improvements

- Add a staging namespace so ArgoCD can promote a change through an environment before it reaches the primary namespace
- Add TLS through cert-manager instead of serving over plain HTTP
- Add automated tests for the unlock job specifically, since it runs unattended on a schedule and failures there are easy to miss
- Move MongoDB credentials out of a static Secret and into a managed secrets solution