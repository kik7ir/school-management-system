# School Management System

A web-based school management system that can be deployed on Netlify with database functionality.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory with the following variables:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   ```

3. **Local Development**
   ```bash
   npm run dev
   ```
   This will start the Netlify development server.

## Deployment

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket).
2. Log in to your Netlify account.
3. Click "New site from Git".
4. Select your repository.
5. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Add environment variables in Netlify's site settings:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase anon/public key
7. Click "Deploy site".

## Database Setup

1. Create a Supabase account at https://supabase.com/
2. Create a new project.
3. In the Supabase dashboard, create tables for your application.
4. Use the `db` object from `js/netlify-db.js` in your frontend code to interact with the database.

## Features

- Student Management
- Attendance Tracking
- Fee Management
- Reports Generation
- Responsive Design

## License

MIT
