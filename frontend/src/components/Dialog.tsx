import React, { useEffect } from 'react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'fullscreen';
  showCloseButton?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  children,
  size = 'md',
  showCloseButton = false
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getSizeClass = (size?: string): string => {
    switch (size) {
      case 'sm': return 'max-w-sm';
      case 'md': return 'max-w-md';
      case 'lg': return 'max-w-lg';
      case 'xl': return 'max-w-xl';
      case '2xl': return 'max-w-2xl';
      case '3xl': return 'max-w-3xl';
      case 'fullscreen': return 'max-w-full w-full h-full';
      default: return 'max-w-md';
    }
  };

  const isFullscreen = size === 'fullscreen';
  const sizeClass = getSizeClass(size);

  return (
    <div className={`fixed inset-0 z-[100] ${isFullscreen ? '' : 'flex items-center justify-center p-4'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className={`relative ${isFullscreen ? 'w-full h-full flex items-center justify-center p-4' : `${sizeClass} w-full`} ${isFullscreen ? '' : 'max-h-[90vh] overflow-y-auto'} bg-transparent`}>
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1.5 transition-colors z-10 bg-white/90 hover:bg-gray-50 backdrop-blur-sm shadow-sm"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {isFullscreen ? (
          children
        ) : (
          <div className="relative">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

