# 🎓 نظام جمع البيانات - Student Data System

A professional, fast, and clean web application for student data collection, designed for school teachers. Built with modern web technologies for the best performance and user experience.

## ✨ Features

- 🔐 **Email OTP Authentication** - Secure login without passwords using email verification codes
- 🌍 **Bilingual Support** - Full Arabic (RTL) and English (LTR) language support
- 🌙 **Dark/Light Mode** - Theme preference saved and persisted
- 📱 **Responsive Design** - Mobile-first approach, works on all devices
- ✅ **Form Validation** - Comprehensive client and server-side validation
- 🔒 **Data Security** - Users can only access and edit their own data
- ⚡ **Fast Performance** - Optimized for speed with Next.js 16 and Turbopack

## 🧾 Student Data Fields

| Field | Required | Validation |
|-------|----------|------------|
| Student Full Name (Arabic) | ✅ | Arabic characters only, 4 names |
| Class/Grade | ✅ | Dropdown selection |
| Parent Phone | ✅ | 11 digits, starts with 01 |
| Parent Email | ✅ | Valid email format |
| Gender | ✅ | Male / Female |
| WhatsApp Number | ❌ | Optional, 11 digits |

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Animations**: Framer Motion

## 📦 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (Neon recommended)

### 1. Clone the repository

```bash
git clone https://github.com/ziadamr45/Eleqbal-Form.git
cd Eleqbal-Form
```

### 2. Install dependencies

```bash
npm install
# or
bun install
```

### 3. Set up environment variables

Copy the example environment file and fill in your database URL:

```bash
cp .env.example .env
```

Edit `.env` and add your database URL:

```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

### 4. Set up the database

```bash
npx prisma db push
npx prisma generate
```

### 5. Run the development server

```bash
npm run dev
# or
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🚀 Deployment on Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your repository
3. Set the `DATABASE_URL` environment variable in Vercel settings
4. Deploy!

## 📁 Project Structure

```
├── prisma/
│   └── schema.prisma        # Database schema
├── public/
│   └── school-logo.jpg      # School logo
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── send-otp/     # Send OTP endpoint
│   │   │   │   ├── verify-otp/   # Verify OTP endpoint
│   │   │   │   ├── me/           # Get current user
│   │   │   │   └── logout/       # Logout endpoint
│   │   │   └── student/          # Student CRUD endpoint
│   │   ├── globals.css           # Global styles
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Main page
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── header.tsx            # App header
│   │   ├── footer.tsx            # App footer
│   │   ├── login-form.tsx        # OTP login form
│   │   ├── student-form.tsx      # Student data form
│   │   └── providers.tsx         # Theme + language providers
│   └── lib/
│       ├── db.ts                 # Prisma client
│       ├── utils.ts              # Utility functions
│       └── i18n/
│           ├── translations.ts   # AR/EN translations
│           └── context.tsx       # Language context
├── .env.example                  # Environment template
└── package.json
```

## 🔒 Security Notes

- Session tokens are stored in HTTP-only cookies
- Each user can only access their own student data
- OTP codes expire after 5 minutes
- Sessions expire after 30 days
- All API endpoints validate authentication

## 📝 License

MIT License - Developed for educational purposes.

---

**Developed by** [مستر عمرو صبحي](https://github.com/ziadamr45) | رقمينة
