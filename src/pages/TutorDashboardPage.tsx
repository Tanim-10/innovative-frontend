import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { coursesApi, sessionsApi, Course, SessionSlot, Lecture } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen, Plus, Pencil, Trash2, Calendar, Clock, DollarSign,
  ChevronRight, Laptop, LogOut, CheckCircle, Video, User, GraduationCap, X, Settings
} from 'lucide-react';
import { formatPrice } from '@/utils/price';
import SEO from '@/components/SEO';

const TutorDashboardPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [slots, setSlots] = useState<SessionSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog States
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    difficulty: 'beginner' as Course['difficulty'],
    topic: '',
    price: 0,
    thumbnailUrl: '',
    isPublished: false
  });

  const [isLectureDialogOpen, setIsLectureDialogOpen] = useState(false);
  const [selectedCourseForLectures, setSelectedCourseForLectures] = useState<Course | null>(null);
  const [editingLectureIndex, setEditingLectureIndex] = useState<number | null>(null);
  const [lectureForm, setLectureForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    attachmentUrl: ''
  });

  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
  const [slotForm, setSlotForm] = useState({
    date: '',
    time: '',
    topic: '',
    cost: 0
  });

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, slotsRes] = await Promise.all([
        coursesApi.getTutorCourses(),
        sessionsApi.getTutorSlots()
      ]);
      if (coursesRes.success) setCourses(coursesRes.data);
      if (slotsRes.success) setSlots(slotsRes.data);
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error loading dashboard',
        description: 'Could not fetch your courses and schedule.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login?redirect=/tutor-dashboard');
      } else if (user?.role !== 'tutor' || user?.tutorStatus !== 'approved') {
        navigate('/account');
        toast({
          title: 'Access Denied',
          description: 'Only approved tutors can view the Tutor Dashboard.',
          variant: 'destructive'
        });
      } else {
        loadDashboardData();
      }
    }
  }, [user, isAuthenticated, authLoading, navigate]);

  // Course handlers
  const openNewCourseDialog = () => {
    setEditingCourse(null);
    setCourseForm({
      title: '',
      description: '',
      difficulty: 'beginner',
      topic: '',
      price: 0,
      thumbnailUrl: '',
      isPublished: false
    });
    setIsCourseDialogOpen(true);
  };

  const openEditCourseDialog = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description,
      difficulty: course.difficulty,
      topic: course.topic,
      price: course.price,
      thumbnailUrl: course.thumbnailUrl || '',
      isPublished: course.isPublished
    });
    setIsCourseDialogOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        // Edit Course
        const res = await coursesApi.update(editingCourse._id, courseForm);
        if (res.success) {
          toast({ title: 'Course updated', description: 'Course settings saved successfully.' });
          setCourses(courses.map(c => c._id === editingCourse._id ? res.data : c));
        }
      } else {
        // Create Course
        const res = await coursesApi.create(courseForm);
        if (res.success) {
          toast({ title: 'Course created', description: 'Your course has been drafted.' });
          setCourses([res.data, ...courses]);
        }
      }
      setIsCourseDialogOpen(false);
    } catch (err) {
      toast({
        title: 'Error saving course',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await coursesApi.deleteCourse(courseId);
      setCourses(courses.filter(c => c._id !== courseId));
      toast({ title: 'Course deleted' });
    } catch (err) {
      toast({ title: 'Failed to delete course', variant: 'destructive' });
    }
  };

  // Lectures builder handlers
  const openLecturesDialog = (course: Course) => {
    setSelectedCourseForLectures(course);
    setIsLectureDialogOpen(true);
  };

  const handleAddOrEditLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForLectures) return;

    let updatedLectures = [...(selectedCourseForLectures.lectures || [])];
    if (editingLectureIndex !== null) {
      updatedLectures[editingLectureIndex] = lectureForm;
    } else {
      updatedLectures.push(lectureForm);
    }

    try {
      const res = await coursesApi.update(selectedCourseForLectures._id, { lectures: updatedLectures });
      if (res.success) {
        toast({ title: 'Lectures updated', description: 'Course lectures saved.' });
        setCourses(courses.map(c => c._id === selectedCourseForLectures._id ? res.data : c));
        setSelectedCourseForLectures(res.data);
        // Reset form
        setLectureForm({ title: '', description: '', videoUrl: '', attachmentUrl: '' });
        setEditingLectureIndex(null);
      }
    } catch (err) {
      toast({ title: 'Failed to save lecture', variant: 'destructive' });
    }
  };

  const handleDeleteLecture = async (idx: number) => {
    if (!selectedCourseForLectures || !window.confirm('Delete this lecture?')) return;
    const updated = selectedCourseForLectures.lectures.filter((_, i) => i !== idx);
    try {
      const res = await coursesApi.update(selectedCourseForLectures._id, { lectures: updated });
      if (res.success) {
        toast({ title: 'Lecture deleted' });
        setCourses(courses.map(c => c._id === selectedCourseForLectures._id ? res.data : c));
        setSelectedCourseForLectures(res.data);
      }
    } catch (err) {
      toast({ title: 'Failed to delete lecture', variant: 'destructive' });
    }
  };

  // Slot handlers
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await sessionsApi.createSlot(slotForm);
      if (res.success) {
        toast({ title: 'Availability added', description: 'New 1-on-1 session slot added successfully.' });
        setSlots([...slots, res.data]);
        setIsSlotDialogOpen(false);
        setSlotForm({ date: '', time: '', topic: '', cost: 0 });
      }
    } catch (err) {
      toast({
        title: 'Failed to add slot',
        description: err instanceof Error ? err.message : 'Could not save slot',
        variant: 'destructive'
      });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const bookedSessions = slots.filter(s => s.status === 'booked');
  const availableSlots = slots.filter(s => s.status === 'available');

  return (
    <>
      <SEO title="Tutor Dashboard" description="Manage your robotics courses and tutoring availability." path="/tutor-dashboard" noIndex />
      <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row network-bg">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 bg-card border-b md:border-b-0 md:border-r border-border/60 p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-primary" />
              <div>
                <h2 className="font-bold text-sm">Innovative Hub</h2>
                <p className="text-xs text-muted-foreground">Tutor Workspace</p>
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg border border-border/40">
                <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                  {user?.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate text-foreground">{user?.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
            </div>
            <nav className="space-y-1">
              <Link to="/eshop" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
                <Laptop className="w-4 h-4" />
                Go to E-Shop
              </Link>
              <Link to="/account" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
                <User className="w-4 h-4" />
                Student Account
              </Link>
            </nav>
          </div>

          <Button variant="ghost" className="justify-start gap-2 text-destructive mt-6" onClick={() => navigate('/account?tab=logout')}>
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </aside>

        {/* Dashboard Work Area */}
        <main className="flex-1 p-6 md:p-10 space-y-6 overflow-x-hidden">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tutor Dashboard</h1>
            <p className="text-muted-foreground">Manage your educational catalog, syllabuses, and bookable tutoring hours.</p>
          </div>

          <Tabs defaultValue="courses" className="space-y-6">
            <TabsList className="bg-card border border-border/60 p-1">
              <TabsTrigger value="courses" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-xs">
                Courses & Builder
              </TabsTrigger>
              <TabsTrigger value="sessions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-xs">
                Tutoring Hours
              </TabsTrigger>
            </TabsList>

            {/* Courses Tab Content */}
            <TabsContent value="courses" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">My Courses</h2>
                <Button className="gap-1 font-semibold" onClick={openNewCourseDialog}>
                  <Plus className="w-4 h-4" />
                  Create Course
                </Button>
              </div>

              {courses.length === 0 ? (
                <Card className="bg-card/50 border-border/60 py-10 text-center">
                  <CardContent className="space-y-2">
                    <BookOpen className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">You haven't created any courses yet.</p>
                    <Button onClick={openNewCourseDialog}>Draft Your First Course</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <Card key={course._id} className="bg-card/50 border-border/60 flex flex-col justify-between overflow-hidden">
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px] bg-background/50 border-border/60 capitalize">
                            {course.difficulty}
                          </Badge>
                          <Badge className={course.isPublished ? 'bg-emerald-600 text-white hover:bg-emerald-600' : 'bg-amber-600 text-white hover:bg-amber-600'}>
                            {course.isPublished ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-base line-clamp-1">{course.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>
                        <p className="font-bold text-sm text-primary">₹{formatPrice(course.price)}</p>
                      </div>
                      <div className="border-t border-border/40 p-4 bg-muted/10 flex justify-between gap-2">
                        <Button variant="ghost" size="sm" className="flex-1 gap-1 text-xs" onClick={() => openEditCourseDialog(course)}>
                          <Settings className="w-3.5 h-3.5" />
                          Settings
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => openLecturesDialog(course)}>
                          <Plus className="w-3.5 h-3.5" />
                          Lectures ({course.lectures?.length || 0})
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive p-2 hover:bg-destructive/10" onClick={() => handleDeleteCourse(course._id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Sessions Tab Content */}
            <TabsContent value="sessions" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">1-on-1 Sessions</h2>
                <Button className="gap-1 font-semibold" onClick={() => setIsSlotDialogOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Add Availability
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Booked Sessions */}
                <Card className="lg:col-span-2 bg-card/50 border-border/60">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Video className="w-5 h-5 text-emerald-500" />
                      Booked Mentoring Sessions
                    </CardTitle>
                    <CardDescription>Upcoming virtual calls booked by students</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {bookedSessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">No upcoming bookings yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {bookedSessions.map((session) => {
                          const student = session.bookedBy as any;
                          return (
                            <div key={session._id} className="p-4 border border-border/50 rounded-xl bg-background/20 space-y-3">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/30 pb-2">
                                <h4 className="font-semibold text-sm">{session.topic}</h4>
                                <Badge variant="secondary" className="bg-emerald-600/10 text-emerald-500 border border-emerald-500/20">Paid</Badge>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                                <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-primary" /> {new Date(session.date).toLocaleDateString()}</p>
                                <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> {session.time}</p>
                                <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" /> Student: {student?.name || 'User'}</p>
                                <p className="flex items-center gap-1.5"><Laptop className="w-3.5 h-3.5 text-primary" /> {student?.email}</p>
                              </div>
                              {session.meetingLink && (
                                <Button size="sm" className="w-full gap-1.5 font-semibold mt-2" asChild>
                                  <a href={session.meetingLink} target="_blank" rel="noopener noreferrer">
                                    <Video className="w-4 h-4" />
                                    Join Virtual Meeting
                                  </a>
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Available Hours */}
                <Card className="lg:col-span-1 bg-card/50 border-border/60">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Available Slots
                    </CardTitle>
                    <CardDescription>Open slots for booking</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {availableSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">No available hours listed.</p>
                    ) : (
                      <div className="space-y-3">
                        {availableSlots.map((slot) => (
                          <div key={slot._id} className="p-3 border border-border/40 rounded-xl bg-background/10 text-xs space-y-1.5">
                            <p className="font-semibold text-foreground truncate">{slot.topic}</p>
                            <p className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3 text-primary" /> {new Date(slot.date).toLocaleDateString()}</p>
                            <p className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3 text-primary" /> {slot.time}</p>
                            <p className="text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3 text-primary" /> {slot.cost === 0 ? 'Free' : `₹${formatPrice(slot.cost)}`}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Create/Edit Course Dialog */}
          <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
            <DialogContent className="bg-card border-border/60 text-foreground max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingCourse ? 'Edit Course Settings' : 'Create New Robotics Course'}</DialogTitle>
                <DialogDescription>Draft your robotics curriculum settings.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveCourse} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="c-title">Course Title</Label>
                  <Input id="c-title" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-desc">Description</Label>
                  <Textarea id="c-desc" value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} required className="min-h-[80px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="c-topic">Topic (e.g. ROS, Arduino)</Label>
                    <Input id="c-topic" value={courseForm.topic} onChange={(e) => setCourseForm({ ...courseForm, topic: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="c-diff">Difficulty</Label>
                    <select
                      id="c-diff"
                      value={courseForm.difficulty}
                      onChange={(e) => setCourseForm({ ...courseForm, difficulty: e.target.value as Course['difficulty'] })}
                      className="flex h-10 w-full rounded-md border border-input bg-[#161c28] px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="c-price">Price (₹, 0 = Free)</Label>
                    <Input id="c-price" type="number" min="0" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: Number(e.target.value) || 0 })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="c-thumb">Thumbnail URL (Cloudinary / YouTube)</Label>
                    <Input id="c-thumb" value={courseForm.thumbnailUrl} onChange={(e) => setCourseForm({ ...courseForm, thumbnailUrl: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="c-pub"
                    checked={courseForm.isPublished}
                    onChange={(e) => setCourseForm({ ...courseForm, isPublished: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="c-pub" className="cursor-pointer font-medium">Publish Course (make it visible in student catalog)</Label>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsCourseDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Course Settings</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Lectures Builder Dialog */}
          <Dialog open={isLectureDialogOpen} onOpenChange={setIsLectureDialogOpen}>
            <DialogContent className="bg-card border-border/60 text-foreground max-w-2xl">
              <DialogHeader>
                <DialogTitle>Lectures Builder: {selectedCourseForLectures?.title}</DialogTitle>
                <DialogDescription>Add, update, or remove lectures inside this course module.</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Form to Add/Edit */}
                <form onSubmit={handleAddOrEditLecture} className="space-y-3 bg-[#161c28]/40 border border-border/40 p-4 rounded-xl">
                  <h4 className="font-bold text-xs text-primary">{editingLectureIndex !== null ? 'Edit Lecture Details' : 'Add New Lecture'}</h4>
                  <div className="space-y-1">
                    <Label htmlFor="l-title" className="text-xs">Lecture Title</Label>
                    <Input id="l-title" size={32} value={lectureForm.title} onChange={(e) => setLectureForm({ ...lectureForm, title: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="l-desc" className="text-xs">Brief Description</Label>
                    <Textarea id="l-desc" value={lectureForm.description} onChange={(e) => setLectureForm({ ...lectureForm, description: e.target.value })} className="min-h-[50px] text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="l-video" className="text-xs">Video Embed URL (YouTube/Vimeo/Cloudinary)</Label>
                    <Input id="l-video" value={lectureForm.videoUrl} onChange={(e) => setLectureForm({ ...lectureForm, videoUrl: e.target.value })} required placeholder="e.g. https://www.youtube.com/embed/..." />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="l-attach" className="text-xs">Attachment/Resource URL (PDF/Drive Link)</Label>
                    <Input id="l-attach" value={lectureForm.attachmentUrl} onChange={(e) => setLectureForm({ ...lectureForm, attachmentUrl: e.target.value })} placeholder="Optional slide or handout" />
                  </div>
                  <div className="pt-2 flex gap-2">
                    {editingLectureIndex !== null && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => {
                        setEditingLectureIndex(null);
                        setLectureForm({ title: '', description: '', videoUrl: '', attachmentUrl: '' });
                      }}>Cancel</Button>
                    )}
                    <Button type="submit" size="sm" className="flex-1 font-semibold">
                      {editingLectureIndex !== null ? 'Save Changes' : 'Add to Syllabus'}
                    </Button>
                  </div>
                </form>

                {/* List of Lectures */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-foreground">Syllabus Overview ({selectedCourseForLectures?.lectures?.length || 0} lectures)</h4>
                  {(!selectedCourseForLectures?.lectures || selectedCourseForLectures.lectures.length === 0) ? (
                    <p className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border/40 rounded-lg">No lectures yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {selectedCourseForLectures.lectures.map((lecture, i) => (
                        <div key={i} className="flex justify-between items-center p-3 border border-border/40 bg-background/10 rounded-lg text-xs gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{i + 1}. {lecture.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{lecture.videoUrl}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button type="button" className="p-1.5 text-muted-foreground hover:text-foreground" onClick={() => {
                              setEditingLectureIndex(i);
                              setLectureForm({
                                title: lecture.title,
                                description: lecture.description || '',
                                videoUrl: lecture.videoUrl,
                                attachmentUrl: lecture.attachmentUrl || ''
                              });
                            }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" className="p-1.5 text-destructive hover:bg-destructive/10 rounded" onClick={() => handleDeleteLecture(i)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Slot Dialog */}
          <Dialog open={isSlotDialogOpen} onOpenChange={setIsSlotDialogOpen}>
            <DialogContent className="bg-card border-border/60 text-foreground max-w-md">
              <DialogHeader>
                <DialogTitle>Add Session Availability Slot</DialogTitle>
                <DialogDescription>List hours when students can book a 1-on-1 virtual mentoring session with you.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveSlot} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="s-date">Date</Label>
                    <Input id="s-date" type="date" value={slotForm.date} onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="s-time">Time (e.g. 14:00 - 15:00)</Label>
                    <Input id="s-time" placeholder="14:00 - 15:00" value={slotForm.time} onChange={(e) => setSlotForm({ ...slotForm, time: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s-topic">Topic Expertise (e.g. ROS Setup, CAD review)</Label>
                  <Input id="s-topic" placeholder="ROS Navigation, PCB Routing, etc." value={slotForm.topic} onChange={(e) => setSlotForm({ ...slotForm, topic: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s-cost">Cost (₹, 0 = Free)</Label>
                  <Input id="s-cost" type="number" min="0" value={slotForm.cost} onChange={(e) => setSlotForm({ ...slotForm, cost: Number(e.target.value) || 0 })} required />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsSlotDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Add Slot</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </>
  );
};

export default TutorDashboardPage;
