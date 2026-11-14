import React, { useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { modalScaleVariants, sheetUpVariants, overlayVariants } from '../../lib/motion';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string; // e.g. 'max-w-lg', 'max-w-md', 'max-w-xl'
  className?: string;
  isSheetOnMobile?: boolean;
}

export const AnimatedModal: React.FC<AnimatedModalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-lg',
  className = '',
  isSheetOnMobile = true
}) => {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 250) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          {/* Backdrop overlay */}
          <motion.div
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Desktop Modal Content */}
          <motion.div
            variants={modalScaleVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`hidden sm:block relative z-10 w-full ${maxWidth} bg-white dark:bg-[#131F1B] border border-slate-200/90 dark:border-[#24352F] rounded-3xl shadow-2xl p-6 text-slate-900 dark:text-[#E7F0EC] max-h-[90vh] overflow-y-auto ${className}`}
          >
            {children}
          </motion.div>

          {/* Mobile Bottom Sheet (with swipe/drag to dismiss) */}
          {isSheetOnMobile ? (
            <motion.div
              variants={sheetUpVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={handleDragEnd}
              className={`sm:hidden relative z-10 w-full bg-white dark:bg-[#131F1B] border-t border-slate-200/90 dark:border-[#24352F] rounded-t-3xl shadow-2xl p-5 text-slate-900 dark:text-[#E7F0EC] max-h-[85vh] overflow-y-auto ${className}`}
            >
              {/* Drag Handle Bar */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 shrink-0" />
              {children}
            </motion.div>
          ) : (
            <motion.div
              variants={modalScaleVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`sm:hidden relative z-10 w-full ${maxWidth} bg-white dark:bg-[#131F1B] border border-slate-200/90 dark:border-[#24352F] rounded-2xl shadow-2xl p-4 text-slate-900 dark:text-[#E7F0EC] max-h-[90vh] overflow-y-auto ${className}`}
            >
              {children}
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};

