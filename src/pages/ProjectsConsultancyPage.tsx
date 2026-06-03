import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectsApi, mentorshipsApi, Project, MentorshipRequest, User } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, Filter, Calendar, Clock, BookOpen, Compass, 
  HelpCircle, MessageSquare, Plus, Video, CheckCircle2, 
  AlertCircle, ChevronRight, DollarSign, ListChecks, Star, ExternalLink, ArrowRight
} from 'lucide-react';
import { PLACEHOLDER_IMAGE } from '@/constants/media';
import { formatPrice } from '@/utils/price';
import SEO from '@/components/SEO';

const ProjectsConsultancyPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'projects' | 'mentorship'>('projects');

  // Projects states
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableComponents, setAvailableComponents] = useState<string[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);

  // Project filters
  const [searchTerm, setSearchTerm] = useState('');
  const [projectType, setProjectType] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(10000);

  // Mentorship states
  const [mentorshipRequests, setMentorshipRequests] = useState<MentorshipRequest[]>([]);
  const [isMentorshipLoading, setIsMentorshipLoading] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Mentorship Form State
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('Evening (5 PM - 9 PM)');

  // Load Projects catalog & unique components
  useEffect(() => {
    const loadCatalog = async () => {
      setIsProjectsLoading(true);
      try {
        const [projRes, compRes] = await Promise.all([
          projectsApi.getAll({
            search: searchTerm.trim() || undefined,
            projectType: projectType || undefined,
            difficulty: difficulty || undefined,
            components: selectedComponents.length > 0 ? selectedComponents.join(',') : undefined,
            maxPrice: maxPrice || undefined
          }),
          projectsApi.getComponents()
        ]);

        if (projRes.success) {
          setProjects(projRes.data);
        }
        if (compRes.success) {
          setAvailableComponents(compRes.data);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setIsProjectsLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      loadCatalog();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, projectType, difficulty, selectedComponents, maxPrice]);

  // Load Mentorship requests (only if logged in)
  useEffect(() => {
    if (activeTab === 'mentorship' && isAuthenticated) {
      const loadRequests = async () => {
        setIsMentorshipLoading(true);
        try {
          const res = await mentorshipsApi.getMyRequests();
          if (res.success) {
            setMentorshipRequests(res.data);
          }
        } catch (err) {
          console.error('Failed to load mentorship requests:', err);
        } finally {
          setIsMentorshipLoading(false);
        }
      };
      loadRequests();
    }
  }, [activeTab, isAuthenticated]);

  const handleComponentToggle = (comp: string) => {
    setSelectedComponents(prev => 
      prev.includes(comp) ? prev.filter(c => c !== comp) : [...prev, comp]
    );
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setProjectType('');
    setDifficulty('');
    setSelectedComponents([]);
    setMaxPrice(10000);
  };

  const handleMentorshipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast({
        title: 'Login Required',
        description: 'Please log in to submit a mentorship session request.',
        variant: 'destructive'
      });
      navigate('/login?redirect=/project-kits');
      return;
    }

    if (!topic || !description || !preferredDate || !preferredTime) {
      toast({
        title: 'Required Fields Missing',
        description: 'Please fill in all the details for your request.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const res = await mentorshipsApi.requestSession({
        topic,
        description,
        preferredDate,
        preferredTime
      });

      if (res.success) {
        toast({
          title: 'Request Submitted!',
          description: 'Your request for live mentorship has been sent. Check status below.'
        });
        setTopic('');
        setDescription('');
        setPreferredDate('');
        // Reload requests
        const requestsRes = await mentorshipsApi.getMyRequests();
        if (requestsRes.success) {
          setMentorshipRequests(requestsRes.data);
        }
      }
    } catch (err) {
      toast({
        title: 'Submission Failed',
        description: err instanceof Error ? err.message : 'Could not proceed with request.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <>
      <SEO 
        title="Project Kits & Live Mentorship" 
        description="Explore robotics kits to sell or request live 1-on-1 expert consultation for your custom IoT, embedded systems, and automation projects." 
        path="/project-kits" 
      />
      <div className="network-bg min-h-screen py-10 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          
          {/* Header */}
          <div className="text-center mb-8 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Projects & Consultation Hub</h1>
            <p className="text-muted-foreground">
              Build state-of-the-art robotics with complete hardware combo kits, or consult directly with our experienced engineering mentors to bring your ideas to life.
            </p>
          </div>

          {/* Sub-navigation Tabs */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-card/60 backdrop-blur-sm p-1.5 rounded-full border border-border/80 shadow-inner">
              <button
                onClick={() => setActiveTab('projects')}
                className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'projects' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                }`}
              >
                Project Kits
              </button>
              <button
                onClick={() => setActiveTab('mentorship')}
                className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'mentorship' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                }`}
              >
                Live Mentorship
              </button>
            </div>
          </div>

          {/* Projects View */}
          {activeTab === 'projects' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
              
              {/* Desktop Filters Sidebar */}
              <div className="lg:col-span-1 bg-card/50 backdrop-blur-sm border border-border/85 rounded-xl p-5 space-y-6">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Filter className="w-4 h-4 text-primary" />
                    Filters
                  </h3>
                  <button 
                    onClick={handleResetFilters}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    Clear All
                  </button>
                </div>

                {/* Filter Type */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">PROJECT TYPE</label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-[#161c28] px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">All Types</option>
                    <option value="combo_components">Combo Components Kit</option>
                    <option value="ready_made">Ready-Made built Project</option>
                  </select>
                </div>

                {/* Filter Difficulty */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">DIFFICULTY LEVEL</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-[#161c28] px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">All Levels</option>
                    <option value="beginner">Beginner Friendly</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                {/* Filter Price */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-muted-foreground">
                    <span>MAX PRICE</span>
                    <span className="text-primary font-semibold">₹{maxPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="20000"
                    step="500"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Filter Components */}
                {availableComponents.length > 0 && (
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-muted-foreground block">COMPONENTS INCLUDED</label>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                      {availableComponents.map((comp) => (
                        <label key={comp} className="flex items-center gap-2 cursor-pointer group text-xs text-muted-foreground hover:text-foreground">
                          <input
                            type="checkbox"
                            checked={selectedComponents.includes(comp)}
                            onChange={() => handleComponentToggle(comp)}
                            className="rounded border-input text-primary focus:ring-ring bg-secondary/50 w-3.5 h-3.5"
                          />
                          <span className="select-none truncate">{comp}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Projects Grid & Search */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search projects by name, description, or microcontrollers (e.g. Arduino, ESP32, Rasp-Pi)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 bg-card/60 backdrop-blur-sm border-border w-full py-5 rounded-xl text-sm"
                  />
                </div>

                {/* Loader / Listing */}
                {isProjectsLoading ? (
                  <div className="flex justify-center items-center py-24">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-20 bg-card/35 border border-border/60 rounded-2xl max-w-lg mx-auto">
                    <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-bold text-foreground mb-1.5">No Projects Found</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                      We couldn't find any projects matching your search query or filters.
                    </p>
                    <Button onClick={handleResetFilters} variant="outline" size="sm">
                      Reset All Filters
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {projects.map((project) => (
                      <Card
                        key={project._id}
                        onClick={() => navigate(`/project/${project._id}`)}
                        className="bg-card/50 backdrop-blur-sm border-border/65 hover:border-primary/50 hover:shadow-lg transition-all duration-300 group flex flex-col justify-between overflow-hidden card-hover-effect cursor-pointer"
                      >
                        <div className="relative">
                          <img
                            src={(project.images && project.images[0]) || PLACEHOLDER_IMAGE}
                            alt={project.name}
                            className="w-full h-48 object-cover border-b border-border/30 group-hover:scale-[1.01] transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                            <Badge className="bg-primary/95 text-white border-none text-[9px] uppercase tracking-wider font-semibold">
                              {project.projectType === 'combo_components' ? 'Kit Combo' : 'Ready Made'}
                            </Badge>
                            <Badge variant="secondary" className="bg-secondary/95 text-white border-border/50 text-[9px] capitalize">
                              {project.difficulty}
                            </Badge>
                          </div>
                        </div>
                        <CardHeader className="pt-4 pb-2">
                          <CardTitle className="text-base font-bold line-clamp-1 group-hover:text-primary transition-colors">
                            {project.name}
                          </CardTitle>
                          <CardDescription className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            Build time: {project.estimatedBuildTime || 'N/A'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="py-0 flex-1 space-y-3">
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                            {project.shortDescription}
                          </p>
                          
                          {/* Components list tag representation */}
                          {project.components && project.components.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1.5">
                              {project.components.slice(0, 3).map((comp) => (
                                <Badge key={comp} variant="outline" className="text-[10px] py-0 px-2 font-medium bg-[#131d2e] border-border/60 text-white">
                                  {comp}
                                </Badge>
                              ))}
                              {project.components.length > 3 && (
                                <span className="text-[10px] text-muted-foreground self-center ml-1">
                                  +{project.components.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="pt-4 pb-5 mt-4 border-t border-border/40 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground line-through">
                              ₹{formatPrice(project.mrp)}
                            </span>
                            <span className="font-bold text-base text-primary">
                              ₹{formatPrice(project.price)}
                            </span>
                          </div>
                          <Button size="sm" className="font-bold gap-1 rounded-full px-5 text-xs shadow-md">
                            View Kit
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mentorship View */}
          {activeTab === 'mentorship' && (
            <div className="space-y-12">
              
              {/* Information / Hero section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card/50 backdrop-blur-sm border border-border/60 p-6 rounded-2xl flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <Video className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-sm">1-on-1 Live Sessions</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Schedule structured live video calls with senior engineers. Solve compiler issues, design circuits, and optimize logic.
                  </p>
                </div>

                <div className="bg-card/50 backdrop-blur-sm border border-border/60 p-6 rounded-2xl flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <ListChecks className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-sm">Schematics & PCB Review</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Get expert reviews on your custom schematics, PCB footprints, routing checks, and hardware layout considerations before ordering boards.
                  </p>
                </div>

                <div className="bg-card/50 backdrop-blur-sm border border-border/60 p-6 rounded-2xl flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <Star className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-sm">Custom project planning</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Need help drafting a college thesis or industrial prototype? Let us help you plan your architecture, bill of materials, and firmware blocks.
                  </p>
                </div>
              </div>

              {/* Form & List Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Form to submit request */}
                <div className="lg:col-span-5 bg-card/60 backdrop-blur-sm border border-border/80 p-6 rounded-2xl space-y-5">
                  <h3 className="text-lg font-bold text-foreground">Request live consultation</h3>
                  <p className="text-xs text-muted-foreground leading-normal">
                    Submit a query detailing your requirements. An administrator will review your query, approve it, assign a mentor, and schedule a meet link.
                  </p>

                  <form onSubmit={handleMentorshipSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">TOPIC / HEADING</label>
                      <Input
                        type="text"
                        placeholder="e.g. ESP32 WiFi connection fails after deep sleep"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="bg-secondary/40 border-border text-xs focus:ring-primary"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">DESCRIPTION & SCHEMATICS LINK</label>
                      <textarea
                        rows={5}
                        placeholder="Describe your project, code errors, parts used, or share schematic image links. Give as much detail as possible."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-secondary/40 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-black"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground">PREFERRED DATE</label>
                        <Input
                          type="date"
                          value={preferredDate}
                          onChange={(e) => setPreferredDate(e.target.value)}
                          className="bg-secondary/40 border-border text-xs text-black"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground">PREFERRED TIME SLOT</label>
                        <select
                          value={preferredTime}
                          onChange={(e) => setPreferredTime(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-[#161c28] px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-ring"
                          required
                        >
                          <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
                          <option value="Afternoon (12 PM - 5 PM)">Afternoon (12 PM - 5 PM)</option>
                          <option value="Evening (5 PM - 9 PM)">Evening (5 PM - 9 PM)</option>
                        </select>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmittingRequest}
                      className="w-full font-bold shadow-md rounded-lg py-2.5 mt-2"
                    >
                      {isSubmittingRequest ? 'Submitting Request...' : 'Submit Session Request'}
                    </Button>
                  </form>
                </div>

                {/* Requests log list */}
                <div className="lg:col-span-7 space-y-5">
                  <h3 className="text-lg font-bold text-foreground">My live requested sessions</h3>
                  
                  {!isAuthenticated ? (
                    <div className="border border-dashed border-border/80 rounded-2xl p-10 text-center bg-card/20 space-y-4">
                      <HelpCircle className="w-10 h-10 mx-auto text-muted-foreground" />
                      <div>
                        <h4 className="font-bold text-sm mb-1">Check request status</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          Please log in to submit a request and view your scheduled live sessions list with meet links and assigned mentors.
                        </p>
                      </div>
                      <Button onClick={() => navigate('/login?redirect=/project-kits')} size="sm">
                        Log In Now
                      </Button>
                    </div>
                  ) : isMentorshipLoading ? (
                    <div className="flex justify-center items-center py-16">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : mentorshipRequests.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-border/60 rounded-2xl bg-card/25">
                      <Video className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">You haven't requested any custom mentorship sessions yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                      {mentorshipRequests.map((request) => (
                        <div
                          key={request._id}
                          className="bg-card/45 border border-border/60 rounded-xl p-4.5 space-y-3.5 transition-all hover:bg-card/65"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="font-bold text-sm text-foreground leading-snug">{request.topic}</h4>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                                {request.description}
                              </p>
                            </div>
                            
                            <Badge className={`text-[9px] uppercase tracking-wider px-2 py-0.5 border-none font-bold shrink-0 ${
                              request.status === 'approved' ? 'bg-green-600 text-white' :
                              request.status === 'completed' ? 'bg-gray-500 text-white' :
                              request.status === 'rejected' ? 'bg-red-600 text-white' :
                              'bg-amber-600 text-white'
                            }`}>
                              {request.status}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground border-t border-border/30 pt-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-primary" />
                              {formatDate(request.preferredDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              {request.preferredTime}
                            </span>
                          </div>

                          {/* Approved state: Meeting details */}
                          {request.status === 'approved' && request.meetingLink && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-green-950/20 border border-green-500/30 gap-3">
                              <div className="space-y-0.5">
                                <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Video className="w-3.5 h-3.5" />
                                  Session Scheduled
                                </p>
                                {request.tutorId && typeof request.tutorId === 'object' && (
                                  <p className="text-[11px] text-white">
                                    Assigned Mentor: <span className="font-semibold">{(request.tutorId as any).name}</span>
                                  </p>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-500 text-white font-bold text-xs gap-1.5 rounded-md px-4 shrink-0 shadow-sm"
                                asChild
                              >
                                <a href={request.meetingLink} target="_blank" rel="noopener noreferrer">
                                  Join Meeting
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </Button>
                            </div>
                          )}

                          {/* Admin Notes */}
                          {request.adminNotes && (
                            <div className="text-[11px] bg-secondary/35 border border-border/40 p-2.5 rounded-lg text-muted-foreground">
                              <span className="font-bold text-foreground">Mentor Notes: </span>
                              {request.adminNotes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default ProjectsConsultancyPage;
