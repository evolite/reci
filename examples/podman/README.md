# Podman Quadlet Container Examples

These are example Podman quadlet container configuration files for running Reci.

## Setup Instructions

1. **Copy the example files** to your systemd user config directory:
```bash
cp services-network.network ~/.config/containers/systemd/
cp reci-*.container.example ~/.config/containers/systemd/
```

2. **Rename the container files** (remove `.example`):
```bash
cd ~/.config/containers/systemd/
mv reci-backend.container.example reci-backend.container
mv reci-frontend.container.example reci-frontend.container
mv reci-db.container.example reci-db.container
```

3. **Edit the files** to match your setup:
   - Update `EnvironmentFile` path in `reci-backend.container` to point to your backend `.env` file
   - Adjust database credentials if needed
   - Change port mappings if you want different ports

4. **Pull the container images**:
```bash
podman pull ghcr.io/evolite/reci-backend:latest
podman pull ghcr.io/evolite/reci-frontend:latest
```

5. **Reload systemd** and start the services:
```bash
systemctl --user daemon-reload
systemctl --user start services-network.service
systemctl --user start reci-db.service
systemctl --user start reci-backend.service
systemctl --user start reci-frontend.service
```

6. **Enable services** to start on boot (optional):
```bash
systemctl --user enable services-network.service
systemctl --user enable reci-db.service
systemctl --user enable reci-backend.service
systemctl --user enable reci-frontend.service
```

## Notes

- The container images are pulled from GitHub Container Registry. They're automatically built and updated on every push to `main`.

- The network configuration (`services-network.network`) is included, so you don't need to manually create the network.

- The database password in the example is `reci_password` - change this in production!

- The frontend is configured to auto-update from the registry. Remove `AutoUpdate=registry` if you don't want this behavior.

- Ports:
  - Backend: 4000
  - Frontend: 4001 (nginx reverse proxy)
  - Database: internal only (not exposed)

- The frontend container uses nginx to serve the React app and proxy API requests to the backend. The nginx configuration is included in the frontend image (`frontend/nginx.conf`) and automatically proxies `/api/*` requests to `reci-backend:4000`. If you need to customize the nginx configuration, modify `frontend/nginx.conf` and rebuild the frontend image.
