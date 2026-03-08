import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Pencil,
  Trash2,
  Video,
  GripVertical,
  Loader2,
  BookOpen,
  Layers,
  FileText,
  Save,
  Eye,
  EyeOff,
  Upload,
  CheckCircle,
  ArrowRightLeft,
} from 'lucide-react';
import { BulkVideoUpload } from './BulkVideoUpload';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  thumbnail_url: string | null;
  is_published: boolean | null;
  is_free: boolean | null;
  price: number | null;
  duration_hours: number | null;
  created_at: string | null;
}

interface Module {
  id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  order_index: number;
}

interface Lesson {
  id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  content: string | null;
  video_url: string | null;
  video_provider: string | null;
  video_duration: number | null;
  order_index: number;
  is_preview: boolean | null;
}

export function AdminCoursesTab() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Record<string, Module[]>>({});
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  
  // Edit states
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Bulk selection
  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<string>>(new Set());
  const [moveTargetModuleId, setMoveTargetModuleId] = useState<string>('');
  const [movingLessons, setMovingLessons] = useState(false);
  // Track which module the selected lessons belong to (for context)
  const [selectionSourceModuleId, setSelectionSourceModuleId] = useState<string | null>(null);

  // Form states
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: '',
    level: 'beginner',
    thumbnail_url: '',
    is_published: false,
    is_free: true,
    price: 0,
  });

  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: '',
  });

  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    content: '',
    video_url: '',
    video_provider: 'youtube',
    video_duration: 0,
    is_preview: false,
  });

  useEffect(() => {
    fetchCourses(true);
  }, []);

  const fetchCourses = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);

      // Fetch modules for each course
      for (const course of data || []) {
        await fetchModules(course.id);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      toast({ title: 'Error', description: 'Failed to load courses', variant: 'destructive' });
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchModules = async (courseId: string) => {
    const { data, error } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');

    if (!error && data) {
      setModules(prev => ({ ...prev, [courseId]: data }));
      
      // Fetch lessons for each module
      for (const module of data) {
        await fetchLessons(module.id);
      }
    }
  };

  const fetchLessons = async (moduleId: string) => {
    const { data, error } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('order_index');

    if (!error && data) {
      setLessons(prev => ({ ...prev, [moduleId]: data }));
    }
  };

  // Course CRUD
  const saveCourse = async () => {
    setSaving(true);
    try {
      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update({
            title: courseForm.title,
            description: courseForm.description,
            category: courseForm.category,
            level: courseForm.level,
            thumbnail_url: courseForm.thumbnail_url || null,
            is_published: courseForm.is_published,
            is_free: courseForm.is_free,
            price: courseForm.is_free ? null : courseForm.price,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCourse.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Course updated' });
      } else {
        const { data, error } = await supabase
          .from('courses')
          .insert({
            title: courseForm.title,
            description: courseForm.description,
            category: courseForm.category,
            level: courseForm.level,
            thumbnail_url: courseForm.thumbnail_url || null,
            is_published: courseForm.is_published,
            is_free: courseForm.is_free,
            price: courseForm.is_free ? null : courseForm.price,
          })
          .select();

        if (error) throw error;
        
        // Add the new course to state immediately
        if (data && data.length > 0) {
          setCourses(prev => [data[0], ...prev]);
        }
        toast({ title: 'Success', description: 'Course created' });
      }

      setCourseDialogOpen(false);
      resetCourseForm();
      
      // Re-fetch to ensure sync
      await fetchCourses();
    } catch (err) {
      console.error('Error saving course:', err);
      toast({ title: 'Error', description: 'Failed to save course', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Delete this course and all its content?')) return;
    
    try {
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Course deleted' });
      fetchCourses();
    } catch (err) {
      console.error('Error deleting course:', err);
      toast({ title: 'Error', description: 'Failed to delete course', variant: 'destructive' });
    }
  };

  // Module CRUD
  const saveModule = async () => {
    if (!selectedCourseId) return;
    setSaving(true);
    
    try {
      const existingModules = modules[selectedCourseId] || [];
      const nextOrder = editingModule ? editingModule.order_index : existingModules.length;

      if (editingModule) {
        const { error } = await supabase
          .from('course_modules')
          .update({
            title: moduleForm.title,
            description: moduleForm.description,
          })
          .eq('id', editingModule.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Module updated' });
      } else {
        const { error } = await supabase
          .from('course_modules')
          .insert({
            course_id: selectedCourseId,
            title: moduleForm.title,
            description: moduleForm.description,
            order_index: nextOrder,
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Module created' });
      }

      setModuleDialogOpen(false);
      resetModuleForm();
      fetchModules(selectedCourseId);
    } catch (err) {
      console.error('Error saving module:', err);
      toast({ title: 'Error', description: 'Failed to save module', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteModule = async (moduleId: string, courseId: string) => {
    if (!confirm('Delete this module and all its lessons?')) return;
    
    try {
      const { error } = await supabase.from('course_modules').delete().eq('id', moduleId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Module deleted' });
      fetchModules(courseId);
    } catch (err) {
      console.error('Error deleting module:', err);
      toast({ title: 'Error', description: 'Failed to delete module', variant: 'destructive' });
    }
  };

  // Lesson CRUD
  const saveLesson = async () => {
    if (!selectedModuleId) return;
    setSaving(true);

    try {
      const existingLessons = lessons[selectedModuleId] || [];
      const nextOrder = editingLesson ? editingLesson.order_index : existingLessons.length;

      // DB constraint only allows: youtube | vimeo | mux | custom
      const videoProviderForDb = lessonForm.video_provider === 'upload' ? 'custom' : lessonForm.video_provider;

      if (editingLesson) {
        const { error } = await supabase
          .from('course_lessons')
          .update({
            title: lessonForm.title,
            description: lessonForm.description,
            content: lessonForm.content,
            video_url: lessonForm.video_url || null,
            video_provider: videoProviderForDb,
            video_duration: lessonForm.video_duration || null,
            is_preview: lessonForm.is_preview,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingLesson.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Lesson updated' });
      } else {
        const { error } = await supabase
          .from('course_lessons')
          .insert({
            module_id: selectedModuleId,
            title: lessonForm.title,
            description: lessonForm.description,
            content: lessonForm.content,
            video_url: lessonForm.video_url || null,
            video_provider: videoProviderForDb,
            video_duration: lessonForm.video_duration || null,
            is_preview: lessonForm.is_preview,
            order_index: nextOrder,
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Lesson created' });
      }

      setLessonDialogOpen(false);
      resetLessonForm();
      fetchLessons(selectedModuleId);
    } catch (err) {
      console.error('Error saving lesson:', err);
      toast({ title: 'Error', description: 'Failed to save lesson', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteLesson = async (lessonId: string, moduleId: string) => {
    if (!confirm('Delete this lesson?')) return;
    
    try {
      const { error } = await supabase.from('course_lessons').delete().eq('id', lessonId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Lesson deleted' });
      fetchLessons(moduleId);
    } catch (err) {
      console.error('Error deleting lesson:', err);
      toast({ title: 'Error', description: 'Failed to delete lesson', variant: 'destructive' });
    }
  };

  // Bulk lesson selection helpers
  const toggleLessonSelection = (lessonId: string, moduleId: string) => {
    setSelectedLessonIds((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      // Track source module
      if (next.size > 0) setSelectionSourceModuleId(moduleId);
      else setSelectionSourceModuleId(null);
      return next;
    });
  };

  const toggleAllInModule = (moduleId: string) => {
    const moduleLessons = lessons[moduleId] || [];
    const allSelected = moduleLessons.every((l) => selectedLessonIds.has(l.id));
    setSelectedLessonIds((prev) => {
      const next = new Set(prev);
      moduleLessons.forEach((l) => {
        if (allSelected) next.delete(l.id);
        else next.add(l.id);
      });
      if (next.size > 0) setSelectionSourceModuleId(moduleId);
      else setSelectionSourceModuleId(null);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedLessonIds(new Set());
    setSelectionSourceModuleId(null);
  };

  // All modules across all courses for the move target picker
  const allModules = Object.values(modules).flat();

  const bulkMoveLessons = async () => {
    if (!moveTargetModuleId || selectedLessonIds.size === 0) return;
    setMovingLessons(true);

    try {
      // Get existing lesson count in target module for order_index
      const targetLessons = lessons[moveTargetModuleId] || [];
      let nextOrder = targetLessons.length;

      const ids = Array.from(selectedLessonIds);
      for (const id of ids) {
        const { error } = await supabase
          .from('course_lessons')
          .update({ module_id: moveTargetModuleId, order_index: nextOrder++ })
          .eq('id', id);
        if (error) throw error;
      }

      toast({ title: 'Success', description: `Moved ${ids.length} lesson(s)` });
      setMoveDialogOpen(false);
      clearSelection();
      setMoveTargetModuleId('');

      // Refresh affected modules
      if (selectionSourceModuleId) await fetchLessons(selectionSourceModuleId);
      await fetchLessons(moveTargetModuleId);
    } catch (err) {
      console.error('Error moving lessons:', err);
      toast({ title: 'Error', description: 'Failed to move lessons', variant: 'destructive' });
    } finally {
      setMovingLessons(false);
    }
  };

  // Reset forms
  const resetCourseForm = () => {
    setEditingCourse(null);
    setCourseForm({
      title: '',
      description: '',
      category: '',
      level: 'beginner',
      thumbnail_url: '',
      is_published: false,
      is_free: true,
      price: 0,
    });
  };

  const resetModuleForm = () => {
    setEditingModule(null);
    setModuleForm({ title: '', description: '' });
  };

  const resetLessonForm = () => {
    setEditingLesson(null);
    setUploadProgress(0);
    setLessonForm({
      title: '',
      description: '',
      content: '',
      video_url: '',
      video_provider: 'youtube',
      video_duration: 0,
      is_preview: false,
    });
  };

  // Open edit dialogs
  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description || '',
      category: course.category || '',
      level: course.level || 'beginner',
      thumbnail_url: course.thumbnail_url || '',
      is_published: course.is_published || false,
      is_free: course.is_free ?? true,
      price: course.price || 0,
    });
    setCourseDialogOpen(true);
  };

  const openEditModule = (module: Module, courseId: string) => {
    setSelectedCourseId(courseId);
    setEditingModule(module);
    setModuleForm({
      title: module.title,
      description: module.description || '',
    });
    setModuleDialogOpen(true);
  };

  const openEditLesson = (lesson: Lesson, moduleId: string) => {
    setSelectedModuleId(moduleId);
    setEditingLesson(lesson);

    const isUploadedVideo = !!lesson.video_url && lesson.video_url.includes('/storage/v1/object/public/course-videos/');
    const uiProvider = isUploadedVideo ? 'upload' : (lesson.video_provider || 'youtube');

    setLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      content: lesson.content || '',
      video_url: lesson.video_url || '',
      video_provider: uiProvider,
      video_duration: lesson.video_duration || 0,
      is_preview: lesson.is_preview || false,
    });
    setLessonDialogOpen(true);
  };

  const openAddModule = (courseId: string) => {
    setSelectedCourseId(courseId);
    resetModuleForm();
    setModuleDialogOpen(true);
  };

  const openAddLesson = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    resetLessonForm();
    setLessonDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Course Management</h2>
          <p className="text-sm text-muted-foreground">Create and manage courses, modules, and lessons</p>
        </div>
        <Dialog open={courseDialogOpen} onOpenChange={(open) => { setCourseDialogOpen(open); if (!open) resetCourseForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCourse ? 'Edit Course' : 'Create New Course'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  placeholder="Course title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Course description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                    placeholder="e.g., Investing, Trading"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select value={courseForm.level} onValueChange={(v) => setCourseForm({ ...courseForm, level: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Thumbnail URL</Label>
                <Input
                  value={courseForm.thumbnail_url}
                  onChange={(e) => setCourseForm({ ...courseForm, thumbnail_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={courseForm.is_published}
                    onCheckedChange={(v) => setCourseForm({ ...courseForm, is_published: v })}
                  />
                  <Label>Published</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={courseForm.is_free}
                    onCheckedChange={(v) => setCourseForm({ ...courseForm, is_free: v })}
                  />
                  <Label>Free Course</Label>
                </div>
              </div>
              {!courseForm.is_free && (
                <div className="space-y-2">
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    value={courseForm.price}
                    onChange={(e) => setCourseForm({ ...courseForm, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
              <Button onClick={saveCourse} disabled={saving || !courseForm.title} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingCourse ? 'Update Course' : 'Create Course'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Module Dialog */}
      <Dialog open={moduleDialogOpen} onOpenChange={(open) => { setModuleDialogOpen(open); if (!open) resetModuleForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? 'Edit Module' : 'Add Module'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                placeholder="Module title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                placeholder="Module description"
                rows={2}
              />
            </div>
            <Button onClick={saveModule} disabled={saving || !moduleForm.title} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingModule ? 'Update Module' : 'Add Module'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={(open) => { setLessonDialogOpen(open); if (!open) resetLessonForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                placeholder="Lesson title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={lessonForm.description}
                onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                placeholder="Lesson description"
                rows={2}
              />
            </div>
            
            {/* Video Section */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Video Settings</Label>
              </div>
              
              <div className="space-y-2">
                <Label>Video Source</Label>
                <Select value={lessonForm.video_provider} onValueChange={(v) => setLessonForm({ ...lessonForm, video_provider: v, video_url: '' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upload">Upload Video</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                    <SelectItem value="custom">Custom URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Direct Upload */}
              {lessonForm.video_provider === 'upload' && (
                <div className="space-y-3">
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      // Validate file size (5GB limit)
                      if (file.size > 5368709120) {
                        toast({ title: 'Error', description: 'Video must be under 5GB', variant: 'destructive' });
                        return;
                      }
                      
                      setUploading(true);
                      setUploadProgress(0);
                      
                      try {
                        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                        const filePath = `lessons/${fileName}`;
                        
                        // Simulate progress (Supabase doesn't provide real progress)
                        const progressInterval = setInterval(() => {
                          setUploadProgress(prev => Math.min(prev + 10, 90));
                        }, 500);
                        
                        const { data, error } = await supabase.storage
                          .from('course-videos')
                          .upload(filePath, file, {
                            cacheControl: '3600',
                            upsert: false,
                          });
                        
                        clearInterval(progressInterval);
                        
                        if (error) throw error;
                        
                        // Get public URL
                        const { data: urlData } = supabase.storage
                          .from('course-videos')
                          .getPublicUrl(filePath);
                        
                        setUploadProgress(100);
                        setLessonForm(prev => ({ ...prev, video_url: urlData.publicUrl }));
                        toast({ title: 'Success', description: 'Video uploaded successfully' });
                      } catch (err) {
                        console.error('Upload error:', err);
                        toast({ title: 'Error', description: 'Failed to upload video', variant: 'destructive' });
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                  
                  {!lessonForm.video_url ? (
                    <div 
                      onClick={() => !uploading && videoInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        uploading ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5'
                      }`}
                    >
                      {uploading ? (
                        <div className="space-y-3">
                          <Loader2 className="h-10 w-10 text-primary mx-auto animate-spin" />
                          <p className="text-sm text-muted-foreground">Uploading video...</p>
                          <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                          <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm font-medium">Click to upload video</p>
                          <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM up to 5GB</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">Video uploaded</p>
                        <p className="text-xs text-muted-foreground truncate">{lessonForm.video_url}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setLessonForm(prev => ({ ...prev, video_url: '' }));
                          setUploadProgress(0);
                        }}
                      >
                        Replace
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {/* URL-based providers */}
              {lessonForm.video_provider !== 'upload' && (
                <div className="space-y-2">
                  <Label>Video URL</Label>
                  <Input
                    value={lessonForm.video_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                    placeholder={
                      lessonForm.video_provider === 'youtube' 
                        ? 'https://www.youtube.com/watch?v=...' 
                        : lessonForm.video_provider === 'vimeo'
                        ? 'https://vimeo.com/...'
                        : 'Enter video embed URL'
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {lessonForm.video_provider === 'youtube' && 'Paste a YouTube video URL (e.g., https://www.youtube.com/watch?v=abc123)'}
                    {lessonForm.video_provider === 'vimeo' && 'Paste a Vimeo video URL (e.g., https://vimeo.com/123456)'}
                    {lessonForm.video_provider === 'custom' && 'Paste a direct video embed URL'}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={lessonForm.video_duration}
                  onChange={(e) => setLessonForm({ ...lessonForm, video_duration: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 15"
                />
              </div>
              
              {/* Video Preview */}
              {lessonForm.video_url && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="aspect-video bg-black/20 rounded-lg overflow-hidden">
                    {lessonForm.video_provider === 'upload' && lessonForm.video_url && (
                      <video
                        className="w-full h-full"
                        src={lessonForm.video_url}
                        controls
                      />
                    )}
                    {lessonForm.video_provider === 'youtube' && lessonForm.video_url && (
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${lessonForm.video_url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&?#]+)/)?.[1] || ''}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )}
                    {lessonForm.video_provider === 'vimeo' && lessonForm.video_url && (
                      <iframe
                        className="w-full h-full"
                        src={`https://player.vimeo.com/video/${lessonForm.video_url.match(/vimeo\.com\/(\d+)/)?.[1] || ''}`}
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    )}
                    {lessonForm.video_provider === 'custom' && lessonForm.video_url && (
                      <iframe
                        className="w-full h-full"
                        src={lessonForm.video_url}
                        allowFullScreen
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Content (Markdown)</Label>
              <Textarea
                value={lessonForm.content}
                onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                placeholder="Lesson content in markdown..."
                rows={6}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={lessonForm.is_preview}
                onCheckedChange={(v) => setLessonForm({ ...lessonForm, is_preview: v })}
              />
              <Label>Free Preview (visible to non-enrolled users)</Label>
            </div>
            <Button onClick={saveLesson} disabled={saving || !lessonForm.title} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingLesson ? 'Update Lesson' : 'Add Lesson'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Courses List */}
      {courses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No courses yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first course to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {course.title}
                        {course.is_published ? (
                          <Badge variant="default" className="gap-1">
                            <Eye className="h-3 w-3" /> Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <EyeOff className="h-3 w-3" /> Draft
                          </Badge>
                        )}
                        {course.is_free && <Badge variant="outline">Free</Badge>}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {course.category} • {course.level}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditCourse(course)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteCourse(course.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {/* Modules */}
                  {(modules[course.id] || []).map((module) => (
                    <AccordionItem key={module.id} value={module.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <span>{module.title}</span>
                          <Badge variant="outline" className="ml-2">
                            {(lessons[module.id] || []).length} lessons
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pl-7 space-y-2">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModule(module, course.id)}
                              className="gap-1"
                            >
                              <Pencil className="h-3 w-3" /> Edit Module
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteModule(module.id, course.id)}
                              className="gap-1 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                            <BulkVideoUpload
                              moduleId={module.id}
                              existingLessonCount={(lessons[module.id] || []).length}
                              onComplete={() => fetchLessons(module.id)}
                            />
                            {(lessons[module.id] || []).length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleAllInModule(module.id)}
                                className="gap-1"
                              >
                                <CheckCircle className="h-3 w-3" />
                                {(lessons[module.id] || []).every((l) => selectedLessonIds.has(l.id))
                                  ? 'Deselect All'
                                  : 'Select All'}
                              </Button>
                            )}
                            {selectedLessonIds.size > 0 && selectionSourceModuleId === module.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setMoveTargetModuleId('');
                                  setMoveDialogOpen(true);
                                }}
                                className="gap-1 text-primary"
                              >
                                <ArrowRightLeft className="h-3 w-3" />
                                Move {selectedLessonIds.size} Lesson{selectedLessonIds.size > 1 ? 's' : ''}
                              </Button>
                            )}
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openAddLesson(module.id)}
                              className="gap-1 ml-auto"
                            >
                              <Plus className="h-3 w-3" /> Add Lesson
                            </Button>
                          </div>
                          
                          {/* Lessons */}
                          {(lessons[module.id] || []).map((lesson) => (
                            <div
                              key={lesson.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                selectedLessonIds.has(lesson.id)
                                  ? 'bg-primary/10 border-primary/30'
                                  : 'bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={selectedLessonIds.has(lesson.id)}
                                  onCheckedChange={() => toggleLessonSelection(lesson.id, module.id)}
                                />
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                {lesson.video_url ? (
                                  <Video className="h-4 w-4 text-primary" />
                                ) : (
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div>
                                  <p className="text-sm font-medium">{lesson.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {lesson.video_provider === 'custom' ? 'Uploaded' : lesson.video_provider || 'No video'}
                                    {lesson.video_duration != null && lesson.video_duration > 0 && (
                                      <span> • {formatDuration(lesson.video_duration)}</span>
                                    )}
                                  </p>
                                </div>
                                {lesson.is_preview && <Badge variant="secondary">Preview</Badge>}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditLesson(lesson, module.id)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteLesson(lesson.id, module.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          
                          {(lessons[module.id] || []).length === 0 && (
                            <p className="text-sm text-muted-foreground py-2">No lessons yet</p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAddModule(course.id)}
                  className="mt-4 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Module
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Bulk Move Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={(open) => { setMoveDialogOpen(open); if (!open) setMoveTargetModuleId(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move Lessons to Another Module</DialogTitle>
            <DialogDescription>
              Select a target module to move {selectedLessonIds.size} lesson{selectedLessonIds.size > 1 ? 's' : ''} to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Target Module</Label>
              <Select value={moveTargetModuleId} onValueChange={setMoveTargetModuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a module…" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    (modules[c.id] || [])
                      .filter((m) => m.id !== selectionSourceModuleId)
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {c.title} → {m.title}
                        </SelectItem>
                      ))
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              Moving: {Array.from(selectedLessonIds).map((id) => {
                const allLessons = Object.values(lessons).flat();
                const lesson = allLessons.find((l) => l.id === id);
                return lesson?.title;
              }).filter(Boolean).join(', ')}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setMoveDialogOpen(false); clearSelection(); }}>
                Cancel
              </Button>
              <Button
                onClick={bulkMoveLessons}
                disabled={!moveTargetModuleId || movingLessons}
                className="gap-2"
              >
                {movingLessons ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                Move Lessons
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
