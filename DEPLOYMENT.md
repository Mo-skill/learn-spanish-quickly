# Deployment Guide

## Quick Start

1. **Create GitHub Repository**
   ```bash
   # On GitHub, create new repository named: learn-spanish-quickly
   ```

2. **Initialize Git** (if not already done)
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Learn Spanish Quickly v1.0.0"
   ```

3. **Connect to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/learn-spanish-quickly.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: **GitHub Actions**
   - The workflow will automatically deploy on next push

5. **Access Your Site**
   ```
   https://YOUR_USERNAME.github.io/learn-spanish-quickly/
   ```

## Manual Deployment (Alternative)

If you prefer manual deployment:
```bash
npm install -g gh-pages
npm run deploy
```

## Updating Content

```bash
git add .
git commit -m "Update: description of changes"
git push origin main
```

The GitHub Actions workflow will automatically rebuild and deploy.

## Troubleshooting

### Build Fails
- Check Node version (requires 20+)
- Run `npm install` to update dependencies
- Test locally with `npm run build`

### Pages Not Loading
- Verify base path in `vite.config.ts` matches repo name
- Check `.nojekyll` file exists in `/public/`
- Wait a few minutes for deployment to complete

### Routes 404
- Ensure `base` in `vite.config.ts` is correct
- GitHub Pages needs the base path to match repo name

## Environment Setup

**Required:**
- Node.js 20+
- npm 10+
- Git

**Optional:**
- GitHub CLI: `gh repo create learn-spanish-quickly --public`

---

**Questions?** Check the [README.md](README.md) for full documentation.
