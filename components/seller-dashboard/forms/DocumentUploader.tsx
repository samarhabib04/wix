
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { compressImageForUpload } from '@/lib/media/compressImage';

export interface UploadedDocument {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

interface DocumentUploaderProps {
  value?: UploadedDocument[];
  onChange: (documents: UploadedDocument[]) => void;
  disabled?: boolean;
  maxDocuments?: number;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  value = [],
  onChange,
  disabled = false,
  maxDocuments = 5
}) => {
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Maximum file size: 10MB per document
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  
  // Accepted formats for documents
  const ACCEPTED_FORMATS = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size too large. Maximum allowed: 10MB. Your file: ${(file.size / 1024 / 1024).toFixed(1)}MB`;
    }

    // Check file type
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return `Invalid file format. Accepted formats: PDF, JPG, PNG, DOC, DOCX`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      const documentId = Date.now().toString();
      
      // Validate file
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      // Check if we've reached the maximum number of documents
      if (value.length >= maxDocuments) {
        toast.error(`Maximum ${maxDocuments} documents allowed`);
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to upload documents');
      }

      let uploadPayload = file;
      if (file.type.startsWith('image/')) {
        uploadPayload = await compressImageForUpload(file, 'documentImage');
      }

      const fileExt =
        uploadPayload.name.includes(".") ? uploadPayload.name.split(".").pop() : "webp";
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => ({
          ...prev,
          [documentId]: Math.min((prev[documentId] || 0) + Math.random() * 20, 90)
        }));
      }, 200);

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('sale-listing-documents')
        .upload(fileName, uploadPayload);

      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [documentId]: 100 }));

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('sale-listing-documents')
        .getPublicUrl(fileName);

      const newDocument: UploadedDocument = {
        id: documentId,
        file: uploadPayload,
        url: publicUrl,
        name: file.name,
        size: uploadPayload.size
      };

      onChange([...value, newDocument]);
      
      toast.success('Document uploaded successfully!');
      
      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const updated = { ...prev };
          delete updated[documentId];
          return updated;
        });
      }, 1000);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    files.forEach(file => uploadFile(file));
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = (documentId: string) => {
    const updatedDocuments = value.filter(doc => doc.id !== documentId);
    onChange(updatedDocuments);
    toast.success('Document removed');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      

      {/* Upload Area */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-gray-400" />
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-900">Upload Documents</p>
              <p className="text-sm text-gray-500">
                PDF, JPG, PNG, DOC, DOCX up to 10MB each
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(',')}
              onChange={handleFileSelect}
              disabled={disabled || isUploading || value.length >= maxDocuments}
              multiple
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            />

            {value.length >= maxDocuments && (
              <p className="text-sm text-gray-400">
                Maximum {maxDocuments} documents reached
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Documents */}
      {value.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Uploaded Documents ({value.length}/{maxDocuments})</h4>
          {value.map((document) => (
            <Card key={document.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-8 w-8 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{document.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(document.size)}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(document.id)}
                    className="text-red-600 hover:text-red-700 flex-shrink-0"
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Upload Progress */}
                {uploadProgress[document.id] !== undefined && uploadProgress[document.id] < 100 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Uploading...</span>
                      <span>{Math.round(uploadProgress[document.id])}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress[document.id]}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export { DocumentUploader };
