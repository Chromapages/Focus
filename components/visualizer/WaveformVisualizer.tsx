import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
    analyser: AnalyserNode | null;
    isActive: boolean;
    primaryColor?: string;
    secondaryColor?: string;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
    analyser,
    isActive,
    primaryColor = '#2C3892', // Brand Primary (Indigo)
    secondaryColor = '#23698C' // Brand Accent (Teal)
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();
    const particlesRef = useRef<any[]>([]);

    // Initialize particles once
    useEffect(() => {
        const particleCount = 200;
        particlesRef.current = new Array(particleCount).fill(0).map(() => ({
            x: Math.random() * 2 - 1, // Normalized -1 to 1
            y: Math.random() * 2 - 1,
            z: Math.random() * 2 - 1,
            phase: Math.random() * Math.PI * 2,
            speed: 0.002 + Math.random() * 0.004,
        }));
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let time = 0;
        const dataArray = new Uint8Array(256); // Frequency data buffer

        const render = () => {
            // Get Audio Data
            let audioEnergy = 0;
            if (analyser && isActive) {
                analyser.getByteFrequencyData(dataArray);
                // Calculate bass energy (low end of spectrum)
                const bassSum = dataArray.slice(0, 30).reduce((a, b) => a + b, 0);
                audioEnergy = (bassSum / 30) / 255;
            }

            // Clear with trail effect
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const baseRadius = Math.min(canvas.width, canvas.height) * 0.25;

            // Pulse radius with audio
            const currentRadius = baseRadius + (audioEnergy * baseRadius * 0.8);

            time += 0.01 + (audioEnergy * 0.05);

            // Draw Particles
            particlesRef.current.forEach((p, i) => {
                // Rotate particles
                const rawX = p.x;
                const rawY = p.y;
                // Simple 3D rotation logic
                const rotX = rawX * Math.cos(time + p.phase) - p.z * Math.sin(time + p.phase);

                // Map to screen
                const screenX = centerX + rotX * currentRadius;
                const screenY = centerY + rawY * currentRadius;

                // Size varies with energy and "depth" (fake z)
                const size = (isActive ? 2 : 1) + (audioEnergy * 4);

                ctx.beginPath();
                ctx.arc(screenX, screenY, size, 0, Math.PI * 2);

                // Dynamic gradient coloring
                if (isActive) {
                    // Use the passed color (Indigo/Teal)
                    ctx.fillStyle = primaryColor;
                    // Optional: Alternate particles
                    if (i % 2 === 0) ctx.fillStyle = secondaryColor;
                } else {
                    ctx.fillStyle = `rgba(100, 100, 100, 0.4)`;
                }
                ctx.fill();
            });

            // Draw "Core" Glow
            if (isActive) {
                const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.2, centerX, centerY, currentRadius * 1.5);
                gradient.addColorStop(0, primaryColor + '40'); // Hex + alpha
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            animationFrameRef.current = requestAnimationFrame(render);
        };

        render();
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [analyser, isActive, primaryColor, secondaryColor]);

    // Resize Logic remains same...

    // Resize handler
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = canvasRef.current.offsetWidth * window.devicePixelRatio;
                canvasRef.current.height = canvasRef.current.offsetHeight * window.devicePixelRatio;
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return <canvas ref={canvasRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />;
};

export default WaveformVisualizer;
