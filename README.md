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

Regular accounts have the `USER` role and land in the personal task workspace at `/todos`. It includes My Day and suggestions, private or shared lists, task notes, due dates, browser reminders, repeating tasks, steps, importance, and search. Desktop reminders are delivered while Taskflow is open and browser notifications are enabled.

Personal to-dos and team project issues are separate records and do not sync or duplicate each other. Use personal lists for your own plans and routines; project issues have shared assignees, status, priority, and sprint context, and are managed in `/dashboard` and each project workspace. The dashboard's **My project queue** shows open project issues assigned to you and links back to their project. Completing a personal to-do does not change a project issue, and changing a project issue does not complete a personal to-do.

The personal task workspace requires the `20261028131000_add_personal_todo_workspace` migration. Apply database changes and regenerate Prisma Client after pulling schema changes:

```bash
npx prisma migrate deploy
npx prisma generate
```

Company teams use the additive `20261028152000_add_company_teams` migration. Admins create teams by selecting an existing account, which grants the account the Manager role for company navigation and adds it as that team's manager. Admins can appoint a replacement manager from the team's current members. Managers can add existing accounts to their teams and connect a managed team to projects they own or belong to. Team members then gain access to those projects and can be assigned project issues. Manager access is limited to teams they manage or belong to; personal to-dos remain private and separate.

To create the first administrator, configure both `ADMIN_EMAIL` and a long random `ADMIN_BOOTSTRAP_TOKEN` in `.env`, then register or sign in using that email and submit the token under **Admin account setup**. Keep the token private and remove it from the environment after setup. Admins can view all users and projects and manage account roles and team managers. Project owners retain control over project deletion and project-level invitations; connected team members can access and work on project issues.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
