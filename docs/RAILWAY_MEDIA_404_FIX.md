# Fix 404 for Media (Images/Videos) on Railway

## Why you see 404

All media URLs return **404** because the **files are not on disk** on the content service.

On Railway, each service runs in a container with an **ephemeral filesystem**. When you:

1. Upload media → files are written to the content service container (e.g. `/app/storage` or `UPLOAD_DIR`).
2. Redeploy (e.g. push to GitHub) → Railway builds a **new** container. The old container (and all uploaded files) is discarded.
3. The database still has rows in `media_assets` with `storage_path` pointing at those files, but the files no longer exist → **404**.

So 404 is expected until uploads are stored somewhere **persistent**.

---

## Option 1: Railway persistent volume (recommended for simplicity)

1. In **Railway Dashboard** → your project → select the **content-service** (or whatever runs the content API).
2. Go to **Variables** or **Settings** and add a **Volume**:
   - Click **+ New** → **Volume**.
   - Mount path: e.g. `/data/uploads` (or `/app/storage` to match default).
3. Set the **content service** variable:
   - `UPLOAD_DIR=/data/uploads` (or the mount path you chose).
4. Redeploy the content service so it uses the volume.
5. **Re-upload your media** once (existing DB entries point to files that were never on this volume). New uploads will persist across redeploys.

If your content service Dockerfile uses `WORKDIR /app` and the code expects `/app/storage`, set the volume mount to `/app/storage` and do **not** set `UPLOAD_DIR` (so it keeps using `/app/storage`). That way all uploads go to the volume.

---

## Option 2: Use S3 + CloudFront CDN

The content service already supports S3. If you configure it, uploads go to the bucket and URLs use your CDN for fast delivery.

1. Create S3 bucket, IAM user (access key), and CloudFront distribution (see AWS guides).
2. In Railway → **content-service** → **Variables**, set (never commit credentials; use Railway env only):
   - `AWS_ACCESS_KEY_ID` = your IAM access key
   - `AWS_SECRET_ACCESS_KEY` = your IAM secret key
   - `AWS_REGION` = e.g. `us-east-1` or `eu-north-1`
   - `S3_BUCKET_NAME` = your bucket name
   - `S3_CDN_URL` = CloudFront URL, e.g. `https://d1234abcd.cloudfront.net` (or `d1234abcd.cloudfront.net`; the app adds `https://` if missing)
3. Redeploy the content service.
4. Re-upload media (existing DB rows point to old paths; new uploads go to S3 and use CDN URLs).

---

## After fixing storage

- **Volume**: New uploads will persist. Old playlist items that point to files uploaded before the volume was added will still 404 until you re-upload those assets or fix their paths.
- **S3**: Same idea — new uploads go to S3; old DB rows may need re-upload or path update.

Once uploads are persistent, the player will stop returning 404 for newly uploaded (or re-uploaded) media.
