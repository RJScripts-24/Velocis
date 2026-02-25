import { Shield, Zap, Map } from 'lucide-react';
import TextGenerate from './animations/TextGenerate';
import CardGenerate from './animations/CardGenerate';

const agents = [
    {
        name: "Sentinel",
        role: "Deep Code Intelligence",
        color: "#8D5CF6", // Vibrant Purple
        icon: Shield,
        desc: "Semantic code review, logic flaws, security checks, and personalized mentorship feedback directly in PR comments.",
        features: ["Logic Vulnerability Scanning", "Static Code Profiling", "Contextual Refactoring"]
    },
    {
        name: "Fortress",
        role: "Autonomous Test Engine",
        color: "#38BDF8", // Sky Blue
        icon: Zap,
        desc: "Auto-generates, executes, and self-heals tests in an infinite loop until pipeline passes.",
        features: ["Self-Healing Test Suites", "Integration Mocks", "Edge-Case Discovery"]
    },
    {
        name: "Visual Cortex",
        role: "Living Architecture Map",
        color: "#3BBB96", // Mint Green
        icon: Map,
        desc: "Generates live codebase architecture maps, tracks dependencies, and forces documentation to stay in sync.",
        features: ["Live Dependency Graphs", "Auto-Generated Docs", "Onboarding Visuals"]
    }
];

export default function BentoGrid() {
    return (
        <section className="py-[120px] bg-background">
            <div className="max-w-[1200px] w-full mx-auto px-8">

                <div className="text-center mb-16">
                    <h2 className="font-display text-[clamp(28px,4vw,48px)] font-bold tracking-tight leading-[1.05]">
                        <TextGenerate>Three Agents.</TextGenerate>
                        <TextGenerate delay={0.2}>One Unified Team.</TextGenerate>
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {agents.map((agent, i) => (
                        <CardGenerate
                            key={i}
                            delay={-0.15 + (i * 0.15)}
                            duration={1}
                            className="bg-surface rounded-card p-10 flex flex-col items-start transition-all duration-300 hover:-translate-y-2 hover:shadow-xl relative overflow-hidden group"
                        >
                            {/* Faded border around the entire card */}
                            <div
                                className="absolute inset- border-[1px] pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-300 rounded-card"
                                style={{ borderColor: agent.color }}
                            />

                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center mb-6 text-white"
                                style={{ backgroundColor: agent.color }}
                            >
                                <agent.icon size={28} />
                            </div>

                            <div
                                className="font-mono text-sm tracking-widest font-bold mb-2 uppercase"
                                style={{ color: agent.color }}
                            >
                                {agent.role}
                            </div>

                            <h3 className="font-display text-3xl font-bold mb-4">
                                <TextGenerate delay={0.8 + (i * 0.15)}>{agent.name}</TextGenerate>
                            </h3>
                            <p className="text-textMuted text-lg mb-8 leading-relaxed flex-grow">
                                <TextGenerate delay={1.0 + (i * 0.15)}>{agent.desc}</TextGenerate>
                            </p>

                            <ul className="flex flex-col gap-3 w-full">
                                {agent.features.map((feat, j) => (
                                    <li key={j} className="flex items-center gap-3 text-sm font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: agent.color }}></div>
                                        <TextGenerate delay={1.1 + (i * 0.15) + (j * 0.1)}>{feat}</TextGenerate>
                                    </li>
                                ))}
                            </ul>
                        </CardGenerate>
                    ))}
                </div>
            </div>
        </section>
    );
}
