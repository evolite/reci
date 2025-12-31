# Podman Quadlet Container Examples

These are example Podman quadlet container configuration files for running Reci.

## Setup Instructions

1. **Create a Podman network** (if you don't have one already):
```bash
podman network create services-network
```

2. **Copy the example files** to your systemd user config directory:
```bash
cp reci-*.container.example ~/.config/containers/systemd/
```

3. **Edit the files** to match your setup:
   - Update `EnvironmentFile` path in `reci-backend.container` to point to your backend `.env` file
   - Adjust database credentials if needed
   - Change port mappings if you want different ports

4. **Reload systemd** and start the services:
```bash
systemctl --user daemon-reload
systemctl --user start reci-db.service
systemctl --user start reci-backend.service
systemctl --user start reci-frontend.service
```

5. **Enable services** to start on boot (optional):
```bash
systemctl --user enable reci-db.service
systemctl --user enable reci-backend.service
systemctl --user enable reci-frontend.service
```

## Notes

- Make sure you've built the container images first:
  ```bash
  podman build -t localhost/reci-backend:latest ./backend
  podman build -t localhost/reci-frontend:latest ./frontend
  ```

- The database password in the example is `reci_password` - change this in production!

- The frontend is configured to auto-update from the registry. Remove `AutoUpdate=registry` if you don't want this behavior.

- Ports:
  - Backend: 4000
  - Frontend: 4001
  - Database: internal only (not exposed)
