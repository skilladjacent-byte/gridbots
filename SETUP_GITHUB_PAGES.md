# Publishing GridBots to a play link (no terminal needed)

This sets up GitHub so that your game is auto-published to a public URL you
just click to play. Everything here is done in the browser — no command line.

## One-time setup

### 1. Create the repository
1. Go to https://github.com/new
2. **Repository name:** type `gridbots` exactly.
   (If you use a different name, open `vite.config.ts` and change the `base`
   value to `"/your-repo-name/"` — it must match, or the page loads blank.)
3. Set it to **Public** (Pages is free for public repos).
4. Do **not** check "Add a README" — your zip already has the files.
5. Click **Create repository**.

### 2. Upload the project files
1. On the new empty repo page, click **uploading an existing file**
   (the link in the "…or" line), or go to the **Add file → Upload files** menu.
2. Unzip `gridbots.zip` on your computer first.
3. Drag the **contents** of the `gridbots` folder into the upload box —
   that means `src/`, `index.html`, `package.json`, etc. should land at the
   top level of the repo (not nested inside another `gridbots/` folder).
4. Scroll down, click **Commit changes**.

> Tip: GitHub's web uploader can be fussy about empty folders and the hidden
> `.github` folder. If the `.github/workflows/deploy.yml` file doesn't appear
> after upload, use **Add file → Create new file**, type
> `.github/workflows/deploy.yml` as the name, and paste in the contents of
> that file from the zip.

### 3. Turn on GitHub Pages
1. In the repo, go to **Settings → Pages** (left sidebar).
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
   (Not "Deploy from a branch" — we use the Actions workflow.)
3. That's it — no save button needed.

### 4. Watch it publish
1. Go to the **Actions** tab in your repo.
2. You'll see a workflow run called "Deploy GridBots to GitHub Pages"
   building. It takes about a minute.
3. When it finishes (green check), your game is live at:

   **https://YOUR-USERNAME.github.io/gridbots/**

   Bookmark that link. That's your play link.

## After setup — how you update the game

Whenever the code changes (e.g. I send you a new version):
1. In the repo, go to the file(s) that changed, or use **Add file → Upload
   files** to drop in updated ones.
2. **Commit changes.**
3. The Actions workflow re-runs automatically and the play link updates in
   ~1 minute. Refresh the page to see the new version.

No terminal, no `npm`, no local install — ever.

## If the page loads blank
Almost always the `base` path mismatch: the repo name and the `base` value in
`vite.config.ts` must be identical. Repo named `gridbots` → base `"/gridbots/"`.

## Note on the data so far
The game published here is the Phase 1–3a build: the combat sandbox with
animated rigs. The equipment/customization system (Phase 3a) is built and
tested underneath but not yet surfaced in the UI — that's Phase 3b.
