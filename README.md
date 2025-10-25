# TravelTrack 🧳

A full-stack web application for planning and managing your travel itineraries. Built with Next.js, Supabase, and Tailwind CSS.

## Features

- ✈️ **Trip Management**: Create and manage trips with custom details
- 📅 **Interactive Calendar**: View all trips and activities on a beautiful calendar interface
- 🎯 **Itinerary Planning**: Add activities, flights, stays, restaurants, and notes to your trips
- 👤 **User Accounts**: Secure authentication with Supabase Auth
- 🎨 **Beautiful UI**: Modern design with shadcn/ui components
- 📱 **Responsive**: Works on all devices

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth)
- **Calendar**: react-big-calendar
- **State Management**: Zustand
- **Date Utilities**: date-fns, moment.js

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd travel-itinerary-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run the contents of `supabase/schema.sql`
   - Go to Settings > API and copy your project URL and anon key

4. Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Schema

The app uses three main tables:

- **users**: User profiles with preferences
- **trips**: Trip information (title, destination, dates, etc.)
- **itinerary_items**: Individual activities, flights, stays, etc.

See `supabase/schema.sql` for the complete schema with Row Level Security (RLS) policies.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   ├── page.tsx           # Main calendar page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── calendar/          # Calendar view component
│   ├── layout/            # Layout components (navigation)
│   └── modals/            # Modal components (trip, itinerary)
├── lib/
│   ├── supabase/          # Supabase client setup
│   ├── types/             # TypeScript types
│   └── utils.ts           # Utility functions
├── supabase/
│   └── schema.sql         # Database schema
└── middleware.ts          # Auth middleware
```

## Features in Detail

### Calendar View
- Month, week, day, and agenda views
- Color-coded trip and itinerary events
- Click on a date to add a new itinerary item
- Hover to see event details

### Trip Management
- Create trips with title, destination, dates, and description
- Add an emoji or color theme to each trip
- View all trips on the calendar

### Itinerary Items
- Types: Flight, Stay, Activity, Food, Note
- Add time ranges, locations, and notes
- Link items to specific trips
- All items appear on the calendar

## Next Steps / Roadmap

- [ ] Dashboard view with trip summaries
- [ ] Export itineraries as PDF
- [ ] Google Calendar integration
- [ ] Photo attachments for trips and activities
- [ ] Trip templates
- [ ] Collaborative trip planning
- [ ] Mobile app (React Native)

## Contributing

Feel free to open issues or submit pull requests!

## License

MIT
