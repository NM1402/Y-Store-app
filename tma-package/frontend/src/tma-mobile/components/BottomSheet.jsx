/**
 * Bottom Sheet - Native iOS-style modal with Framer Motion
 * Slides up from bottom with spring animation
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import telegram from '../lib/telegram-sdk';
import './BottomSheet.css';

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const sheetVariants = {
  hidden: { y: '100%' },
  visible: { y: 0 },
};

const sheetTransition = {
  type: 'spring',
  damping: 30,
  stiffness: 300,
};

export default function BottomSheet({ children, onClose, isOpen }) {
  useEffect(() => {
    if (isOpen) {
      telegram.haptic('light');
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleBackdropClick = () => {
    telegram.haptic('light');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="bottom-sheet-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
            data-testid="bottom-sheet-backdrop"
          />
          
          <motion.div
            className="bottom-sheet"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={sheetTransition}
            onClick={(e) => e.stopPropagation()}
            data-testid="bottom-sheet"
          >
            <div className="bottom-sheet__handle" />
            <div className="bottom-sheet__content">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
