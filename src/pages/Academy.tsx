import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  Clock,
  Users,
  Star,
  Play,
  BookOpen,
  GraduationCap,
  Filter,
  ChevronRight
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  level: string | null;
  price: number;
  is_free: boolean;
  duration_hours: number | null;
  student_count: number;
  rating: number;
  is_published: boolean;
}

export default function Academy() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');

  // Fetch courses
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Course[];
    },
  });

  // Fetch user enrollments
  const { data: enrollments } = useQuery({
    queryKey: ['enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('course_enrollments')
        .select('course_id, progress')
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const enrollmentMap = new Map(enrollments?.map(e => [e.course_id, e.progress]) || []);

  const filteredCourses = courses?.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
    return matchesSearch && matchesCategory && matchesLevel;
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'technical-analysis', label: 'Technical Analysis' },
    { value: 'fundamental-analysis', label: 'Fundamental Analysis' },
    { value: 'risk-management', label: 'Risk Management' },
    { value: 'trading-strategies', label: 'Trading Strategies' },
    { value: 'portfolio-management', label: 'Portfolio Management' },
    { value: 'market-psychology', label: 'Market Psychology' },
  ];

  const levels = [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  const getLevelColor = (level: string | null) => {
    switch (level) {
      case 'beginner': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'advanced': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-6">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">Trading Academy</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Master the markets with expert-led courses on trading, investing, and portfolio management
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{courses?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Courses</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {courses?.reduce((sum, c) => sum + (c.student_count || 0), 0) || 0}
            </div>
            <div className="text-sm text-muted-foreground">Students</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {courses?.reduce((sum, c) => sum + (c.duration_hours || 0), 0) || 0}h
            </div>
            <div className="text-sm text-muted-foreground">Content</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{enrollments?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Enrolled</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedLevel} onValueChange={setSelectedLevel}>
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {levels.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Courses</TabsTrigger>
          <TabsTrigger value="enrolled">My Courses</TabsTrigger>
          <TabsTrigger value="free">Free Courses</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-40 bg-muted rounded-t-lg" />
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : filteredCourses && filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  progress={enrollmentMap.get(course.id)}
                  getLevelColor={getLevelColor}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No courses found</p>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="enrolled" className="mt-6">
          {enrollments && enrollments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses
                ?.filter(c => enrollmentMap.has(c.id))
                .map((course) => (
                  <CourseCard 
                    key={course.id} 
                    course={course} 
                    progress={enrollmentMap.get(course.id)}
                    getLevelColor={getLevelColor}
                  />
                ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No enrolled courses yet</p>
              <p className="text-muted-foreground">Start learning by enrolling in a course</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="free" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses
              ?.filter(c => c.is_free)
              .map((course) => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  progress={enrollmentMap.get(course.id)}
                  getLevelColor={getLevelColor}
                />
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CourseCard({ 
  course, 
  progress,
  getLevelColor 
}: { 
  course: Course; 
  progress?: number;
  getLevelColor: (level: string | null) => string;
}) {
  const isEnrolled = progress !== undefined;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all group">
      {/* Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-primary/20 to-purple-500/20 overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-primary/50" />
          </div>
        )}
        {course.is_free && (
          <Badge className="absolute top-2 left-2 bg-green-500 text-white">Free</Badge>
        )}
        {isEnrolled && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${progress || 0}%` }}
            />
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className={getLevelColor(course.level)}>
            {course.level || 'All Levels'}
          </Badge>
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-medium">{course.rating?.toFixed(1) || '0.0'}</span>
          </div>
        </div>
        <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
        <CardDescription className="line-clamp-2">{course.description}</CardDescription>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{course.duration_hours || 0}h</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{course.student_count}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <Link to={`/academy/course/${course.id}`} className="w-full">
          <Button className="w-full group/btn">
            {isEnrolled ? (
              <>
                <Play className="w-4 h-4 mr-2" />
                Continue ({Math.round(progress || 0)}%)
              </>
            ) : (
              <>
                View Course
                <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}