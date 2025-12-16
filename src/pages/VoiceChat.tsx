import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings } from 'lucide-react';
import { LoadingFallback } from '@/components/LoadingFallback';

export const VoiceChatPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const navigate = useNavigate();

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="fixed inset-0 w-full h-full">
      {/* Minimal header with navigation - only show on hover */}
      <div className="absolute top-2 left-2 z-50 flex space-x-2 opacity-20 hover:opacity-100 transition-opacity duration-300">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/language-selection')}
          className="bg-white/95 backdrop-blur-sm shadow-lg"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Language
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/auth')}
          className="bg-white/95 backdrop-blur-sm shadow-lg"
        >
          <Settings className="w-4 h-4 mr-1" />
          Sign In
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 z-20">
          <LoadingFallback message="Loading Voice Assistant..." />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold mb-4">Failed to load Voice Assistant</h2>
            <p className="text-muted-foreground mb-4">
              Unable to load the external voice chat application. Please try refreshing the page.
            </p>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        src="https://grow-smart-ai-voice.netlify.app/"
        className="w-full h-full border-0"
        title="Voice Chat Assistant"
        onLoad={handleLoad}
        onError={handleError}
        allow="microphone; camera; autoplay"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
      />
    </div>
  );
};