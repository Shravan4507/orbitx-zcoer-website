import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface StartupBlurProps {
    children: ReactNode;
}

const StartupBlur = ({ children }: StartupBlurProps) => {
    return (
        <motion.div
            initial={{ filter: 'blur(20px)', opacity: 0, scale: 0.95 }}
            animate={{ filter: 'blur(0px)', opacity: 1, scale: 1 }}
            transition={{
                duration: 1.5,
                ease: [0.22, 1, 0.36, 1],
                opacity: { duration: 1.0 },
                scale: { duration: 1.5 }
            }}
            style={{ minHeight: '100vh', width: '100%' }}
        >
            {children}
        </motion.div>
    );
};

export default StartupBlur;
