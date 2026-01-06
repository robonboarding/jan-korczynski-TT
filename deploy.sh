#!/bin/bash

# Configuration
RG_NAME="technical-tester-jan-korczynski"
ACR_NAME="jankorczynskiacr" # Needs to be unique
LOCATION="swedencentral"

echo "1. Creating Resource Group (Skipping - Already Exists)..."
# az group create --name $RG_NAME --location $LOCATION

echo "2. Creating Azure Container Registry (if needed)..."
az acr create --resource-group $RG_NAME --name $ACR_NAME --sku Basic --admin-enabled true

echo "3. Logging into ACR..."
az acr login --name $ACR_NAME

echo "4. Building and Pushing Backend..."
# Build for linux/amd64 platform to ensure compatibility with Azure
docker build --platform linux/amd64 -t $ACR_NAME.azurecr.io/backend:latest ./backend
docker push $ACR_NAME.azurecr.io/backend:latest

echo "5. Building and Pushing Frontend..."
docker build --platform linux/amd64 -t $ACR_NAME.azurecr.io/frontend:latest ./frontend
docker push $ACR_NAME.azurecr.io/frontend:latest

echo "--------------------------------------------------"
echo "IMAGES PUSHED SUCCESSFULLY!"
echo "Backend: $ACR_NAME.azurecr.io/backend:latest"
echo "Frontend: $ACR_NAME.azurecr.io/frontend:latest"
echo "--------------------------------------------------"
echo "Top deploy to Azure Container Apps, run:"
echo "az containerapp up --name backend --resource-group $RG_NAME --ingress external --target-port 8000 --image $ACR_NAME.azurecr.io/backend:latest --env-vars AZURE_OPENAI_API_KEY=... AZURE_OPENAI_ENDPOINT=..."
echo "az containerapp up --name frontend --resource-group $RG_NAME --ingress external --target-port 3000 --image $ACR_NAME.azurecr.io/frontend:latest --env-vars NEXT_PUBLIC_API_URL=https://<BACKEND_URL>/chat"
