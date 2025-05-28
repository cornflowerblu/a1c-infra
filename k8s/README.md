# Kubernetes Deployment Option

This directory contains Kubernetes manifests for deploying the A1C Project on Kubernetes with Argo CD.

## Directory Structure

```
k8s/
├── base/                 # Base Kubernetes manifests
│   ├── frontend/         # Frontend service manifests
│   ├── backend/          # Backend service manifests
│   └── kustomization.yaml
├── overlays/             # Environment-specific overlays
│   ├── dev/              # Development environment
│   └── prod/             # Production environment
└── argo/                 # Argo CD configuration
    ├── application.yaml
    └── project.yaml
```

## Prerequisites

- A Kubernetes cluster (EKS, GKE, etc.)
- Argo CD installed on the cluster
- kubectl configured to access your cluster
- Helm (optional, for installing Argo CD)

## Setting Up Argo CD

1. Install Argo CD:

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

2. Access the Argo CD UI:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

3. Get the initial admin password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

4. Apply the Argo CD application configuration:

```bash
kubectl apply -f k8s/argo/application.yaml
```

## Deploying with Argo CD

Once Argo CD is set up and the application is configured, it will automatically sync the Kubernetes manifests from your Git repository to your cluster.

To manually trigger a sync:

```bash
argocd app sync a1c-project
```

## Switching from ECS to Kubernetes

If you decide to switch from ECS to Kubernetes, you'll need to:

1. Create a Kubernetes cluster (e.g., using EKS)
2. Set up Argo CD on the cluster
3. Configure the Kubernetes manifests in the `k8s/` directory
4. Update your CI/CD pipeline to build and push Docker images to a registry
5. Apply the Argo CD application configuration

The GitHub Actions workflows in `.github/workflows/` can be adapted to work with Kubernetes by replacing the CDK deployment steps with kubectl or Argo CD CLI commands.
