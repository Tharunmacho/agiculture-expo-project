import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Leaf, 
  TrendingUp, 
  HelpCircle,
  ChevronRight
} from 'lucide-react';

interface PostTemplate {
  id: string;
  name: string;
  description: string;
  template_content: any;
  category: string;
}

interface PostTemplateField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  required: boolean;
  options?: string[];
}

interface PostTemplateSelectorProps {
  onTemplateSelect: (postData: any) => void;
  children: React.ReactNode;
}

export const PostTemplateSelector: React.FC<PostTemplateSelectorProps> = ({ 
  onTemplateSelect, 
  children 
}) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<PostTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('post_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load post templates",
        variant: "destructive",
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'plant_health':
        return <Leaf className="h-5 w-5 text-green-600" />;
      case 'crop_management':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'market':
        return <TrendingUp className="h-5 w-5 text-orange-600" />;
      default:
        return <HelpCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleTemplateSelect = (template: PostTemplate) => {
    setSelectedTemplate(template);
    setFormData({});
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = () => {
    if (!selectedTemplate) return;

    const fields = selectedTemplate.template_content.fields as PostTemplateField[];
    const requiredFields = fields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => !formData[field.name]?.trim());

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.map(f => f.label).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Build post content from template
    let content = '';
    fields.forEach(field => {
      if (formData[field.name]) {
        content += `**${field.label}:** ${formData[field.name]}\n\n`;
      }
    });

    const postData = {
      title: selectedTemplate.template_content.title || selectedTemplate.name,
      content: content.trim(),
      category: selectedTemplate.category === 'plant_health' ? 'question' : 
                selectedTemplate.category === 'crop_management' ? 'advice' : 'market',
      tags: [selectedTemplate.category, ...Object.keys(formData)]
    };

    onTemplateSelect(postData);
    setIsOpen(false);
    setSelectedTemplate(null);
    setFormData({});
  };

  const renderTemplateForm = () => {
    if (!selectedTemplate) return null;

    const fields = selectedTemplate.template_content.fields as PostTemplateField[];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedTemplate(null)}
          >
            ← Back to Templates
          </Button>
        </div>
        
        <div className="border-l-4 border-primary pl-4 mb-6">
          <h3 className="font-semibold">{selectedTemplate.name}</h3>
          <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
        </div>

        {fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {field.type === 'text' && (
              <Input
                value={formData[field.name] || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}`}
              />
            )}
            
            {field.type === 'textarea' && (
              <Textarea
                value={formData[field.name] || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={`Describe ${field.label.toLowerCase()}`}
                rows={3}
              />
            )}
            
            {field.type === 'select' && field.options && (
              <Select 
                value={formData[field.name] || ''} 
                onValueChange={(value) => handleFieldChange(field.name, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSubmit} className="flex-1">
            Use This Template
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setSelectedTemplate(null)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {selectedTemplate ? 'Fill Template Details' : 'Choose a Post Template'}
          </DialogTitle>
        </DialogHeader>

        {selectedTemplate ? renderTemplateForm() : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a template to get started with a structured post format
            </p>
            
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No templates available</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {templates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(template.category)}
                          <div>
                            <h3 className="font-semibold">{template.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {template.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {template.category.replace('_', ' ')}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            <div className="text-center pt-4">
              <Button 
                variant="ghost" 
                onClick={() => setIsOpen(false)}
              >
                Skip Templates
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};