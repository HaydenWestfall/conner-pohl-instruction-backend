// server.js
import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import Joi from "joi";

dotenv.config();

const {
  PORT = 5000,
  ZOHO_USER,
  ZOHO_PASS,
  CORS_ORIGIN = "http://localhost:5173",
  RATE_LIMIT_WINDOW_MS = 60000,
  RATE_LIMIT_MAX = 10,
} = process.env;

if (!ZOHO_USER || !ZOHO_PASS) {
  console.error("Missing ZOHO_USER or ZOHO_PASS in environment. Exiting.");
  process.exit(1);
}

const app = express();

// Basic security + logging
app.use(helmet());
app.use(morgan("tiny"));
app.use(express.json());

// CORS: allow multiple origins from env (comma-separated)
const allowedOrigins = CORS_ORIGIN.split(",").map((s) => s.trim());
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like curl, mobile apps, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

// Rate limiter to reduce spam/abuse
const limiter = rateLimit({
  windowMs: Number(RATE_LIMIT_WINDOW_MS),
  max: Number(RATE_LIMIT_MAX),
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api/contact", limiter);

// Validate inputs with Joi
const contactSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(15).allow("").optional(),
  message: Joi.string().min(1).max(5000).required(),
});

// Nodemailer transporter for Zoho SMTP
// Use port 465 (secure SSL) or 587 for STARTTLS. We'll use 465 here.
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true, // true for 465, false for 587
  auth: {
    user: ZOHO_USER,
    pass: ZOHO_PASS,
  },
  // optional: pool: true when high volume
});

// Test transporter on startup (optional but useful)
transporter.verify((err, success) => {
  if (err) {
    console.error("Error verifying SMTP transporter:", err);
  } else {
    console.log("SMTP transporter is ready");
  }
});

// POST /api/contact
app.post("/api/contact", async (req, res) => {
  // Validate
  const { error, value } = contactSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const { name, email, phone, message } = value;

  // Build email
  // IMPORTANT: Some SMTP providers (including Zoho) require `from` to be the authenticated account.
  // Put the user's email into replyTo so replies go to them.
  const mailOptions = {
    from: `${ZOHO_USER}`, // authenticated sender address (Zoho may require this)
    to: ZOHO_USER, // your inbox (could be same as ZOHO_USER or another recipient)
    subject: `CLIENT CONTACT FROM WEBSITE`,
    text: `
        Contact form submission

        Name: ${name}
        Email: ${email}
        Phone: ${phone || "N/A"}
        Message:
        ${message}
            `,
    html: `
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
            `,
    replyTo: email, // so clicking reply in email client replies to the visitor
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return res.json({ success: true, message: "Message sent." });
  } catch (err) {
    console.error("Error sending mail:", err);
    return res.status(500).json({ success: false, message: "Failed to send message." });
  }
});

// Simple HTML escape to avoid injection in the HTML body
function escapeHtml(unsafe) {
  return unsafe
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

app.listen(PORT, () => {
  console.log(`Contact mailer running on port ${PORT}`);
});
