'use client';

import { motion } from 'framer-motion';

export function ScrollReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}