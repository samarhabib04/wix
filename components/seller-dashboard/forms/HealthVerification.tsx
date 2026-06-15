
import { Upload, FileText, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface HealthVerificationProps {
  v1Checked: boolean;
  v2Checked: boolean;
  h1Checked: boolean;
  h2Checked?: boolean;
  microchipChecked?: boolean;
  vaccinationChecked?: boolean;
  onV1Change: (checked: boolean) => void;
  onV2Change: (checked: boolean) => void;
  onH1Change: (checked: boolean) => void;
  onH2Change?: (checked: boolean) => void;
  onMicrochipChange?: (checked: boolean) => void;
  onVaccinationChange?: (checked: boolean) => void;
  onDocumentUpload: (file: File) => void;
  documentName?: string;
  v1Document?: File | null;
  v2Document?: File | null;
  h1Document?: File | null;
  onV1DocumentUpload?: (file: File | null) => void;
  onV2DocumentUpload?: (file: File | null) => void;
  onH1DocumentUpload?: (file: File | null) => void;
}

interface DocumentUploaderProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  document: File | null;
  onDocumentUpload: (file: File | null) => void;
  id: string;
  uploadButtonText: string;
}

const DocumentUploader = ({ 
  label, 
  checked, 
  onCheckedChange, 
  document, 
  onDocumentUpload, 
  id,
  uploadButtonText
}: DocumentUploaderProps) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onDocumentUpload(event.target.files[0]);
    }
  };

  const handleRemoveDocument = () => {
    onDocumentUpload(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox 
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
        <Label htmlFor={id} className="font-medium">
          {label}
        </Label>
      </div>
      
      <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
        <div className="flex flex-col items-center">
          <FileText className="h-8 w-8 text-gray-400 mb-2" />
          {document ? (
            <div className="text-center">
              <p className="text-sm font-medium text-emerald-600 mb-2">{document.name}</p>
              <div className="flex space-x-2">
                <label className="cursor-pointer">
                  <span className="text-xs text-blue-600 hover:underline">Replace</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRemoveDocument}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label className="cursor-pointer">
              <span className="text-xs inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Upload className="mr-1 h-3 w-3" />
                {uploadButtonText}
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}
          <p className="mt-1 text-xs text-gray-500">
            PDF, DOC, DOCX, JPG, PNG
          </p>
        </div>
      </div>
    </div>
  );
};

export const HealthVerification = ({
  v1Checked,
  v2Checked,
  h1Checked,
  h2Checked,
  microchipChecked,
  vaccinationChecked,
  onV1Change,
  onV2Change,
  onH1Change,
  onH2Change,
  onMicrochipChange,
  onVaccinationChange,
  onDocumentUpload,
  documentName,
  v1Document,
  v2Document,
  h1Document,
  onV1DocumentUpload,
  onV2DocumentUpload,
  onH1DocumentUpload
}: HealthVerificationProps) => {
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onDocumentUpload(event.target.files[0]);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Individual Document Uploaders */}
      {(onV1DocumentUpload && onV2DocumentUpload && onH1DocumentUpload) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DocumentUploader
            label="This dog has received their V1"
            checked={v1Checked}
            onCheckedChange={onV1Change}
            document={v1Document || null}
            onDocumentUpload={onV1DocumentUpload}
            id="v1-check"
            uploadButtonText="Upload V1 Document"
          />
          
          <DocumentUploader
            label="This dog has received their V2"
            checked={v2Checked}
            onCheckedChange={onV2Change}
            document={v2Document || null}
            onDocumentUpload={onV2DocumentUpload}
            id="v2-check"
            uploadButtonText="Upload V2 Document"
          />
          
          <DocumentUploader
            label="This dog has received their H1"
            checked={h1Checked}
            onCheckedChange={onH1Change}
            document={h1Document || null}
            onDocumentUpload={onH1DocumentUpload}
            id="h1-check"
            uploadButtonText="Upload H1 Document"
          />
        </div>
      ) : (
        // Fallback to original single uploader
        <div>
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6">
            <div className="flex flex-col items-center">
              <FileText className="h-12 w-12 text-gray-400 mb-2" />
              {documentName ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-emerald-600">{documentName}</p>
                  <label className="mt-2 inline-block cursor-pointer">
                    <span className="text-sm text-blue-600 hover:underline">Upload a different document</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <span className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark-green">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Health Document
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max: 5MB)
              </p>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="v1-check" 
                checked={v1Checked}
                onCheckedChange={onV1Change}
              />
              <Label htmlFor="v1-check" className="font-medium">
                This puppy has received their V1
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="v2-check" 
                checked={v2Checked}
                onCheckedChange={onV2Change}
              />
              <Label htmlFor="v2-check" className="font-medium">
                This puppy has received their V2
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="h1-check" 
                checked={h1Checked}
                onCheckedChange={onH1Change}
              />
              <Label htmlFor="h1-check" className="font-medium">
                This puppy has received their H1
              </Label>
            </div>
            
            {onH2Change && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="h2-check" 
                  checked={h2Checked}
                  onCheckedChange={onH2Change}
                />
                <Label htmlFor="h2-check" className="font-medium">
                  This puppy has received their H2
                </Label>
              </div>
            )}
            
            {onMicrochipChange && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="microchip-check" 
                  checked={microchipChecked}
                  onCheckedChange={onMicrochipChange}
                />
                <Label htmlFor="microchip-check" className="font-medium">
                  This puppy is microchipped
                </Label>
              </div>
            )}
            
            {onVaccinationChange && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="vaccination-check" 
                  checked={vaccinationChecked}
                  onCheckedChange={onVaccinationChange}
                />
                <Label htmlFor="vaccination-check" className="font-medium">
                  Vaccination records provided
                </Label>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="bg-emerald-50 p-4 rounded-md">
       
        <div className="flex items-start mt-2">
          <div className="bg-white rounded-full p-2 mr-2 flex items-center justify-center">
            <img 
              src="/badges/goldernstart.jpeg"
              alt="Gold Star Badge"
              className="h-10 w-10 object-contain"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-800 mt-2">Gold Star</p>
            <p className="text-xs text-emerald-700">Shown when H1 document is uploaded</p>
          </div>
        </div>
         <div className="flex items-start mt-4">
          <div className="bg-white rounded-full p-2 mr-2 flex items-center justify-center">
            <img 
              src="/badges/greentick.jpeg"
              alt="Green Tick Badge"
              className="h-10 w-10 object-contain"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-800 mt-2 ">Green Tick</p>
            <p className="text-xs text-emerald-700">Shown when V1 document is uploaded and when V2 document is uploaded by week 12</p>
          </div>
        </div>
      </div>
    </div>
  );
};
