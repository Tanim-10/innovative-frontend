import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { coursesApi, Course } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Search, Compass, GraduationCap, AlertCircle } from 'lucide-react';
import { PLACEHOLDER_IMAGE } from '@/constants/media';
import { formatPrice } from '@/utils/price';
import SEO from '@/components/SEO';

const CourseCatalogPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<string>('');

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const res = await coursesApi.getAll({
          search: search.trim() || undefined,
          difficulty: difficulty || undefined
        });
        if (res.success) {
          setCourses(res.data);
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchCourses();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, difficulty]);

  return (
    <>
      <SEO title="Robotics Courses & Tutorials" description="Learn robotics, IoT, and embedded systems from experts. Curated practical courses." path="/robotics-courses" />
      <div className="network-bg min-h-screen py-10 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-6 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Robotics Academy</h1>
            <p className="text-muted-foreground">
              Practical, hands-on courses designed by robotics engineers. Build skills in firmware development, robot kinematics, ROS, IoT node creation, and hardware assembly.
            </p>
          </div>

          {/* Sub-navigation Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-card/60 backdrop-blur-sm p-1.5 rounded-full border border-border/80 shadow-inner">
              <Link
                to="/robotics-courses"
                className="px-6 py-2 rounded-full text-xs font-bold transition-all bg-primary text-primary-foreground shadow-md"
              >
                Explore Courses
              </Link>
              <Link
                to="/tutor-directory"
                className="px-6 py-2 rounded-full text-xs font-bold transition-all text-muted-foreground hover:text-foreground hover:bg-background/40"
              >
                Find Tutors
              </Link>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 max-w-3xl mx-auto bg-card/40 backdrop-blur-sm p-4 rounded-xl border border-border/60">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background/50 border-border"
              />
            </div>
            
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="flex h-10 w-full sm:w-40 rounded-md border border-input bg-[#161c28] px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">All Difficulty</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Catalog Grid */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-16 bg-card/35 border border-border/60 rounded-xl max-w-md mx-auto">
              <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No courses found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card
                  key={course._id}
                  className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/60 hover:shadow-lg transition-all group flex flex-col justify-between overflow-hidden"
                >
                  <div className="relative">
                    <img
                      src={course.thumbnailUrl || PLACEHOLDER_IMAGE}
                      alt={course.title}
                      className="w-full h-44 object-cover border-b border-border/40 group-hover:scale-[1.02] transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 flex gap-1">
                      <Badge className="bg-primary/90 text-primary-foreground border-none text-[10px] capitalize">
                        {course.difficulty}
                      </Badge>
                      <Badge variant="secondary" className="bg-secondary/90 text-secondary-foreground border-border/50 text-[10px] capitalize">
                        {course.topic}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader className="pt-4 pb-2">
                    <CardTitle className="text-base font-bold line-clamp-1 group-hover:text-primary transition-colors">
                      {course.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 flex-1 space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {course.description}
                    </p>
                    
                    {/* Tutor info */}
                    {course.tutorId && typeof course.tutorId === 'object' && (
                      <div className="flex items-center gap-2 pt-2">
                        <img
                          src={(course.tutorId as any).profileImage || PLACEHOLDER_IMAGE}
                          alt={(course.tutorId as any).name}
                          className="w-7 h-7 rounded-full object-cover border border-border"
                        />
                        <span className="text-[11px] text-muted-foreground">
                          Instructor: <span className="font-semibold text-foreground">{(course.tutorId as any).name}</span>
                        </span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-4 pb-5 mt-4 border-t border-border/40 flex items-center justify-between">
                    <span className="font-bold text-sm text-primary">
                      {course.price === 0 ? 'Free' : `₹${formatPrice(course.price)}`}
                    </span>
                    <Button size="sm" className="font-semibold gap-1" asChild>
                      <Link to={`/course/${course._id}`}>
                        View Course
                        <GraduationCap className="w-4 h-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CourseCatalogPage;
