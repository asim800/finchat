// ============================================================================
// FILE: app/contact/page.tsx
// Contact Us page with badge selection and email functionality
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GuestModeIndicator } from '@/components/ui/guest-mode-indicator';
import { AuthenticatedTopBar } from '@/components/ui/authenticated-top-bar';
import { GuestTopBar } from '@/components/ui/guest-top-bar';
import { FinancialDisclaimerFooter } from '@/components/ui/financial-disclaimer-footer';
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface ContactForm {
  email: string;
  selectedTopics: string[];
  message: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

const CONTACT_TOPICS = [
  { id: 'membership', label: 'Membership Plans', icon: '💎' },
  { id: 'optimization', label: 'Portfolio Optimization', icon: '📈' },
  { id: 'risk', label: 'Portfolio Risk', icon: '⚖️' },
  { id: 'retirement', label: 'Retirement', icon: '🏖️' },
  { id: 'monte-carlo', label: 'Monte Carlo Simulations', icon: '🎲' },
  { id: 'other', label: 'Something Else', icon: '💬' }
];

export default function ContactPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [form, setForm] = useState<ContactForm>({
    email: '',
    selectedTopics: [],
    message: ''
  });

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
          setIsAuthenticated(true);
          setForm(prev => ({ ...prev, email: userData.user.email }));
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleTopicToggle = (topicId: string) => {
    setForm(prev => ({
      ...prev,
      selectedTopics: prev.selectedTopics.includes(topicId)
        ? prev.selectedTopics.filter(id => id !== topicId)
        : [...prev.selectedTopics, topicId]
    }));
  };

  const handleInputChange = (field: keyof ContactForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!form.email || !form.email.includes('@')) {
      setErrorMessage('Please provide a valid email address');
      return false;
    }
    
    if (form.selectedTopics.length === 0) {
      setErrorMessage('Please select at least one topic');
      return false;
    }
    
    if (!form.message.trim()) {
      setErrorMessage('Please tell us how we can help you');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!validateForm()) {
      setSubmitStatus('error');
      return;
    }

    setSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email,
          selectedTopics: form.selectedTopics,
          message: form.message,
          userName: user ? `${user.firstName} ${user.lastName}` : null,
          isAuthenticated
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      setSubmitStatus('success');
      // Reset form
      setForm({
        email: isAuthenticated ? user?.email || '' : '',
        selectedTopics: [],
        message: ''
      });
    } catch (error) {
      console.error('Contact form submission error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send message. Please try again.');
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <GuestTopBar />
        <main className="flex-grow">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </main>
        <FinancialDisclaimerFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Use consistent top bar components */}
      {isAuthenticated && user ? (
        <AuthenticatedTopBar user={user} />
      ) : (
        <GuestTopBar />
      )}

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-primary mr-3" />
                <h1 className="text-3xl font-bold text-foreground">Contact Us</h1>
              </div>
              <p className="text-lg text-muted-foreground">
                We&apos;re here to help! Select the topics you&apos;re interested in and tell us how we can assist you.
              </p>
            </div>

            {/* Authentication Status */}
            {!isAuthenticated && (
              <div className="mb-6">
                <GuestModeIndicator variant="demo-only" />
              </div>
            )}

            {/* Success Message */}
            {submitStatus === 'success' && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Thank you for contacting us! We&apos;ve received your message and will get back to you soon.
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {submitStatus === 'error' && errorMessage && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                  <CardDescription>
                    {isAuthenticated 
                      ? "We&apos;ll respond to your registered email address" 
                      : "Please provide your email so we can respond to you"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    type="email"
                    placeholder="your.email@example.com"
                    value={form.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={isAuthenticated}
                    className={isAuthenticated ? 'bg-gray-50' : ''}
                    required
                  />
                  {isAuthenticated && (
                    <p className="text-sm text-gray-500 mt-2">
                      Signed in as {user?.firstName} {user?.lastName}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Topic Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What can we help you with?</CardTitle>
                  <CardDescription>
                    Select one or more topics that best describe your inquiry
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CONTACT_TOPICS.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => handleTopicToggle(topic.id)}
                        className={`p-3 rounded-lg border transition-all text-left ${
                          form.selectedTopics.includes(topic.id)
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{topic.icon}</span>
                          <span className="font-medium">{topic.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Selected Topics Display */}
                  {form.selectedTopics.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Selected topics:</p>
                      <div className="flex flex-wrap gap-2">
                        {form.selectedTopics.map((topicId) => {
                          const topic = CONTACT_TOPICS.find(t => t.id === topicId);
                          return topic ? (
                            <Badge key={topicId} variant="secondary">
                              {topic.icon} {topic.label}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Message */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tell us how we can help</CardTitle>
                  <CardDescription>
                    Please provide details about your question or request
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Describe your question, concern, or how we can assist you..."
                    value={form.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    rows={6}
                    className="resize-none"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    {form.message.length}/1000 characters
                  </p>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="min-w-[120px]"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Additional Help */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Need immediate assistance?</h3>
              <p className="text-sm text-gray-600">
                For urgent matters or technical support, you can also reach us directly at{' '}
                <a href="mailto:quantwell7@gmail.com" className="text-blue-600 hover:underline">
                  quantwell7@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Financial Disclaimer Footer */}
      <FinancialDisclaimerFooter />
    </div>
  );
}