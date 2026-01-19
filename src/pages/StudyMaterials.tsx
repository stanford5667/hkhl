import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AcademyTabs } from '@/components/academy/AcademyTabs';
import {
  Search,
  FileText,
  Download,
  Eye,
  BookOpen,
  FileSpreadsheet,
  FileImage,
  File as FileIcon
} from 'lucide-react';

interface StudyMaterial {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  tags: string[] | null;
  download_count: number;
  created_at: string;
}

export default function StudyMaterials() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const { data: materials, isLoading } = useQuery({
    queryKey: ['study-materials', selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('study_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StudyMaterial[];
    },
  });

  const filteredMaterials = materials?.filter(material => {
    const matchesSearch =
      material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || material.file_type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <FileIcon className="w-8 h-8 text-muted-foreground" />;
    if (fileType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel'))
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    if (fileType.includes('image'))
      return <FileImage className="w-8 h-8 text-blue-500" />;
    if (fileType.includes('document'))
      return <FileText className="w-8 h-8 text-blue-600" />;
    return <FileIcon className="w-8 h-8 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'technical-analysis', label: 'Technical Analysis' },
    { value: 'fundamental-analysis', label: 'Fundamental Analysis' },
    { value: 'risk-management', label: 'Risk Management' },
    { value: 'trading-strategies', label: 'Trading Strategies' },
    { value: 'market-psychology', label: 'Market Psychology' },
    { value: 'portfolio-management', label: 'Portfolio Management' },
  ];

  const fileTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'application/pdf', label: 'PDF' },
    { value: 'spreadsheet', label: 'Spreadsheet' },
    { value: 'document', label: 'Document' },
    { value: 'presentation', label: 'Presentation' },
  ];

  return (
    <div className="min-h-screen">
      <AcademyTabs />
      <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-6">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 border border-primary/30 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">Study Materials Library</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Access downloadable resources, templates, and reference materials to support your learning
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{materials?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Materials</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{categories.length - 1}</div>
            <div className="text-sm text-muted-foreground">Categories</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {materials?.reduce((sum, m) => sum + (m.download_count || 0), 0) || 0}
            </div>
            <div className="text-sm text-muted-foreground">Downloads</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {materials?.filter(m => {
                const created = new Date(m.created_at);
                const now = new Date();
                return created.getMonth() === now.getMonth() && 
                       created.getFullYear() === now.getFullYear();
              }).length || 0}
            </div>
            <div className="text-sm text-muted-foreground">This Month</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search materials..."
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
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fileTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Materials Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Materials</TabsTrigger>
          <TabsTrigger value="recent">Recently Added</TabsTrigger>
          <TabsTrigger value="popular">Most Downloaded</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : filteredMaterials && filteredMaterials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMaterials.map((material) => (
                <MaterialCard key={material.id} material={material} getFileIcon={getFileIcon} formatFileSize={formatFileSize} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No materials found</p>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials?.slice(0, 6).map((material) => (
              <MaterialCard key={material.id} material={material} getFileIcon={getFileIcon} formatFileSize={formatFileSize} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="popular" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials
              ?.sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
              .slice(0, 6)
              .map((material) => (
                <MaterialCard key={material.id} material={material} getFileIcon={getFileIcon} formatFileSize={formatFileSize} />
              ))}
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

function MaterialCard({ 
  material, 
  getFileIcon, 
  formatFileSize 
}: { 
  material: StudyMaterial; 
  getFileIcon: (type: string | null) => JSX.Element;
  formatFileSize: (bytes: number | null) => string;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {getFileIcon(material.file_type)}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2 mb-2">
              {material.title}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {material.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {material.category && (
            <Badge variant="outline">{material.category}</Badge>
          )}
          {material.tags?.slice(0, 2).map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatFileSize(material.file_size)}</span>
          <div className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            <span>{material.download_count || 0}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button size="sm" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}