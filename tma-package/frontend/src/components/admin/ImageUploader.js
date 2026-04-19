import React, { useState } from 'react';
import { Upload, X, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

/**
 * Image Uploader Component
 * 
 * Supports two upload methods:
 * 1. File upload from computer (converts to Base64)
 * 2. URL input
 * 
 * @param {Array} images - Current images array
 * @param {Function} onChange - Callback with updated images array
 */
const ImageUploader = ({ images = [''], onChange }) => {
  const [uploadMethod, setUploadMethod] = useState('url'); // 'url' or 'file'

  const handleFileUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Convert to Base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      const newImages = [...images];
      newImages[index] = base64String;
      onChange(newImages);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (index, value) => {
    const newImages = [...images];
    newImages[index] = value;
    onChange(newImages);
  };

  const addImageField = () => {
    onChange([...images, '']);
  };

  const removeImageField = (index) => {
    if (images.length <= 1) return;
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Upload Method Toggle */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setUploadMethod('url')}
          className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
            uploadMethod === 'url'
              ? 'bg-white shadow-sm text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          URL
        </button>
        <button
          type="button"
          onClick={() => setUploadMethod('file')}
          className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
            uploadMethod === 'file'
              ? 'bg-white shadow-sm text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload File
        </button>
      </div>

      {/* Images List */}
      <div className="space-y-3">
        {images.map((image, index) => (
          <div key={index} className="flex gap-2 items-start">
            {/* Image Preview */}
            {image && (
              <div className="flex-shrink-0 w-20 h-20 border rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={image}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/100?text=Error';
                  }}
                />
              </div>
            )}

            {/* Input */}
            <div className="flex-1">
              {uploadMethod === 'url' ? (
                <Input
                  type="text"
                  value={image}
                  onChange={(e) => handleUrlChange(index, e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full"
                />
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, index)}
                    className="hidden"
                    id={`file-input-${index}`}
                  />
                  <label
                    htmlFor={`file-input-${index}`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" />
                    {image ? 'Change Image' : 'Choose Image'}
                  </label>
                  {image && (
                    <p className="text-xs text-gray-500 mt-1">
                      Image uploaded ({(image.length / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Remove Button */}
            {images.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeImageField(index)}
                className="flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Add More Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addImageField}
        className="w-full"
      >
        <Upload className="w-4 h-4 mr-2" />
        Add Another Image
      </Button>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          <strong>Tips:</strong>
        </p>
        <ul className="text-sm text-blue-800 mt-2 space-y-1">
          <li>• <strong>URL:</strong> Paste image URL from the internet</li>
          <li>• <strong>Upload File:</strong> Select image from your computer (max 5MB)</li>
          <li>• First image will be the main product image</li>
          <li>• You can add multiple images for gallery</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageUploader;
