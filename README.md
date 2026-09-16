# Groupwise · Student Group Randomizer

A minimalist React/Vite classroom tool for creating balanced random student groups.

## Features

- Maintain multiple named class rosters in one app.
- Add or remove absent students without retyping the full roster.
- Randomize students into evenly balanced groups.
- Avoid singleton groups when the requested group count makes that possible.
- Export and import JSON backups.
- Responsive layout with print-friendly group results.

## Run locally

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## Deploy to Vercel

1. Push this folder to a Git repository.
2. In Vercel, select **Add New Project** and import the repository.
3. Vercel should detect **Vite** automatically.
4. Use `npm run build` as the build command and `dist` as the output directory if Vercel asks.
5. Deploy.

No environment variables or server-side services are required.

## Storage and privacy

Roster data is stored in `localStorage` in the current browser. It is not uploaded to Vercel or shared with other users. Browser storage is device- and browser-specific, so use **Export backup** regularly if the data matters. Importing a backup on another device is the supported way to transfer a class.