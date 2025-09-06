# Conner Pohl Instruction Backend

This is a secure Node.js/Express backend service for handling contact form submissions and sending emails via Zoho SMTP. It is designed to be used as the backend for a website contact form, with built-in validation, rate limiting, and security best practices.

## Features

- **Express.js API**: Exposes a single POST endpoint at `/api/contact` for contact form submissions.
- **Input Validation**: Uses Joi to validate incoming data (name, email, phone, message).
- **Email Sending**: Uses Nodemailer to send emails through Zoho SMTP.
- **Security**: Includes Helmet for HTTP headers, CORS configuration, and rate limiting to prevent abuse.
- **Logging**: Uses Morgan for request logging.
- **Environment-based Configuration**: Reads sensitive data and config from environment variables.

## Requirements

- Node.js v18+ (ESM support required)
- A Zoho Mail account for SMTP (with username and app password)

## Installation

1. Clone the repository.
2. Install dependencies:

   ```sh
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```
   ZOHO_USER=your-zoho-email@example.com
   ZOHO_PASS=your-zoho-app-password
   PORT=5000
   CORS_ORIGIN=http://localhost:5173
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX=10
   ```

   Adjust values as needed.

## Usage

- **Start the server:**

  ```sh
  npm start
  ```

- **Development mode (with auto-reload):**

  ```sh
  npm run dev
  ```

- The server will listen on the port specified in your `.env` file (default: 5000).

## API

### POST `/api/contact`

**Request Body:**

```json
{
  "name": "Your Name",
  "email": "your@email.com",
  "phone": "optional",
  "message": "Your message"
}
```

**Response:**

- Success: `{ "success": true, "message": "Message sent." }`
- Error: `{ "success": false, "message": "Error message" }`

## Security & Best Practices

- Only allows CORS from the specified frontend origin.
- Rate limits requests to prevent spam (configurable).
- Escapes HTML in email content to prevent injection.
- Requires all sensitive credentials to be set via environment variables.

## License

ISC
