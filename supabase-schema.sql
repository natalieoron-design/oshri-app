-- ============================================================
-- Oshri App - Supabase Database Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null check (role in ('therapist', 'patient')),
  avatar_url text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Therapist can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'therapist'
    )
  );

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- PATIENT DETAILS TABLE
-- ============================================================
create table public.patient_details (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade unique,
  therapist_id uuid references public.profiles(id),
  goal_weight numeric(5,2),
  weigh_in_day integer check (weigh_in_day between 0 and 6), -- 0=Sunday, 6=Saturday
  daily_water_goal integer default 8, -- cups
  daily_calorie_goal integer default 2000,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.patient_details enable row level security;

create policy "Patients view own details"
  on public.patient_details for select
  using (auth.uid() = patient_id);

create policy "Therapist view all patient details"
  on public.patient_details for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'therapist'
    )
  );

create policy "Therapist manage patient details"
  on public.patient_details for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'therapist'
    )
  );

create policy "Patient insert own details"
  on public.patient_details for insert
  with check (auth.uid() = patient_id);

-- ============================================================
-- INVITE TOKENS TABLE
-- ============================================================
create table public.invite_tokens (
  id uuid default uuid_generate_v4() primary key,
  token text unique not null,
  email text,
  therapist_id uuid references public.profiles(id),
  used boolean default false,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

alter table public.invite_tokens enable row level security;

create policy "Therapist manage invites"
  on public.invite_tokens for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'therapist'
    )
  );

create policy "Anyone can read invite by token"
  on public.invite_tokens for select
  using (true);

-- ============================================================
-- FOOD DIARY TABLE
-- ============================================================
create table public.food_diary (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade,
  logged_at timestamptz default now(),
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  description text not null,
  input_type text check (input_type in ('text', 'photo', 'voice')),
  photo_url text,
  voice_url text,
  calories numeric(7,2),
  protein numeric(7,2),
  carbs numeric(7,2),
  fat numeric(7,2),
  fiber numeric(7,2),
  ai_analysis jsonb,
  created_at timestamptz default now()
);

alter table public.food_diary enable row level security;

create policy "Patients manage own food diary"
  on public.food_diary for all
  using (auth.uid() = patient_id);

create policy "Therapist view all food diary"
  on public.food_diary for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'therapist'
    )
  );

-- ============================================================
-- WATER INTAKE TABLE
-- ============================================================
create table public.water_intake (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade,
  date date not null,
  cups integer default 0,
  updated_at timestamptz default now(),
  unique(patient_id, date)
);

alter table public.water_intake enable row level security;

create policy "Patients manage own water intake"
  on public.water_intake for all
  using (auth.uid() = patient_id);

create policy "Therapist view all water intake"
  on public.water_intake for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'therapist'
    )
  );

-- ============================================================
-- WEIGHT LOGS TABLE
-- ============================================================
create table public.weight_logs (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade,
  weight numeric(5,2) not null,
  logged_at date not null,
  notes text,
  created_at timestamptz default now(),
  unique(patient_id, logged_at)
);

alter table public.weight_logs enable row level security;

create policy "Patients manage own weight logs"
  on public.weight_logs for all
  using (auth.uid() = patient_id);

create policy "Therapist view all weight logs"
  on public.weight_logs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'therapist'
    )
  );

-- ============================================================
-- RECOMMENDATIONS TABLE
-- ============================================================
create table public.recommendations (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade,
  therapist_id uuid references public.profiles(id),
  type text check (type in ('nutrition', 'supplement', 'exercise', 'general')),
  title text not null,
  content text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.recommendations enable row level security;

create policy "Patients view own recommendations"
  on public.recommendations for select
  using (auth.uid() = patient_id and is_active = true);

create policy "Therapist manage all recommendations"
  on public.recommendations for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'therapist'
    )
  );

-- ============================================================
-- AI INSIGHTS TABLE
-- ============================================================
create table public.ai_insights (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  insight_type text check (insight_type in ('nutrition', 'menu', 'recipe', 'general')),
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  therapist_notes text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  generated_at timestamptz default now()
);

alter table public.ai_insights enable row level security;

create policy "Patients view approved insights"
  on public.ai_insights for select
  using (auth.uid() = patient_id and status = 'approved');

create policy "Therapist manage all insights"
  on public.ai_insights for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'therapist'
    )
  );

-- ============================================================
-- MESSAGES TABLE
-- ============================================================
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  is_read boolean default false,
  message_type text default 'manual' check (message_type in ('manual', 'auto_missed_weigh', 'auto_encouragement')),
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Users view their messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Users send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Users update own received messages"
  on public.messages for update
  using (auth.uid() = recipient_id);

create policy "Therapist manage all messages"
  on public.messages for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'therapist'
    )
  );

-- ============================================================
-- PRODUCTS TABLE (Shop)
-- ============================================================
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  name_he text not null,
  description text,
  description_he text,
  price numeric(8,2) not null,
  image_url text,
  is_active boolean default true,
  stock integer default 0,
  created_at timestamptz default now()
);

alter table public.products enable row level security;

create policy "Anyone can view active products"
  on public.products for select
  using (is_active = true);

create policy "Therapist manage products"
  on public.products for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'therapist'
    )
  );

-- Insert default products
insert into public.products (name, name_he, description, description_he, price, stock) values
  ('Face Serum', 'סרום פנים', 'Natural face serum', 'סרום פנים טבעי', 150, 50),
  ('Face & Body Cream', 'קרם פנים וגוף', 'Nourishing face and body cream', 'קרם פנים וגוף מזין', 100, 50),
  ('Calendula Cream', 'קרם קלנדולה', 'Soothing calendula cream', 'קרם קלנדולה מרגיע', 70, 50),
  ('Healing Candle', 'נר ריפוי', 'Aromatherapy healing candle', 'נר ארומתרפי מרפא', 70, 50);

-- ============================================================
-- ORDERS TABLE
-- ============================================================
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  total_amount numeric(10,2),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.orders enable row level security;

create policy "Patients manage own orders"
  on public.orders for all
  using (auth.uid() = patient_id);

create policy "Therapist manage all orders"
  on public.orders for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'therapist'
    )
  );

-- ============================================================
-- ORDER ITEMS TABLE
-- ============================================================
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  quantity integer not null,
  unit_price numeric(8,2) not null
);

alter table public.order_items enable row level security;

create policy "Users view own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where id = order_id and patient_id = auth.uid()
    )
  );

create policy "Therapist view all order items"
  on public.order_items for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'therapist'
    )
  );

create policy "Users insert own order items"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders
      where id = order_id and patient_id = auth.uid()
    )
  );

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'patient')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update updated_at timestamps
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger patient_details_updated_at before update on public.patient_details
  for each row execute procedure public.update_updated_at();

create trigger recommendations_updated_at before update on public.recommendations
  for each row execute procedure public.update_updated_at();
