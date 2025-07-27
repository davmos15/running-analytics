# Creating a Personal Access Token for GitHub Actions Deployment

Since GitHub Actions is having permission issues, we'll use a Personal Access Token (PAT) instead.

## Step 1: Create a Personal Access Token

1. **Go to GitHub Settings**: https://github.com/settings/tokens
2. **Click "Generate new token"** → **"Generate new token (classic)"**
3. **Fill in the details**:
   - **Note**: "GitHub Pages Deployment for running-analytics"
   - **Expiration**: "No expiration" (or set to 1 year)
   - **Scopes**: Check these boxes:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)

4. **Click "Generate token"**
5. **Copy the token** (it starts with `ghp_`) - you won't see it again!

## Step 2: Add Token to Repository Secrets

1. **Go to your repository**: https://github.com/davmos15/running-analytics
2. **Click "Settings"** (top menu)
3. **Click "Secrets and variables"** → **"Actions"**
4. **Click "New repository secret"**
5. **Fill in**:
   - **Name**: `PERSONAL_ACCESS_TOKEN`
   - **Secret**: Paste the token you copied (starts with `ghp_`)
6. **Click "Add secret"**

## Step 3: Test the Deployment

After adding the secret:
1. Make any small change to trigger the workflow (or manually trigger it)
2. Check the Actions tab to see if deployment succeeds
3. Your app will be available at: https://davmos15.github.io/running-analytics

## Why This Works

- Personal Access Tokens have your full permissions
- GitHub Actions can use them to push to repositories
- This bypasses the permission issues with the default GITHUB_TOKEN

## Security Note

- Keep your PAT secure - it has access to all your repositories
- You can always revoke it in GitHub Settings if needed
- Consider setting an expiration date for better security

## Alternative: Keep Using Manual Deployment

If you prefer not to create a PAT, you can continue using:
```bash
npm run deploy
```

This works perfectly and deploys immediately without waiting for GitHub Actions.