import React from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const ScrollReveal = ({ 
  children, 
  animation = 'fadeIn', 
  delay = 0,
  threshold = 0.1 
}) => {
  const [ref, isVisible] = useScrollAnimation(threshold);

  const animationClasses = {
    fadeIn: 'opacity-0 translate-y-8',
    slideInLeft: 'opacity-0 -translate-x-12',
    slideInRight: 'opacity-0 translate-x-12',
    scaleIn: 'opacity-0 scale-90',
    fadeInUp: 'opacity-0 translate-y-12',
  };

  const visibleClasses = 'opacity-100 translate-y-0 translate-x-0 scale-100';

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? visibleClasses : animationClasses[animation]
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default ScrollReveal;
