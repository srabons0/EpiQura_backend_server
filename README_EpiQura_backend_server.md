# EpiQura: Food Delivery Platform (Backend API)

REST API for the EpiQura food-ordering platform, built with Node.js, Express.js and MongoDB. It serves the customer and admin dashboards in the frontend repo.

**Live demo (frontend):** https://epiqura.netlify.app/
**Frontend repo:** https://github.com/srabons0/EpiQura_frontend_server

## What It Does

- Product management: create, update, delete and list products
- Orders: order creation, order tracking and status control
- Payments: Stripe checkout and payment history logs
- Reviews: user ratings and admin moderation
- Users and profiles: user data and editable profiles
- Auth: verifies Firebase Authentication users and checks roles (Admin / User)
- Analytics data for the admin dashboard

## Tech Stack

| Area | Tools |
|------|-------|
| Runtime and framework | Node.js, Express.js |
| Database | MongoDB (Atlas) |
| Auth | Firebase Authentication, role-based access control |
| Payments | Stripe |
| Deployment | [add where the backend is hosted, for example Vercel or Render] |

## API Endpoints

| Method | Route | Description | Access |
|--------|-------|-------------|--------|
| GET | /[your-route] | [what it does] | Public |
| POST | /[your-route] | [what it does] | User |
| PATCH | /[your-route] | [what it does] | Admin |

(List your main 5-8 routes here. Mark which ones need login and which need the Admin role.)

## Run Locally

```bash
git clone https://github.com/srabons0/EpiQura_backend_server.git
cd EpiQura_backend_server
npm install
cp .env.example .env   # then fill in the values
npm start
```

The server runs on http://localhost:[your-port]

## Environment Variables

```
PORT=
MONGODB_URI=
STRIPE_SECRET_KEY=
[Firebase credentials, if you use them]
```

(Change these names to match your real project.) Never commit your real `.env` file or secret keys.

## Author

Sadman Sakid | [GitHub](https://github.com/srabons0) | [LinkedIn](https://www.linkedin.com/in/sadman-sakid/) | [Portfolio](https://sadmanpfl.netlify.app)
