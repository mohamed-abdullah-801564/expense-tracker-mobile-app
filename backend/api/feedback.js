// backend/api/feedback.js
// Serverless function to handle user feedback

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { rating, message, timestamp } = req.body;

    if (!rating) {
      return res.status(400).json({ error: 'Rating is required' });
    }

    const { data, error } = await resend.emails.send({
      from: 'Expense Tracker <onboarding@resend.dev>',
      to: 'abdullah80905436780@gmail.com',
      subject: `App Feedback: ${rating} Stars`,
      text: `User Rating: ${rating}/5\nMessage: ${message || 'No suggestions'}\nReceived: ${timestamp}`,
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
