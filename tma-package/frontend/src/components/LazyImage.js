import React, { useState, useEffect, useRef } from 'react';

/**
 * LazyImage Component
 * Optimized image loading for better performance and Google Ads Quality Score
 */
const LazyImage = ({
  src,
  alt,
  className = '',
  placeholder = '/placeholder-image.png',
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    let observer;
    
    if (imgRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Load image when it enters viewport
              const img = new Image();
              img.src = src;
              img.onload = () => {
                setImageSrc(src);
                setImageLoaded(true);
              };
              img.onerror = () => {
                setImageSrc(placeholder);
                setImageLoaded(true);
              };
              
              // Stop observing after loading
              observer.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '50px', // Start loading 50px before entering viewport
          threshold: 0.01
        }
      );

      observer.observe(imgRef.current);
    }

    return () => {
      if (observer && imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, placeholder]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${!imageLoaded ? 'blur-sm' : 'blur-0'} transition-all duration-300`}
      loading="lazy"
      {...props}
    />
  );
};

export default LazyImage;
