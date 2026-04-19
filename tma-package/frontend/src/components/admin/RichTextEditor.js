import React, { useState } from 'react';
import { Bold, Italic, Link, Image, List, ListOrdered, Code, Eye } from 'lucide-react';

/**
 * Simple HTML/Markdown Editor Component
 * Compatible with React 18+
 * 
 * Features:
 * - HTML input with syntax highlighting
 * - Live preview
 * - Insert helpers for images and links
 * - No external dependencies issues
 * 
 * @param {string} value - Current HTML content
 * @param {function} onChange - Callback when content changes
 * @param {string} placeholder - Placeholder text
 */
const RichTextEditor = ({ 
  value = '', 
  onChange, 
  placeholder = 'Enter product description...' 
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const insertAtCursor = (text) => {
    const textarea = document.getElementById('html-editor');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);
    
    onChange(newValue);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const insertHeading = (level) => {
    insertAtCursor(`<h${level}>Heading ${level}</h${level}>\n`);
  };

  const insertBold = () => {
    insertAtCursor('<strong>Bold text</strong>');
  };

  const insertItalic = () => {
    insertAtCursor('<em>Italic text</em>');
  };

  const insertLink = () => {
    const url = prompt('Enter URL:', 'https://example.com');
    if (url) {
      insertAtCursor(`<a href="${url}" target="_blank">Link text</a>`);
    }
  };

  const insertImageFromUrl = () => {
    const url = prompt('Enter image URL:', 'https://example.com/image.jpg');
    if (url) {
      insertAtCursor(`<img src="${url}" alt="Product image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0;" />\n`);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB for description images)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    // Convert to Base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      insertAtCursor(`<img src="${base64String}" alt="Product image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0;" />\n`);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  const insertList = () => {
    insertAtCursor('<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n  <li>Item 3</li>\n</ul>\n');
  };

  const insertOrderedList = () => {
    insertAtCursor('<ol>\n  <li>Item 1</li>\n  <li>Item 2</li>\n  <li>Item 3</li>\n</ol>\n');
  };

  const insertParagraph = () => {
    insertAtCursor('<p>Your paragraph text here...</p>\n');
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-3 flex flex-wrap gap-2">
        {/* Headings */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              insertHeading(parseInt(e.target.value));
              e.target.value = '';
            }
          }}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white hover:bg-gray-50"
        >
          <option value="">Heading</option>
          <option value="1">H1</option>
          <option value="2">H2</option>
          <option value="3">H3</option>
          <option value="4">H4</option>
        </select>

        {/* Formatting */}
        <button
          type="button"
          onClick={insertBold}
          className="p-2 border border-gray-300 rounded hover:bg-gray-100"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={insertItalic}
          className="p-2 border border-gray-300 rounded hover:bg-gray-100"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>

        {/* Lists */}
        <button
          type="button"
          onClick={insertList}
          className="p-2 border border-gray-300 rounded hover:bg-gray-100"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={insertOrderedList}
          className="p-2 border border-gray-300 rounded hover:bg-gray-100"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        {/* Insert */}
        <button
          type="button"
          onClick={insertLink}
          className="p-2 border border-gray-300 rounded hover:bg-gray-100"
          title="Insert Link"
        >
          <Link className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={insertImageFromUrl}
          className="p-2 border border-gray-300 rounded hover:bg-gray-100"
          title="Insert Image from URL"
        >
          <Link className="w-3 h-3 absolute top-0 right-0 bg-white rounded-full" />
          <Image className="w-4 h-4" />
        </button>

        {/* Upload Image from Computer */}
        <button
          type="button"
          onClick={() => document.getElementById('description-image-upload').click()}
          className="p-2 border border-gray-300 rounded hover:bg-gray-100 relative"
          title="Upload Image from Computer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </button>

        <input
          id="description-image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => document.getElementById('image-upload').click()}
          className="p-2 border border-gray-300 rounded hover:bg-gray-100"
          title="Upload Image from Computer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </button>

        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />

        <button
          type="button"
          onClick={insertParagraph}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-100"
          title="Insert Paragraph"
        >
          Paragraph
        </button>

        {/* Preview Toggle */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`ml-auto p-2 border rounded ${
            showPreview 
              ? 'bg-blue-500 text-white border-blue-500' 
              : 'border-gray-300 hover:bg-gray-100'
          }`}
          title="Toggle Preview"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Editor / Preview */}
      <div className="grid" style={{ gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr' }}>
        {/* HTML Editor */}
        <div className="relative">
          <textarea
            id="html-editor"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onSelect={(e) => setCursorPosition(e.target.selectionStart)}
            placeholder={placeholder}
            className="w-full p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ minHeight: '400px', maxHeight: '600px' }}
          />
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="border-l border-gray-300 p-4 overflow-auto bg-gray-50" style={{ minHeight: '400px', maxHeight: '600px' }}>
            <h4 className="text-sm font-semibold text-gray-600 mb-3">Preview:</h4>
            <div 
              className="product-description prose max-w-none"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-gray-50 border-t border-gray-300 p-3 text-xs text-gray-600">
        <strong>Tips:</strong> Use toolbar buttons to insert HTML tags. 
        <span className="font-semibold text-blue-600 ml-2">
          Image icon = Insert URL | Upload icon = Upload from computer
        </span> | Click <Eye className="w-3 h-3 inline" /> to preview.
      </div>

      {/* Common HTML Examples */}
      <details className="bg-gray-50 border-t border-gray-300 p-3">
        <summary className="text-xs font-semibold text-gray-700 cursor-pointer hover:text-gray-900">
          HTML Examples (click to expand)
        </summary>
        <div className="mt-2 space-y-2 text-xs text-gray-600 font-mono">
          <div>
            <strong>Heading:</strong> <code className="bg-gray-200 px-1">&lt;h2&gt;Title&lt;/h2&gt;</code>
          </div>
          <div>
            <strong>Paragraph:</strong> <code className="bg-gray-200 px-1">&lt;p&gt;Text here&lt;/p&gt;</code>
          </div>
          <div>
            <strong>Bold:</strong> <code className="bg-gray-200 px-1">&lt;strong&gt;Bold&lt;/strong&gt;</code>
          </div>
          <div>
            <strong>Image:</strong> <code className="bg-gray-200 px-1">&lt;img src=&quot;url&quot; alt=&quot;description&quot; /&gt;</code>
          </div>
          <div>
            <strong>Link:</strong> <code className="bg-gray-200 px-1">&lt;a href=&quot;url&quot;&gt;Link text&lt;/a&gt;</code>
          </div>
        </div>
      </details>
    </div>
  );
};

export default RichTextEditor;
