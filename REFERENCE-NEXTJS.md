# Next.js app — reference only

The files at the **repository root** (`src/`, `prisma/`, `package.json`, `RUN.md`, etc.) are the earlier **Next.js 15 + Prisma + PostgreSQL** prototype.

## Why it stays

- UX / OSFA patterns, invoice & field ideas, i18n copy, and domain vocabulary  
- Behaviour reference while the Laravel rewrite was built face-by-face  

## Why it is not production

Enterprise hosting is **cPanel + PHP + MySQL + LiteSpeed**. Node and PostgreSQL are not the target stack. The shipping system is **`laravel/`**.

## Rules

1. **Do not** deploy this Next.js app to the Enterprise host.  
2. **Do not** add new product features here unless explicitly asked for reference experiments.  
3. New work goes in **`laravel/`**.  
4. Local Next.js (`npm run dev` on port 3005) is optional archaeology — see old [RUN.md](RUN.md).

## Laravel instead

```text
cd laravel
# or double-click RUN.bat
```

Deploy: [laravel/DEPLOY.md](laravel/DEPLOY.md).
