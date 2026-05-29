import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { coursesApi, Course, Lecture } from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Play, FileText, CheckCircle, Video, Lock, ExternalLink } from 'lucide-react';
import { PLACEHOLDER_IMAGE } from '@/constants/media';
import SEO from '@/components/SEO';

const CourseViewerPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLectureIndex, setActiveLectureIndex] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const fetchEnrolledCourse = async () => {
      if (!id) return;
      setIsLoading(true);
      setErrorMsg('');
      try {
        const res = await coursesApi.getCourseViewer(id);
        if (res.success) {
          setCourse(res.data);
          setActiveLectureIndex(0);
        } else {
          setErrorMsg(res.message || 'Access denied.');
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Failed to load course contents. Make sure you are enrolled.');
        toast({
          title: 'Access Restricted',
          description: err.message || 'You must be enrolled to view this classroom.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchEnrolledCourse();
  }, [id, toast]);

  // Helper to parse video URL and output an embed-safe link or iframe tag
  const getEmbedVideoUrl = (url: string) => {
    if (!url) return '';
    
    // YouTube
    const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(ytRegExp);
    
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=0&rel=0`;
    }
    
    // Vimeo
    const vimeoRegExp = /vimeo\.com\/(?:video\/)?([0-9]+)/;
    const vimeoMatch = url.match(vimeoRegExp);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return url;
  };

  const isEmbeddable = (url: string) => {
    const embedUrl = getEmbedVideoUrl(url);
    return embedUrl.includes('youtube.com') || embedUrl.includes('vimeo.com');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background text-foreground network-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">Opening your classroom...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !course) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4 network-bg">
        <Card className="max-w-md w-full bg-card/60 backdrop-blur-sm border-border text-center p-6">
          <Lock className="w-12 h-12 mx-auto text-primary mb-4" />
          <CardTitle className="text-xl font-bold mb-2">Classroom Locked</CardTitle>
          <CardDescription className="mb-6">
            {errorMsg || 'You need to enroll or purchase this course to access the lectures.'}
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/robotics-courses')}>
              Browse Courses
            </Button>
            {id && (
              <Button onClick={() => navigate(`/course/${id}`)}>
                View Course Page
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const lectures = course.lectures || [];
  const activeLecture: Lecture | undefined = lectures[activeLectureIndex];

  return (
    <>
      <SEO title={`Classroom: ${course.title}`} description="Access course content and practical exercises" path={`/classroom/${course._id}`} />
      <div className="min-h-screen bg-background text-foreground flex flex-col network-bg">
        {/* Classroom Header */}
        <header className="border-b border-border/40 bg-card/40 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-background/80">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground line-clamp-1">{course.title}</h1>
              <p className="text-xs text-muted-foreground">
                Instructor: {typeof course.tutorId === 'object' ? (course.tutorId as any).name : 'Tutor'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0 bg-background/50 hover:bg-background/80">
            <Link to="/account">My Account</Link>
          </Button>
        </header>

        {/* Classroom Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Main Content Area */}
          <main className="lg:col-span-8 p-4 sm:p-6 overflow-y-auto space-y-6">
            {activeLecture ? (
              <div className="space-y-6">
                {/* Video Container */}
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-border/40 shadow-2xl">
                  {isEmbeddable(activeLecture.videoUrl) ? (
                    <iframe
                      src={getEmbedVideoUrl(activeLecture.videoUrl)}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={activeLecture.title}
                    />
                  ) : activeLecture.videoUrl ? (
                    <video
                      src={activeLecture.videoUrl}
                      controls
                      controlsList="nodownload"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <Video className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-sm">No video file available for this lecture</p>
                    </div>
                  )}
                </div>

                {/* Lecture Info */}
                <div className="space-y-4 bg-card/20 border border-border/40 p-5 sm:p-6 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-primary font-bold uppercase tracking-wider">
                        Lecture {activeLectureIndex + 1} of {lectures.length}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-extrabold mt-1 text-foreground">{activeLecture.title}</h2>
                    </div>
                    {activeLecture.attachmentUrl && (
                      <Button size="sm" variant="outline" className="gap-2 self-start sm:self-auto bg-background/40 hover:bg-background/85" asChild>
                        <a href={activeLecture.attachmentUrl} target="_blank" rel="noopener noreferrer">
                          <FileText className="w-4 h-4 text-primary" />
                          Download Resources
                          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                        </a>
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border/30">
                    {activeLecture.description || 'No description available for this lecture.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground bg-card/25 border border-border/40 rounded-xl p-8">
                <Video className="w-12 h-12 text-muted-foreground/45 mb-2" />
                <p className="text-sm">Please select a lecture from the playlist to start learning.</p>
              </div>
            )}
          </main>

          {/* Sidebar Playlist */}
          <aside className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-border/40 bg-card/20 backdrop-blur-sm overflow-y-auto">
            <div className="p-4 border-b border-border/40 flex items-center justify-between sticky top-0 bg-card/90 backdrop-blur-md z-10">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Play className="w-4 h-4 text-primary fill-primary" />
                Course Curriculum
              </h3>
              <span className="text-xs text-muted-foreground font-semibold">
                {lectures.length} lectures
              </span>
            </div>

            <div className="p-2 space-y-1">
              {lectures.map((lecture, index) => {
                const isActive = index === activeLectureIndex;
                return (
                  <button
                    key={lecture._id || index}
                    onClick={() => setActiveLectureIndex(index)}
                    className={`w-full text-left p-3.5 rounded-xl transition-all flex items-start gap-3 border ${
                      isActive
                        ? 'bg-primary/10 border-primary/45 text-foreground'
                        : 'bg-transparent border-transparent hover:bg-card/45 hover:border-border/30 text-muted-foreground'
                    }`}
                  >
                    <span className={`h-6 w-6 shrink-0 font-bold rounded-full flex items-center justify-center text-xs ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background/80 text-muted-foreground border border-border/50'
                    }`}>
                      {isActive ? (
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    
                    <div className="min-w-0 flex-1">
                      <h4 className={`text-xs font-semibold truncate ${isActive ? 'text-primary font-bold' : 'text-foreground'}`}>
                        {lecture.title}
                      </h4>
                      {lecture.description && (
                        <p className="text-[11px] text-muted-foreground leading-normal line-clamp-1 mt-0.5">
                          {lecture.description}
                        </p>
                      )}
                      {lecture.attachmentUrl && (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] bg-background/50 border border-border/40 px-1.5 py-0.5 rounded-md text-primary font-medium">
                          <FileText className="w-2.5 h-2.5" />
                          Resources attached
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default CourseViewerPage;
