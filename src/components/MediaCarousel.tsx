import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
  thumbnail?: string;
}

interface MediaCarouselProps {
  media: MediaItem[];
  autoPlay?: boolean;
  showCaptions?: boolean;
  className?: string;
}

export const MediaCarousel: React.FC<MediaCarouselProps> = ({
  media,
  autoPlay = false,
  showCaptions = true,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);

  const currentMedia = media[currentIndex];
  const hasMultiple = media.length > 1;

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (!media || media.length === 0) {
    return null;
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-0">
        <div className="relative">
          {/* Main Media Display */}
          <div className="relative aspect-video bg-muted">
            {currentMedia.type === 'image' ? (
              <img
                src={currentMedia.url}
                alt={currentMedia.caption || 'Post image'}
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={currentMedia.url}
                poster={currentMedia.thumbnail}
                controls={false}
                autoPlay={isPlaying}
                muted={isMuted}
                loop
                className="w-full h-full object-cover"
                onClick={() => setIsPlaying(!isPlaying)}
              />
            )}

            {/* Media Controls for Videos */}
            {currentMedia.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 bg-black/50 rounded-lg p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation Arrows */}
            {hasMultiple && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPrevious}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Media Type Badge */}
            <Badge 
              variant="secondary" 
              className="absolute top-2 left-2 bg-black/50 text-white border-0"
            >
              {currentMedia.type === 'video' ? '📹' : '📷'} 
              {currentIndex + 1} of {media.length}
            </Badge>
          </div>

          {/* Caption */}
          {showCaptions && currentMedia.caption && (
            <div className="p-3 bg-muted/50">
              <p className="text-sm text-muted-foreground">{currentMedia.caption}</p>
            </div>
          )}

          {/* Thumbnail Navigation */}
          {hasMultiple && (
            <div className="p-3 border-t">
              <div className="flex gap-2 overflow-x-auto">
                {media.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => goToSlide(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentIndex 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt={`Slide ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="relative w-full h-full bg-muted">
                        <img
                          src={item.thumbnail || item.url}
                          alt={`Video ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Progress Dots */}
          {hasMultiple && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {media.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex 
                      ? 'bg-white' 
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};