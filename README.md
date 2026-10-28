This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Environment and roles

Copy `.env.example` to `.env` and set your PostgreSQL and Upstash credentials. PostgreSQL connections are allowed up to 15 seconds to establish; override `PG_CONNECTION_TIMEOUT_MS` if your database needs a different connection timeout. Apply database changes and generate the Prisma client before starting the app:

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Regular accounts have the `USER` role and use the project dashboard. To create the first administrator, configure both `ADMIN_EMAIL` and a long random `ADMIN_BOOTSTRAP_TOKEN` in `.env`, then register or sign in using that email and submit the token under **Admin account setup**. Keep the token private and remove it from the environment after setup. Admins can view all users and projects and manage account roles; project-level `OWNER`/`MEMBER` permissions remain separate, and project changes remain restricted to project owners and members.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
