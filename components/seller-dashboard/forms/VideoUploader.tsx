
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Play, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { compressVideoForUpload } from '@/lib/media/compressVideo';

interface VideoUploaderProps {
  value?: string; // Can be file URL or external URL
  onChange: (url: string | null) => void;
  onFileChange?: (file: File | null) => void;
  disabled?: boolean;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({
  value,
  onChange,
  onFileChange,
  disabled = false
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState(value || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Maximum file size: 100MB
  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  const RECOMMENDED_SIZE = 50 * 1024 * 1024;
  
  // Accepted formats
  const ACCEPTED_FORMATS = ['video/mp4', 'video/webm'];
  const ACCEPTED_EXTENSIONS = ['.mp4', '.webm'];

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size too large. Maximum allowed: 100MB. Your file: ${(file.size / 1024 / 1024).toFixed(1)}MB`;
    }

    // Check file type
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return `Invalid file format. Only MP4 and WebM files are allowed.`;
    }

    // Warn about large files
    if (file.size > RECOMMENDED_SIZE) {
      toast(`Large file detected (${(file.size / 1024 / 1024).toFixed(1)}MB). Consider compressing for faster upload.`, {
        duration: 5000,
      });
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setValidationError(null);

      // Validate file
      const error = validateFile(file);
      if (error) {
        setValidationError(error);
        toast.error(error);
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to upload videos');
      }

      setIsCompressing(true);
      setUploadProgress(5);
      const optimized = await compressVideoForUpload(file, (ratio) => {
        setUploadProgress(5 + Math.round(ratio * 45));
      });
      setIsCompressing(false);

      const fileExt = optimized.name.split('.').pop() || 'mp4';
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Simulate progress for better UX since Supabase doesn't support progress tracking
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('sale-listing-videos')
        .upload(fileName, optimized);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('sale-listing-videos')
        .getPublicUrl(fileName);

      setUploadedFile(optimized);
      onChange(publicUrl);
      onFileChange?.(file);
      
      // Clear external URL when file is uploaded
      setExternalUrl('');
      
      toast.success('Video uploaded successfully!');
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploading(false);
      setIsCompressing(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleUrlChange = (url: string) => {
    setExternalUrl(url);
    if (url.trim()) {
      // Clear uploaded file when URL is entered
      setUploadedFile(null);
      onChange(url);
      onFileChange?.(null);
    } else {
      onChange(null);
    }
  };

  const handleDelete = () => {
    setUploadedFile(null);
    setExternalUrl('');
    onChange(null);
    onFileChange?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasVideo = uploadedFile || (externalUrl && externalUrl.trim() !== '');

  return (
    <div className="space-y-4">
      {/* Helper Text */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Video Guidelines</p>
          <p>Accepted formats: MP4/WebM • Max size: 100MB • Recommended: under 50MB for faster upload</p>
        </div>
      </div>

      {/* External URL Input */}
      <div className="space-y-2">
        <Label>Video URL (YouTube, Vimeo, etc.)</Label>
        <Input
          type="url"
          placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
          value={externalUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          disabled={disabled || !!uploadedFile}
        />
        {uploadedFile && (
          <p className="text-sm text-gray-500">
            Video URL is disabled when a file is uploaded
          </p>
        )}
      </div>

      <div className="text-center text-gray-500 font-medium">OR</div>

      {/* File Upload Section */}
      {!uploadedFile ? (
        <Card className={`border-2 border-dashed transition-colors ${
          !externalUrl?.trim() 
            ? 'border-gray-300 hover:border-gray-400' 
            : 'border-gray-200 bg-gray-50'
        }`}>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className={`mx-auto w-12 h-12 rounded-lg flex items-center justify-center ${
                !externalUrl?.trim() 
                  ? 'bg-gray-100' 
                  : 'bg-gray-200'
              }`}>
                <Upload className={`w-6 h-6 ${
                  !externalUrl?.trim() 
                    ? 'text-gray-400' 
                    : 'text-gray-300'
                }`} />
              </div>
              
              <div>
                <p className={`text-lg font-medium ${
                  !externalUrl?.trim() 
                    ? 'text-gray-900' 
                    : 'text-gray-400'
                }`}>
                  Upload a video
                </p>
                <p className={`text-sm ${
                  !externalUrl?.trim() 
                    ? 'text-gray-500' 
                    : 'text-gray-400'
                }`}>
                  MP4, WebM up to 100MB
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(',')}
                onChange={handleFileSelect}
                disabled={disabled || isUploading || isCompressing || !!externalUrl?.trim()}
                className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium ${
                  !externalUrl?.trim()
                    ? 'text-gray-500 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
                    : 'text-gray-400 file:bg-gray-200 file:text-gray-400 cursor-not-allowed'
                }`}
              />

              {externalUrl?.trim() && (
                <p className="text-sm text-gray-400 mt-2">
                  Video upload is disabled when a video URL is provided
                </p>
              )}
            </div>

            {/* Upload Progress */}
            {(isUploading || isCompressing) && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{isCompressing ? "Optimizing video…" : "Uploading…"}</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {/* Validation Error */}
            {validationError && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{validationError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Video Preview */
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Video uploaded</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700"
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative">
                <video
                  controls
                  className="w-full max-w-md mx-auto rounded-lg shadow-sm"
                  src={URL.createObjectURL(uploadedFile)}
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">File:</span> {uploadedFile.name}
                  </div>
                  <div>
                    <span className="font-medium">Size:</span> {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* External URL Preview */}
      {externalUrl && externalUrl.trim() !== '' && !uploadedFile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-600" />
                <span className="font-medium">External video URL</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-2 break-all">{externalUrl}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export { VideoUploader };
