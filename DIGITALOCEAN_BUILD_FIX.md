# DigitalOcean Build Command Fix

## Issue
The DigitalOcean deployment is failing with:
```
Running custom build command: turbo build
bash: line 1: turbo: command not found
```

## Root Cause
- The DigitalOcean app is still configured with the old build command `turbo build`
- Turbo is a devDependency that gets pruned after the build phase
- The app.yaml file has been updated but DigitalOcean needs manual configuration update

## Solution

### Manual Fix (Required)
1. Go to the DigitalOcean App Platform console
2. Navigate to your `pre-loader` app
3. Go to Settings → Components → web
4. Update the Build Command from:
   ```
   turbo build
   ```
   To:
   ```
   npm install && cd apps/web && npm install && npm run build
   ```
5. Save the configuration
6. Trigger a new deployment

### What the New Build Command Does
1. `npm install` - Installs root dependencies
2. `cd apps/web` - Changes to the web app directory
3. `npm install` - Installs web app specific dependencies
4. `npm run build` - Runs Next.js build (which is `next build`)

### Verification
After updating the build command, the deployment should:
1. Successfully install dependencies
2. Build the Next.js application
3. Start the application with `cd apps/web && npm start`

## Alternative: Use DigitalOcean CLI (if available)
If you have the DigitalOcean CLI configured:
```bash
# Get app ID
doctl apps list

# Update app spec (replace APP_ID with actual ID)
doctl apps update APP_ID --spec app.yaml
```

## Files Updated
- `app.yaml` - Updated with correct build command
- This fix has been committed and pushed to main branch
