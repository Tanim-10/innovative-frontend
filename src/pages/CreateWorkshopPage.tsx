import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { workshopsApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, ShieldAlert, CheckCircle } from 'lucide-react';
import SEO from '@/components/SEO';

const CreateWorkshopPage = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: '',
    meetingLink: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please login to submit a workshop request.',
        variant: 'destructive',
      });
      navigate('/login?redirect=/workshops/create');
      return;
    }

    if (!form.title.trim() || !form.description.trim() || !form.date || !form.time.trim() || !form.duration.trim() || !form.meetingLink.trim()) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill out all fields.',
        variant: 'destructive',
      });
      return;
    }

    // Basic URL validation
    if (!/^https?:\/\/.+/.test(form.meetingLink.trim())) {
      toast({
        title: 'Invalid Meeting Link',
        description: 'Meeting link must be a valid URL starting with http:// or https://',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await workshopsApi.create(form);
      if (res.success) {
        setSubmitted(true);
        toast({
          title: 'Success!',
          description: 'Workshop proposal submitted successfully.',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Submission Failed',
        description: err.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md min-h-[60vh] flex flex-col justify-center text-foreground">
        <ShieldAlert className="w-12 h-12 mx-auto text-warning mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold mb-2">Please Login</h2>
        <p className="text-muted-foreground mb-6">You must log in to apply for hosting a workshop.</p>
        <Button onClick={() => navigate('/login?redirect=/workshops/create')}>Log In</Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md min-h-[60vh] flex flex-col justify-center text-foreground">
        <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
        <p className="text-muted-foreground mb-6">
          Your workshop request has been sent for administrative review. We will verify the details and list it shortly.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate('/workshops')}>Back to Workshops</Button>
          <Button onClick={() => setSubmitted(false)}>Host Another</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO title="Host a Robotics Workshop" description="Apply to list and host a live robotics learning session." path="/workshops/create" noIndex />
      
      <div className="network-bg min-h-screen py-10 sm:py-16 md:py-20 text-foreground">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Back link */}
          <button 
            onClick={() => navigate('/workshops')} 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Workshops
          </button>

          <Card className="bg-card/60 backdrop-blur-sm border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Host a Workshop</CardTitle>
              <CardDescription>
                Propose a topic, schedule a slot, and share your expertise. Workshops will go live in the catalog upon moderator approval.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="w-title">Workshop Title</Label>
                  <Input 
                    id="w-title" 
                    placeholder="e.g. Getting Started with Arduino Motor Shield Drivers" 
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    className="bg-background/50 border-border"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="w-desc">Brief Description / Prerequisites</Label>
                  <Textarea 
                    id="w-desc" 
                    placeholder="Describe what students will build, the topics covered, and what hardware components they should have ready." 
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                    className="min-h-[100px] bg-background/50 border-border"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="w-date">Scheduled Date</Label>
                    <Input 
                      id="w-date" 
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                      className="bg-background/50 border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="w-time">Time Slot (e.g. 14:00 - 15:30)</Label>
                    <Input 
                      id="w-time" 
                      placeholder="e.g. 03:00 PM - 04:30 PM"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      required
                      className="bg-background/50 border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="w-duration">Duration (e.g., 90 mins)</Label>
                    <Input 
                      id="w-duration" 
                      placeholder="e.g. 1.5 hours"
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      required
                      className="bg-background/50 border-border"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="w-link">Virtual Meeting Join URL (Zoom / Meet link)</Label>
                  <Input 
                    id="w-link" 
                    type="url"
                    placeholder="https://meet.google.com/abc-defg-hij" 
                    value={form.meetingLink}
                    onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                    required
                    className="bg-background/50 border-border"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This link will only be visible to students who successfully enroll in your workshop.
                  </p>
                </div>

                <Button type="submit" className="w-full font-semibold gap-1.5 mt-4 py-5" disabled={isSubmitting}>
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Submitting proposal...' : 'Submit Workshop Proposal'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default CreateWorkshopPage;
