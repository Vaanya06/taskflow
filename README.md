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

Copy `.env.example` to `.env` and set your PostgreSQL and Upstash credentials. PostgreSQL connections are allowed up to 15 seconds to establish; override `PG_CONNECTION_TIMEOUT_MS` if your database needs a different connection timeout. `PG_POOL_MAX` defaults to one connection per app process to limit pressure on providers using session-mode connection pools. Only increase it if the database pool has room for the combined connections from every app process or instance. Apply database changes and generate the Prisma client before starting the app:

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Regular accounts have the `USER` role and land in the company task tracker at `/company-tasks`. Employees see only tasks assigned to them and can update each task's status. Administrators land in `/admin`, where they assign tasks to employee accounts, set optional due dates, filter the company task list, and track progress. `/dashboard` forwards to the appropriate task view.

The company task workflow uses a shared internal project record to store assignments; admins and employees work with a single task list rather than project or sprint screens. Existing project and team data is left untouched, but project workspaces are no longer the default company workflow. Personal to-dos remain separate at `/todos` for private or shared lists, My Day, reminders, repeating tasks, and task steps.

The personal task workspace requires the `20261028131000_add_personal_todo_workspace` migration. Apply database changes and regenerate Prisma Client after pulling schema changes:

```bash
npx prisma migrate deploy
npx prisma generate
```

The login and registration forms do not expose administrator setup. To create the first administrator, bootstrap the account through your deployment process using `ADMIN_EMAIL` and a long random `ADMIN_BOOTSTRAP_TOKEN` configured in `.env`; keep the token private and remove it from the environment after setup. Once an administrator exists, admins can manage employee access from the **Employees** section and assign tasks to non-admin accounts.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
