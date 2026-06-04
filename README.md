# BZR Backend Service

This is the backend service for the BZR (CoolYourHome) project, built with Express.js and MySQL.

## Features

- **Authentication**: JWT-based auth with Google Login integration.
- **Product Management**: API routes for managing products and interacting with WooCommerce.
- **Order Processing**: Integrated with Stripe and Cashfree for payments.
- **File Uploads**: Image upload support using Multer.
- **Security**: CORS protection and reCAPTCHA verification.

## Prerequisites

- Node.js (v16+)
- MySQL Database
- WooCommerce API Credentials (optional, for WC integration)
- Stripe / Cashfree Accounts (for payments)

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (see below).

## Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

| Variable | Description |
| :--- | :--- |
| `PORT` | The port the server will run on (e.g., 8080) |
| `FRONTEND_URL` | The allowed CORS origin for the frontend |
| `DB_HOST` | MySQL database host |
| `DB_USER` | MySQL database user |
| `DB_PASSWORD` | MySQL database password |
| `DB_NAME` | MySQL database name |
| `JWT_SECRET` | Secret key for JWT signing |
| `WC_URL` | WooCommerce site URL |
| `WC_CONSUMER_KEY` | WooCommerce Consumer Key |
| `WC_CONSUMER_SECRET` | WooCommerce Consumer Secret |
| `STRIPE_SECRET_KEY` | Stripe Secret API Key |
| `CASHFREE_APP_ID` | Cashfree App ID |
| `CASHFREE_SECRET_KEY` | Cashfree Secret Key |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `RECAPTCHA_SECRET_KEY`| Google reCAPTCHA Secret Key |

## Running the Server

### Development Mode
Runs the server using `node server.js`.
```bash
npm run dev
```

### Production Mode
Starts the server for production deployment.
```bash
npm start
```

## API Endpoints

- `/api` - Authentication and miscellaneous routes.
- `/api/products` - Product management.
- `/api/orders` - Order management.
- `/api/cashfree` - Cashfree payment integration.
- `/api/wc` - WooCommerce API proxy.
- `/api/cart` - Cart management.
- `/api/upload` - Image upload endpoint.

## Project Structure

- `config/` - Database and service configurations.
- `controllers/` - Business logic for API endpoints.
- `routes/` - Express route definitions.
- `utils/` - Utility functions and helpers.
- `scripts/` - Maintenance scripts.
- `../public/images/` - Directory where uploaded images are stored (served via `/images`).
