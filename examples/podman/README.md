# Podman Quadlet Container Example

Example Podman quadlet configuration for running Reci as a systemd service.

## Setup

1. **Copy the example file** to your systemd user config directory:
```bash
cp reci.container.example ~/.config/containers/systemd/reci.container
```

2. **Edit the file** to match your setup:
   - Set `EnvironmentFile` to point to a file containing at minimum `JWT_SECRET=...`
   - Adjust `PublishPort` if you want a different host port

3. **Create a minimal env file**, e.g. `/etc/reci.env`:
```
JWT_SECRET=your-secret-here
CORS_ORIGIN=https://reci.example.com
```

4. **Pull the image**:
```bash
podman pull ghcr.io/evolite/reci:latest
```

5. **Reload systemd** and start the service:
```bash
systemctl --user daemon-reload
systemctl --user start reci.service
```

6. **Enable on boot** (optional):
```bash
systemctl --user enable reci.service
```

## Notes

- The image is a single container — Express serves both the API and the pre-built React frontend. No separate frontend, backend, or database containers needed.
- SQLite database is stored at `/data/reci.db` inside the container. The `reci-data` volume persists it across restarts.
- The AI provider, model, and API key can be configured in the admin panel after first run — no rebuild or env var change needed.
- `AutoUpdate=registry` automatically pulls new image versions when you run `podman auto-update`.
- The app is available at `http://localhost:4000` (or whatever host port you configure).
