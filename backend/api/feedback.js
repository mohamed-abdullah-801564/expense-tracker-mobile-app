// backend/api/feedback.js
// Serverless function to handle user feedback

import { Resend } from 'resend';

// In-memory rate limiting (per warm serverless instance)
const feedbackRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_FEEDBACK_PER_HOUR = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = feedbackRateLimitMap.get(ip) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= MAX_FEEDBACK_PER_HOUR) {
    return true;
  }
  recent.push(now);
  feedbackRateLimitMap.set(ip, recent);
  return false;
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'You have submitted feedback recently. Please wait before submitting again.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured');
    return res.status(500).json({ error: 'Email service is not configured' });
  }

  try {
    const { rating, message, timestamp } = req.body || {};

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
    }

    const safeMessage = typeof message === 'string' ? message.slice(0, 5000) : '';
    const safeTimestamp = typeof timestamp === 'string' ? timestamp.slice(0, 100) : new Date().toISOString();

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: 'Expense Tracker <onboarding@resend.dev>',
      to: 'abdullah80905436780@gmail.com',
      subject: `App Feedback: ${numRating} Stars`,
      text: `User Rating: ${numRating}/5\nMessage: ${safeMessage || 'No suggestions'}\nReceived: ${safeTimestamp}`,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Feedback sent successfully. Thank you!',
      data 
    });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

