# Setup Guide - אושרי הרץ רפואה משלימה

## 1. Create a Supabase Project

1. Go to https://supabase.com and create a new project
2. Note your **Project URL** and **anon key** from Project Settings → API

## 2. Run the Database Schema

In the Supabase dashboard → SQL Editor, paste and run the contents of `supabase-schema.sql`

## 3. Create Storage Bucket

In Supabase → Storage, create a bucket named `meal-photos` with public access.

## 4. Configure Environment Variables

Edit `.env.local` and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Get your **Anthropic API key** from https://console.anthropic.com

## 5. Create the Therapist Account

In Supabase → Authentication → Users, create the therapist user manually:
1. Click "Add user"
2. Enter email and password
3. After creation, run this SQL to set the role:
```sql
UPDATE public.profiles 
SET role = 'therapist', full_name = 'אושרי הרץ'
WHERE email = 'your-therapist@email.com';
```

## 6. Start the App

```bash
npm run dev
```

Open http://localhost:3000

## 7. Invite Patients

1. Log in as the therapist
2. Go to **מטופלים** → **הזמן מטופל**
3. Enter the patient's email and copy the invite link
4. Send the link to the patient — they use it to register

## User Roles

- **מטפלת (Therapist)**: Full dashboard, patient management, AI insights approval
- **מטופל (Patient)**: Food diary, weight tracking, recommendations, shop

## Features

- 🍽️ **Food Diary**: Text, photo (AI vision), or voice input with automatic calorie/macro calculation
- ⚖️ **Weight Tracking**: Weekly weigh-in with progress chart and goal tracking  
- 📋 **Recommendations**: Therapist writes nutrition/supplement/exercise recommendations
- 🤖 **AI Insights**: AI generates menu suggestions, therapist approves before patients see them
- 💬 **Messages**: Direct messaging + automatic reminders (missed weigh-in, encouragement)
- 🛍️ **Shop**: Natural cosmetics products with order management
