import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { coursesApi, Course } from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Award, BookOpen, Clock, FileText, CheckCircle, HelpCircle } from 'lucide-react';
import { PLACEHOLDER_IMAGE } from '@/constants/media';
import { formatPrice } from '@/utils/price';
import SEO from '@/components/SEO';

const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [course, setCourse] = useState<(Course & { isEnrolled?: boolean }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await coursesApi.getById(id);
        if (res.success) {
          setCourse(res.data);
        }
      } catch (err) {
        console.error(err);
        toast({ title: 'Error', description: 'Failed to load course details.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourse();
  }, [id, toast]);

  const loadRazorpay = () =>
    new Promise<void>((resolve, reject) => {
      if (window.Razorpay) return resolve();
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay'));
      document.body.appendChild(script);
    });

  const handleEnrollOrBuy = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please login to buy or enroll in courses.',
        variant: 'destructive'
      });
      navigate(`/login?redirect=/course/${id}`);
      return;
    }

    if (!course) return;

    setIsPurchasing(true);
    try {
      const res = await coursesApi.purchase(course._id);
      
      // Free course enrollment
      if (res.enrolled) {
        toast({
          title: 'Enrolled Successfully!',
          description: `You are now enrolled in "${course.title}". Welcome to the classroom!`
        });
        navigate(`/classroom/${course._id}`);
        return;
      }

      // Paid course purchase flow
      await loadRazorpay();
      const options = {
        key: res.data.keyId,
        amount: res.data.amount,
        currency: res.data.currency,
        order_id: res.data.orderId,
        name: 'Innovative Hub',
        description: `Purchase Course: ${course.title}`,
        handler: async (response: any) => {
          try {
            await coursesApi.verifyPurchase(course._id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            toast({
              title: 'Purchase Successful!',
              description: 'Your enrollment has been verified. Welcome to the classroom!'
            });
            navigate(`/classroom/${course._id}`);
          } catch (err) {
            toast({
              title: 'Verification failed',
              description: 'Payment verification failed. Please contact support.',
              variant: 'destructive'
            });
          } finally {
            setIsPurchasing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsPurchasing(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      toast({
        title: 'Purchase failed',
        description: err instanceof Error ? err.message : 'Could not proceed with purchase.',
        variant: 'destructive'
      });
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md min-h-[60vh] flex flex-col justify-center">
        <h2 className="text-2xl font-bold mb-2">Course Not Found</h2>
        <p className="text-muted-foreground mb-6">The requested course is not available or has been unpublished.</p>
        <Button onClick={() => navigate('/robotics-courses')}>Back to Courses</Button>
      </div>
    );
  }

  const tutor = course.tutorId as any;

  return (
    <>
      <SEO title={course.title} description={course.description} path={`/course/${id}`} />
      <div className="network-bg min-h-screen py-6 sm:py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate('/robotics-courses')}>
            <ChevronLeft className="w-4 h-4" />
            Back to Courses
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {/* Main Course Info */}
            <div className="md:col-span-2 space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize bg-background/40 border-border/60">
                    {course.difficulty}
                  </Badge>
                  <Badge variant="secondary" className="capitalize bg-secondary/50 border-border/55">
                    {course.topic}
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{course.title}</h1>
                <p className="text-sm text-muted-foreground leading-relaxed leading-relaxed">{course.description}</p>
              </div>

              {/* Syllabus / Curriculum preview */}
              <Card className="bg-card/60 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Course Syllabus
                  </CardTitle>
                  <CardDescription>{course.lectures?.length || 0} modular lectures</CardDescription>
                </CardHeader>
                <CardContent>
                  {(!course.lectures || course.lectures.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No lectures added yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {course.lectures.map((lecture, i) => (
                        <div key={lecture._id || i} className="flex items-start gap-3 p-3 bg-background/20 rounded-xl border border-border/40 text-sm">
                          <span className="h-6 w-6 shrink-0 bg-primary/10 text-primary font-bold rounded-full flex items-center justify-center text-xs">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-foreground truncate">{lecture.title}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{lecture.description || 'No description provided.'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tutor info */}
              {tutor && (
                <Card className="bg-card/60 backdrop-blur-sm border-border">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      About the Instructor
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row gap-4 items-start">
                    <img src={tutor.profileImage || PLACEHOLDER_IMAGE} alt={tutor.name} className="w-14 h-14 rounded-full object-cover border border-border" />
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm text-foreground">{tutor.name}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed leading-relaxed">{tutor.bio || 'Robotics educator on Innovative Hub.'}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar Pricing & Actions */}
            <div className="md:col-span-1">
              <Card className="bg-card/60 backdrop-blur-sm border-border overflow-hidden shadow-lg sticky top-24">
                <img src={course.thumbnailUrl || PLACEHOLDER_IMAGE} alt={course.title} className="w-full h-44 object-cover border-b border-border/40" />
                <div className="p-6 space-y-6">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Course Fee</p>
                    <p className="text-3xl font-extrabold text-primary">
                      {course.price === 0 ? 'Free' : `₹${formatPrice(course.price)}`}
                    </p>
                  </div>

                  {course.isEnrolled ? (
                    <Button className="w-full font-bold py-6 text-sm" asChild>
                      <Link to={`/classroom/${course._id}`}>
                        Go to Classroom
                      </Link>
                    </Button>
                  ) : (
                    <Button className="w-full font-bold py-6 text-sm" onClick={handleEnrollOrBuy} disabled={isPurchasing}>
                      {isPurchasing ? 'Processing...' : course.price === 0 ? 'Enroll for Free' : 'Buy Course'}
                    </Button>
                  )}

                  <div className="space-y-2.5 text-xs text-muted-foreground pt-4 border-t border-border/40">
                    <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Self-paced learn-anytime lectures</p>
                    <p className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Downloadable slides and schematics</p>
                    <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Certificate of syllabus completion</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CourseDetailPage;
