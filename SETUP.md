# Setup Instructions

## Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account
3. Click "New Project"
4. Choose an organization or create one
5. Fill in:
   - Project name: `travel-track` (or any name you like)
   - Database password: Create a strong password (save this!)
   - Region: Choose closest to you
6. Click "Create new project"

## Step 2: Set Up the Database

1. In your Supabase project, go to the "SQL Editor" tab
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql` file
4. Paste it into the SQL Editor
5. Click "Run" (or press Ctrl/Cmd + Enter)
6. You should see "Success. No rows returned"

## Step 3: Get Your API Keys

1. In your Supabase project, go to "Settings" (gear icon in left sidebar)
2. Click on "API" in the settings menu
3. You'll see two important values:
   - **Project URL**: Something like `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public** key: A long string starting with `eyJ...`

## Step 4: Create the .env.local File

1. In the root of your project, create a new file called `.env.local`
2. Add these lines (replace with your actual values):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Replace:
- `https://your-project.supabase.co` with your actual Project URL
- `your-anon-key-here` with your actual anon public key

## Step 5: Restart the Dev Server

After creating the `.env.local` file:

1. Stop the dev server (Ctrl+C in terminal)
2. Run `npm run dev` again
3. The app should now work!

## Troubleshooting

### "URL and Key are required" error
- Make sure you created `.env.local` (not `.env` or `.env.example`)
- Make sure the file is in the root directory (same level as `package.json`)
- Make sure there are no extra spaces or quotes around the values
- Restart the dev server after creating the file

### "relation does not exist" error
- Make sure you ran the SQL schema in Supabase
- Check the SQL Editor for any errors

### Can't log in
- Make sure Row Level Security policies were created
- Try creating a new account through the signup page
