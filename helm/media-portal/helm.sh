helm upgrade media-portal .
helm upgrade --install media-portal . 
kubectl rollout restart deployment/media-portal
kubectl get pods -A
