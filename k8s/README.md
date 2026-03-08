# mp3studio Kubernetes

Apply order:

1. namespace.yaml
2. secret.example.yaml (copy to a real secret manifest first)
3. deployment.yaml
4. service.yaml
5. ingress.yaml

Build image example:

docker build -t ghcr.io/wonchoe/mp3studio:latest /mnt/laravel/mp3studio

Push image example:

docker push ghcr.io/wonchoe/mp3studio:latest