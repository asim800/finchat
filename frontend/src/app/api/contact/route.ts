// ============================================================================
// FILE: app/api/contact/route.ts
// Contact form submission endpoint with email functionality
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { EmailService } from '@/lib/email-service';

// Contact form validation schema
const ContactSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  selectedTopics: z.array(z.string()).min(1, 'Please select at least one topic'),
  message: z.string().min(1, 'Please provide a message').max(1000, 'Message is too long'),
  userName: z.string().nullable().optional(),
  isAuthenticated: z.boolean()
});


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = ContactSchema.parse(body);
    
    // Check rate limiting (simple in-memory check)
    // TODO: Implement proper rate limiting with Redis or database
    
    // Send email using EmailService
    const emailSent = await EmailService.sendContactEmail({
      userEmail: validatedData.email,
      userName: validatedData.userName,
      selectedTopics: validatedData.selectedTopics,
      message: validatedData.message,
      isAuthenticated: validatedData.isAuthenticated
    });
    
    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send email. Please try again later.' },
        { status: 500 }
      );
    }

    // Log contact submission for analytics (optional)
    console.log('📊 Contact form submitted:', {
      email: validatedData.email,
      topics: validatedData.selectedTopics,
      isAuthenticated: validatedData.isAuthenticated,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully!'
    });

  } catch (error) {
    console.error('Contact form submission error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid form data', 
          details: error.errors.map(e => e.message).join(', ')
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve contact form configuration (optional)
export async function GET() {
  return NextResponse.json(EmailService.getContactConfig());
}