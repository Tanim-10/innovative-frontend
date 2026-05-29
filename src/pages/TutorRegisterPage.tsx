import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tutorsApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, UserCheck, ShieldAlert, Award } from 'lucide-react';
import SEO from '@/components/SEO';

const EXPERTISE_OPTIONS = [
  'Arduino',
  'Raspberry Pi',
  'ROS (Robot Operating System)',
  'IoT & Wireless',
  '3D Printing & CAD',
  'PCB Design',
  'Embedded C/Python',
  'Robotic Kinematics',
  'Computer Vision (OpenCV)'
];

const TutorRegisterPage = () => {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bio, setBio] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckboxChange = (option: string, checked: boolean) => {
    if (checked) {
      setSelectedExpertise([...selectedExpertise, option]);
    } else {
      setSelectedExpertise(selectedExpertise.filter(item => item !== option));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to submit your tutor application.',
        variant: 'destructive'
      });
      navigate('/login?redirect=/tutor-registration');
      return;
    }

    if (!bio.trim() || bio.trim().length < 50) {
      toast({
        title: 'Detailed bio required',
        description: 'Please write a brief bio of at least 50 characters describing your tutoring background.',
        variant: 'destructive'
      });
      return;
    }

    if (selectedExpertise.length === 0) {
      toast({
        title: 'Select expertise',
        description: 'Please select at least one area of robotics or embedded expertise.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await tutorsApi.apply({ bio, expertise: selectedExpertise });
      if (res.success) {
        await refreshUser();
        toast({
          title: 'Application Submitted!',
          description: 'Your tutor profile application is pending admin approval.'
        });
        navigate('/account?tab=settings');
      }
    } catch (err) {
      toast({
        title: 'Application failed',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md min-h-[60vh] flex flex-col justify-center">
        <ShieldAlert className="w-12 h-12 mx-auto text-warning mb-4" />
        <h2 className="text-2xl font-bold mb-2">Please Login</h2>
        <p className="text-muted-foreground mb-6">You must have an account to register as a robotics tutor.</p>
        <Button onClick={() => navigate('/login?redirect=/tutor-registration')}>Log In</Button>
      </div>
    );
  }

  // Already a tutor check
  if (user?.role === 'tutor') {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md min-h-[60vh] flex flex-col justify-center">
        <UserCheck className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Already Registered</h2>
        {user.tutorStatus === 'approved' ? (
          <>
            <p className="text-muted-foreground mb-6">Your tutor profile is approved! You can now start creating courses and booking sessions.</p>
            <Button onClick={() => navigate('/tutor-dashboard')}>Go to Tutor Dashboard</Button>
          </>
        ) : user.tutorStatus === 'pending' ? (
          <p className="text-muted-foreground">Your tutor application is currently pending administrator approval. We will review it shortly.</p>
        ) : (
          <p className="text-muted-foreground">Your tutor application was rejected or suspended. Please contact support.</p>
        )}
      </div>
    );
  }

  return (
    <>
      <SEO title="Become a Robotics Tutor" description="Apply to become a robotics tutor on Innovative Hub." path="/tutor-registration" noIndex />
      <div className="network-bg py-10 sm:py-16 md:py-20 min-h-screen">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <Award className="w-12 h-12 mx-auto text-primary mb-3" />
            <h1 className="text-3xl font-bold tracking-tight mb-2">Join as a Robotics Tutor</h1>
            <p className="text-muted-foreground">Share your knowledge with robotics learners, build courses, and conduct 1-on-1 sessions.</p>
          </div>

          <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-6 sm:p-10 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about your background, experience in robotics or IoT, teaching style, or projects you have built. (Min. 50 characters)"
                  className="min-h-[120px] bg-background/50"
                  required
                />
              </div>

              <div className="space-y-4">
                <Label>Robotics & Embedded Systems Expertise</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {EXPERTISE_OPTIONS.map((option) => (
                    <div key={option} className="flex items-start space-x-2 bg-background/30 p-2.5 rounded-lg border border-border/40 hover:bg-background/50 transition-colors">
                      <Checkbox
                        id={`exp-${option}`}
                        checked={selectedExpertise.includes(option)}
                        onCheckedChange={(checked) => handleCheckboxChange(option, !!checked)}
                      />
                      <Label htmlFor={`exp-${option}`} className="text-sm font-medium leading-none cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full py-6 text-base font-semibold" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting Application...' : 'Submit Tutor Application'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default TutorRegisterPage;
