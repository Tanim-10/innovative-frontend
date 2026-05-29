import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { internshipsApi, InternshipApplication } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Briefcase, Cpu, Layers, Code, FileText, Link2, 
  User, Mail, Phone, CheckCircle2, AlertCircle, 
  ExternalLink, Calendar, GraduationCap, ChevronRight 
} from 'lucide-react';
import SEO from '@/components/SEO';

const SKILL_OPTIONS = [
  'C/C++ Programming',
  'Python Programming',
  'Arduino & ESP32 Microcontrollers',
  'STM32 & ARM Cortex-M',
  'PCB Designing (KiCad / Altium)',
  'ROS / ROS2 (Robot Operating System)',
  'IoT Protocols (MQTT, HTTP, WebSockets)',
  'Autonomous Navigation & SLAM',
  '3D CAD Modeling (Fusion360/SolidWorks)',
  'Embedded Linux (Raspberry Pi/Yocto)'
];

const INTERNSHIP_TRACKS = [
  {
    title: 'Robotics Firmware & Embedded Systems',
    icon: Cpu,
    description: 'Focus on writing low-level drivers, RTOS integration, sensor fusion, and actuator control. Work with ESP32, STM32, and Arduino platforms.',
    skillsNeeded: ['C/C++', 'FreeRTOS', 'Microcontrollers', 'I2C/SPI/UART']
  },
  {
    title: 'PCB Designing & Hardware Engineering',
    icon: Layers,
    description: 'Design electrical schematics, component selection, board layout, routing high-frequency signals, and fabricating 2/4-layer robotics boards.',
    skillsNeeded: ['KiCad/Altium', 'Eagle', 'Circuit Schematics', 'BOM Management']
  },
  {
    title: 'ROS & Autonomous Navigation',
    icon: Code,
    description: 'Develop autonomous behaviors, path planning, obstacle avoidance, and localization using SLAM and LiDAR on mobile robotic platforms.',
    skillsNeeded: ['ROS2/ROS', 'Python/C++', 'Linux/Ubuntu', 'Kinematics']
  },
  {
    title: 'IoT Architectures & Robotics Cloud',
    icon: Briefcase,
    description: 'Build backend telemetry connections for hardware sensors, real-time control panels, cloud pipelines, and remote robot diagnostics.',
    skillsNeeded: ['MQTT/HTTP', 'Node.js/Python', 'WebSockets', 'AWS IoT/Node-RED']
  }
];

const InternshipsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'info' | 'apply' | 'applications'>('info');
  const [myApplications, setMyApplications] = useState<InternshipApplication[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    skills: [] as string[],
    resumeUrl: '',
    coverLetter: '',
    portfolioUrl: ''
  });

  // Load user data into form when logged in
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || ''
      }));
    }
  }, [user]);

  // Load user applications
  const fetchMyApplications = async () => {
    if (!isAuthenticated) return;
    setIsLoadingApps(true);
    try {
      const res = await internshipsApi.getMyApplications();
      if (res.success) {
        setMyApplications(res.data);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setIsLoadingApps(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyApplications();
    }
  }, [isAuthenticated]);

  const handleSkillChange = (skill: string, checked: boolean) => {
    if (checked) {
      setForm(prev => ({ ...prev, skills: [...prev.skills, skill] }));
    } else {
      setForm(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to submit your internship application.',
        variant: 'destructive'
      });
      navigate('/login?redirect=/internships');
      return;
    }

    // Validation
    if (!form.name.trim() || !form.email.trim() || !form.mobile.trim() || !form.resumeUrl.trim() || !form.coverLetter.trim()) {
      toast({
        title: 'Required Fields Missing',
        description: 'Please fill out all mandatory fields.',
        variant: 'destructive'
      });
      return;
    }

    if (form.skills.length === 0) {
      toast({
        title: 'Select Skills',
        description: 'Please select at least one relevant skill.',
        variant: 'destructive'
      });
      return;
    }

    if (!/^https?:\/\/.+/.test(form.resumeUrl.trim())) {
      toast({
        title: 'Invalid Resume Link',
        description: 'Resume link must be a valid URL (Google Drive, Dropbox, etc.) starting with http:// or https://',
        variant: 'destructive'
      });
      return;
    }

    if (form.portfolioUrl.trim() && !/^https?:\/\/.+/.test(form.portfolioUrl.trim())) {
      toast({
        title: 'Invalid Portfolio Link',
        description: 'Portfolio link must be a valid URL starting with http:// or https://',
        variant: 'destructive'
      });
      return;
    }

    if (form.coverLetter.trim().length < 50) {
      toast({
        title: 'Cover Letter Too Short',
        description: 'Please write a brief cover letter of at least 50 characters describing your interest and background.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await internshipsApi.apply(form);
      if (res.success) {
        toast({
          title: 'Application Submitted!',
          description: 'Your internship application has been successfully recorded.'
        });
        // Clear form details except contact details
        setForm(prev => ({
          ...prev,
          skills: [],
          resumeUrl: '',
          coverLetter: '',
          portfolioUrl: ''
        }));
        await fetchMyApplications();
        setActiveTab('applications');
      }
    } catch (err: any) {
      toast({
        title: 'Application Failed',
        description: err.message || 'Something went wrong during submission.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: InternshipApplication['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border border-amber-500/20">Pending Review</Badge>;
      case 'under-review':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border border-blue-500/20">Under Review</Badge>;
      case 'shortlisted':
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Shortlisted</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-rose-500/10 text-rose-500 border border-rose-500/20">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <SEO 
        title="Robotics & IoT Internships" 
        description="Apply for live hands-on internships in Robotics Firmware, PCB Design, IoT Architectures, and Autonomous Navigation with ROS at Innovative Hub." 
        path="/internships" 
      />

      <div className="network-bg min-h-screen py-10 sm:py-16 md:py-20 text-foreground">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto mb-12 border-b border-border/40 pb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Robotics & IoT Internship Program
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Launch your career in hardware and systems engineering. Work on industrial grade controllers, design PCB boards, deploy SLAM on robots, and gain expert mentorship.
            </p>
          </div>

          {/* Tabs Control */}
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="space-y-8">
            <div className="flex justify-center">
              <TabsList className="bg-[#0c121e] border border-border/60 p-1">
                <TabsTrigger value="info" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-xs px-5">
                  About the Internships
                </TabsTrigger>
                <TabsTrigger value="apply" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-xs px-5">
                  Apply Now
                </TabsTrigger>
                {isAuthenticated && (
                  <TabsTrigger value="applications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-xs px-5">
                    My Applications ({myApplications.length})
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            {/* TAB 1: Internship Tracks Info */}
            <TabsContent value="info" className="space-y-10 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {INTERNSHIP_TRACKS.map((track, idx) => {
                  const Icon = track.icon;
                  return (
                    <Card key={idx} className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all flex flex-col justify-between overflow-hidden shadow-md">
                      <CardHeader className="flex flex-row items-center gap-4 pb-3">
                        <div className="p-3 rounded-lg bg-primary/10 text-primary">
                          <Icon className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-lg font-bold">{track.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 flex-1">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {track.description}
                        </p>
                        <div className="space-y-2">
                          <span className="text-xs font-semibold uppercase text-primary tracking-wide">Key Skill Focus:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {track.skillsNeeded.map((skill, sIdx) => (
                              <Badge key={sIdx} variant="outline" className="text-xs bg-background/50 border-border/60">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* What We Offer */}
              <Card className="bg-[#0b1320]/60 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <GraduationCap className="text-primary w-5 h-5" />
                    Program Benefits & Details
                  </CardTitle>
                  <CardDescription>
                    What to expect from a robotics internship with Innovative Hub
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                  <div className="flex gap-3">
                    <CheckCircle2 className="text-emerald-500 w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-foreground mb-1">Live Hands-on Projects</h4>
                      <p className="text-muted-foreground text-xs leading-relaxed">Build actual hardware platforms instead of simulation-only pipelines.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="text-emerald-500 w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-foreground mb-1">Industry Mentorship</h4>
                      <p className="text-muted-foreground text-xs leading-relaxed">Weekly check-ins, design reviews, and architectural guidance from senior engineers.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="text-emerald-500 w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-foreground mb-1">Certificate & LOR</h4>
                      <p className="text-muted-foreground text-xs leading-relaxed">Receive a formal completion certificate and performance-based recommendation letters.</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-border/40 py-4 bg-muted/5">
                  <Button onClick={() => setActiveTab('apply')} className="font-semibold gap-1">
                    Apply for Internships
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* TAB 2: Application Form */}
            <TabsContent value="apply" className="focus-visible:outline-none">
              <div className="max-w-2xl mx-auto">
                <Card className="bg-card/60 backdrop-blur-sm border-border shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold">Apply for Internship</CardTitle>
                    <CardDescription>
                      Fill out the form below. Please provide a clear, public link to your resume (e.g. Google Drive PDF with sharing permissions).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="i-name" className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-primary" /> Full Name
                        </Label>
                        <Input
                          id="i-name"
                          placeholder="Your Full Name"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          required
                          className="bg-background/50 border-border"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Email */}
                        <div className="space-y-1.5">
                          <Label htmlFor="i-email" className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-primary" /> Email Address
                          </Label>
                          <Input
                            id="i-email"
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                            className="bg-background/50 border-border"
                          />
                        </div>
                        {/* Mobile */}
                        <div className="space-y-1.5">
                          <Label htmlFor="i-mobile" className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-primary" /> Mobile Number
                          </Label>
                          <Input
                            id="i-mobile"
                            placeholder="e.g. +91 9876543210"
                            value={form.mobile}
                            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                            required
                            className="bg-background/50 border-border"
                          />
                        </div>
                      </div>

                      {/* Skills Checklist */}
                      <div className="space-y-3">
                        <Label className="font-semibold text-foreground">Select Your Core Skills</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {SKILL_OPTIONS.map((skill) => (
                            <div 
                              key={skill} 
                              className="flex items-start space-x-2.5 bg-background/30 p-2.5 rounded-lg border border-border/40 hover:bg-background/50 transition-colors"
                            >
                              <Checkbox
                                id={`skill-${skill}`}
                                checked={form.skills.includes(skill)}
                                onCheckedChange={(checked) => handleSkillChange(skill, !!checked)}
                              />
                              <Label htmlFor={`skill-${skill}`} className="text-xs sm:text-sm font-medium leading-none cursor-pointer">
                                {skill}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Resume link */}
                      <div className="space-y-1.5">
                        <Label htmlFor="i-resume" className="flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-primary" /> Resume URL
                        </Label>
                        <Input
                          id="i-resume"
                          type="url"
                          placeholder="https://drive.google.com/... (Ensure sharing is set to 'Anyone with link')"
                          value={form.resumeUrl}
                          onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
                          required
                          className="bg-background/50 border-border"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Upload your resume to Google Drive or Dropbox and paste the link here.
                        </p>
                      </div>

                      {/* Portfolio link */}
                      <div className="space-y-1.5">
                        <Label htmlFor="i-portfolio" className="flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-primary" /> Portfolio / GitHub Profile URL (Optional)
                        </Label>
                        <Input
                          id="i-portfolio"
                          type="url"
                          placeholder="https://github.com/your-username"
                          value={form.portfolioUrl}
                          onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
                          className="bg-background/50 border-border"
                        />
                      </div>

                      {/* Cover letter */}
                      <div className="space-y-1.5">
                        <Label htmlFor="i-cover" className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-primary" /> Cover Letter / Motivation
                        </Label>
                        <Textarea
                          id="i-cover"
                          placeholder="Explain why you are interested in this internship, your past experiences with robotics or IoT projects, and what you hope to learn. (Min 50 characters)"
                          value={form.coverLetter}
                          onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                          required
                          className="min-h-[120px] bg-background/50 border-border"
                        />
                      </div>

                      <Button type="submit" className="w-full py-6 font-semibold mt-2" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 3: My Applications */}
            {isAuthenticated && (
              <TabsContent value="applications" className="space-y-6 focus-visible:outline-none">
                {isLoadingApps ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : myApplications.length === 0 ? (
                  <Card className="bg-card/40 border-border/60 py-16 text-center max-w-md mx-auto">
                    <CardContent className="space-y-3">
                      <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground" />
                      <h3 className="font-bold text-lg text-foreground">No applications found</h3>
                      <p className="text-sm text-muted-foreground">You haven't submitted any internship applications yet.</p>
                      <Button onClick={() => setActiveTab('apply')} size="sm">Create Application</Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4 max-w-3xl mx-auto">
                    {myApplications.map((app) => (
                      <Card key={app._id} className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/20 transition-all shadow-md">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3">
                          <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-primary" />
                              Internship Application
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              Submitted on {formatDate(app.createdAt)}
                            </CardDescription>
                          </div>
                          <div className="self-start sm:self-center">
                            {getStatusBadge(app.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                          <div>
                            <span className="text-xs text-muted-foreground block mb-1.5 font-semibold">Skills Highlighted:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {app.skills.map((skill, idx) => (
                                <Badge key={idx} variant="secondary" className="bg-background border border-border text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-border/40 pt-3">
                            <span className="text-xs text-muted-foreground block mb-1 font-semibold">Motivation Statement:</span>
                            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                              {app.coverLetter}
                            </p>
                          </div>
                        </CardContent>
                        <CardFooter className="border-t border-border/40 py-3.5 bg-muted/5 flex flex-wrap gap-4">
                          <a 
                            href={app.resumeUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View Submitted Resume
                          </a>
                          {app.portfolioUrl && (
                            <a 
                              href={app.portfolioUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View Portfolio
                            </a>
                          )}
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default InternshipsPage;
