import { useNavigate } from 'react-router';
import TextGenerate from './animations/TextGenerate';

export default function CTA() {
    const navigate = useNavigate();
    return (
        <footer className="bg-dark text-textInverse pt-[160px] pb-[80px] relative overflow-hidden">

            {/* Massive radial glow typical of dark mode CTA sections */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -translate-y-1/2"></div>

            <div className="max-w-[1200px] w-full mx-auto px-8 pb-[100px] border-b border-borderInv flex flex-col items-center text-center relative z-10">
                <span className="font-mono text-primary text-sm tracking-widest uppercase font-bold mb-6 block">
                    <TextGenerate delay={0}>Get Started</TextGenerate>
                </span>
                <h2 className="font-display text-[clamp(48px,6vw,80px)] font-bold tracking-tight leading-[1] mb-8">
                    <TextGenerate delay={0.2}>Your AI Senior Engineer.</TextGenerate><br />
                    <TextGenerate delay={0.4}>Ready Out The Box.</TextGenerate>
                </h2>
                <p className="text-xl text-textInverse/60 max-w-[500px] mb-12">
                    <TextGenerate delay={0.6}>
                        Free tier available. No credit card required. Connect your first repository in 60 seconds.
                    </TextGenerate>
                </p>

                <TextGenerate delay={0.8}>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={() => navigate('/onboarding')} className="bg-primary text-dark px-10 py-5 rounded-button font-bold text-lg hover:bg-primary/90 transition-colors">
                            Connect Repository Free
                        </button>
                        <button className="bg-transparent text-textInverse border border-borderInv px-10 py-5 rounded-button font-bold text-lg hover:bg-white/5 transition-colors">
                            Read the Docs
                        </button>
                    </div>
                </TextGenerate>
            </div>

            <div className="max-w-[1200px] w-full mx-auto px-8 pt-[80px] grid grid-cols-1 md:grid-cols-4 gap-12 text-sm">

                <div className="md:col-span-1">
                    <div className="font-display font-bold text-2xl tracking-tight mb-4">Velocis.</div>
                    <p className="text-textInverse/40 max-w-[250px]">
                        The autonomous AI digital team member embedded inside your code repository.
                    </p>
                </div>

                <div className="flex flex-col gap-4">
                    <h4 className="font-bold text-textInverse">Product</h4>
                    <a href="#" className="text-textInverse/60 hover:text-primary transition-colors">Sentinel Agent</a>
                    <a href="#" className="text-textInverse/60 hover:text-primary transition-colors">Fortress Agent</a>
                    <a href="#" className="text-textInverse/60 hover:text-primary transition-colors">Visual Cortex</a>
                    <a href="#" className="text-textInverse/60 hover:text-primary transition-colors">Pricing</a>
                    <a href="#" className="text-textInverse/60 hover:text-primary transition-colors">Changelog</a>
                </div>

                <div className="flex flex-col gap-4">
                    <h4 className="font-bold text-textInverse">Resources</h4>
                    <a href="#" className="text-textInverse/60 hover:text-primary transition-colors">Documentation</a>
                    <a href="#" className="text-textInverse/60 hover:text-primary transition-colors">API Reference</a>
                    <a href="#" className="text-textInverse/60 hover:text-primary transition-colors">Blog</a>
                    <a href="#" className="text-textInverse/60 hover:text-primary transition-colors">System Status</a>
                </div>

                <div className="flex flex-col gap-4">
                    <h4 className="font-bold text-textInverse">Company</h4>
                    <a href="#" className="text-textInverse/60 hover:text-primary transition-colors">About Us</a>
                    <a href="#" className="text-textInverse/60 hover:text-primary transition-colors">Careers</a>
                    <a href="#" className="text-textInverse/60 hover:text-primary transition-colors">Contact</a>
                    <a href="#" className="text-textInverse/60 hover:text-primary transition-colors">Security</a>
                </div>

            </div>

            <div className="max-w-[1200px] w-full mx-auto px-8 pt-[80px] mt-[80px] border-t border-borderInv flex flex-col sm:flex-row justify-between items-center text-sm text-textInverse/40">
                <p>© 2026 Velocis. All rights reserved.</p>
                <div className="flex gap-6 mt-4 sm:mt-0">
                    <a href="#" className="hover:text-textInverse transition-colors">Privacy</a>
                    <a href="#" className="hover:text-textInverse transition-colors">Terms</a>
                    <a href="#" className="hover:text-textInverse transition-colors">Security</a>
                </div>
            </div>

        </footer>
    );
}
