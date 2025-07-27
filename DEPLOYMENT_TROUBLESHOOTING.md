# Deployment Troubleshooting

## GitHub Actions Permission Error

If you're getting a "Permission denied" error in GitHub Actions:

### Solution 1: Fix Repository Permissions (Recommended)

1. Go to https://github.com/davmos15/running-analytics/settings
2. Click "Actions" → "General" in the left sidebar
3. Scroll to "Workflow permissions"
4. Select "Read and write permissions"
5. Check "Allow GitHub Actions to create and approve pull requests"
6. Click "Save"

### Solution 2: Manual Deployment

If GitHub Actions still doesn't work, you can deploy manually:

```bash
# Build the project
npm run build

# Deploy using gh-pages
npm run deploy
```

### Solution 3: Use Personal Access Token

If the above doesn't work, create a Personal Access Token:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` permissions
3. Add it as a secret in your repository: `PERSONAL_TOKEN`
4. Update the workflow to use:
   ```yaml
   github_token: ${{ secrets.PERSONAL_TOKEN }}
   ```

### Solution 4: Enable GitHub Pages Source

Make sure GitHub Pages is configured:

1. Go to Settings → Pages
2. Set Source to "Deploy from a branch"
3. Set Branch to "gh-pages"
4. Click "Save"

## Current Status

Your app should be accessible at: https://davmos15.github.io/running-analytics

If deployment is successful but the site shows 404, wait a few minutes for GitHub Pages to update.