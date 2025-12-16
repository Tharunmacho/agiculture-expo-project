import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PostTemplateSelector } from './PostTemplateSelector';
import { 
  Send, 
  Image, 
  FileText, 
  X, 
  Upload,
  Bold,
  Italic,
  List,
  Link as LinkIcon
} from 'lucide-react';

interface PostEditorProps {
  onPostCreated: () => void;
  editingPost?: any;
  onEditComplete?: () => void;
}

export const PostEditor: React.FC<PostEditorProps> = ({ 
  onPostCreated, 
  editingPost, 
  onEditComplete 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: editingPost?.title || '',
    content: editingPost?.content || '',
    category: editingPost?.category || 'question',
    tags: editingPost?.tags?.join(', ') || ''
  });
  
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRichEditor, setShowRichEditor] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTemplateSelect = (templateData: any) => {
    setFormData(prev => ({
      ...prev,
      ...templateData,
      tags: templateData.tags?.join(', ') || prev.tags
    }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Only image files are allowed",
        variant: "destructive",
      });
      return;
    }

    if (attachments.length + imageFiles.length > 5) {
      toast({
        title: "Too Many Files",
        description: "Maximum 5 images allowed per post",
        variant: "destructive",
      });
      return;
    }

    setAttachments(prev => [...prev, ...imageFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (postId: string) => {
    if (attachments.length === 0) return;

    const uploadPromises = attachments.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${postId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('post-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('post-attachments')
        .getPublicUrl(fileName);

      return {
        post_id: postId,
        file_url: publicUrl,
        file_type: 'image',
        file_size: file.size,
        original_filename: file.name
      };
    });

    const attachmentData = await Promise.all(uploadPromises);
    
    const { error } = await supabase
      .from('post_attachments')
      .insert(attachmentData);

    if (error) throw error;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in title and content",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      if (editingPost) {
        // Update existing post
        const { error } = await supabase
          .from('community_posts')
          .update({
            title: formData.title,
            content: formData.content,
            category: formData.category,
            tags: tagsArray
          })
          .eq('id', editingPost.id);

        if (error) throw error;

        if (attachments.length > 0) {
          await uploadAttachments(editingPost.id);
        }

        toast({
          title: "Success",
          description: "Post updated successfully",
        });
        
        onEditComplete?.();
      } else {
        // Create new post
        const { data: newPost, error } = await supabase
          .from('community_posts')
          .insert({
            title: formData.title,
            content: formData.content,
            category: formData.category,
            tags: tagsArray,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;

        if (attachments.length > 0) {
          await uploadAttachments(newPost.id);
        }

        // Reset form
        setFormData({
          title: '',
          content: '',
          category: 'question',
          tags: ''
        });
        setAttachments([]);

        toast({
          title: "Success",
          description: "Post created successfully",
        });
        
        onPostCreated();
      }
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingPost ? 'update' : 'create'} post`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertFormatting = (before: string, after: string = '') => {
    const textarea = document.getElementById('post-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end);
    const beforeText = formData.content.substring(0, start);
    const afterText = formData.content.substring(end);
    
    const newText = beforeText + before + selectedText + after + afterText;
    setFormData(prev => ({ ...prev, content: newText }));
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length, 
        end + before.length
      );
    }, 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{editingPost ? 'Edit Post' : 'Create New Post'}</span>
          <div className="flex items-center gap-2">
            {!editingPost && (
              <PostTemplateSelector onTemplateSelect={handleTemplateSelect}>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              </PostTemplateSelector>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRichEditor(!showRichEditor)}
            >
              {showRichEditor ? 'Simple' : 'Rich'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Post title..."
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
        />

        <div className="space-y-2">
          {showRichEditor && (
            <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/50">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertFormatting('**', '**')}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertFormatting('*', '*')}
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertFormatting('\n- ', '')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertFormatting('[', '](url)')}
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <Textarea
            id="post-content"
            placeholder="Share your question, experience, or advice..."
            value={formData.content}
            onChange={(e) => handleInputChange('content', e.target.value)}
            className="min-h-[120px] resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            value={formData.category} 
            onValueChange={(value) => handleInputChange('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="question">Question</SelectItem>
              <SelectItem value="advice">Advice</SelectItem>
              <SelectItem value="discussion">Discussion</SelectItem>
              <SelectItem value="market">Market Info</SelectItem>
              <SelectItem value="success">Success Story</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Tags (comma separated)"
            value={formData.tags}
            onChange={(e) => handleInputChange('tags', e.target.value)}
          />
        </div>

        {/* File Upload Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="h-4 w-4 mr-2" />
              Add Images
            </Button>
            <span className="text-xs text-muted-foreground">
              {attachments.length}/5 images
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {attachments.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {attachments.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeAttachment(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <p className="text-xs text-center mt-1 truncate">
                    {file.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tags Preview */}
        {formData.tags && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.split(',').map((tag, index) => {
              const trimmedTag = tag.trim();
              return trimmedTag ? (
                <Badge key={index} variant="outline" className="text-xs">
                  #{trimmedTag}
                </Badge>
              ) : null;
            })}
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.title.trim() || !formData.content.trim()}
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : editingPost ? 'Update Post' : 'Post'}
          </Button>
          
          {editingPost && (
            <Button 
              variant="outline" 
              onClick={onEditComplete}
            >
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};