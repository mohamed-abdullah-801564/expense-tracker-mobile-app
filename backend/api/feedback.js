// backend/api/feedback.js
// Serverless function to handle user feedback

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { rating, message, timestamp } = req.body;

    if (!rating) {
      return res.status(400).json({ error: 'Rating is required' });
    }

    // Prepare data for logging or email service integration
    const feedbackSummary = {
      to: 'abdullah80905436780@gmail.com',
      subject: `App Feedback: ${rating} Stars`,
      text: `User Rating: ${rating}/5\nMessage: ${message || 'No suggestions'}\nReceived: ${timestamp}`,
      rating,
      message,
      timestamp
    };

    console.log('Feedback received:', feedbackSummary);

    // In a real production environment, you would use a service like Nodemailer, SendGrid, or Postmark here.
    // For this implementation, we acknowledge receipt and suggest the mobile app handles mailto fallback if needed.

    return res.status(200).json({ 
      success: true, 
      message: 'Feedback received successfully. Thank you!',
      data: feedbackSummary 
    });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
