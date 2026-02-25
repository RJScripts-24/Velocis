import TextGenerate from './animations/TextGenerate';
import CardGenerate from './animations/CardGenerate';

export default function HowItWorks() {
    const steps = [
        { num: '01', title: 'Connect Repository', desc: 'Securely link GitHub, GitLab, or Bitbucket in under 60 seconds via OAuth.' },
        { num: '02', title: 'Webhook Listening', desc: 'Velocis quietly observes all commits, branches, and PRs in real time.' },
        { num: '03', title: 'Agents Activate', desc: 'Sentinel, Fortress, and Visual Cortex run concurrently on every push.' },
        { num: '04', title: 'Issues Resolved', desc: 'Bugs are auto-fixed when possible, or flagged with deep context when not.' },
        { num: '05', title: 'Artifacts Update', desc: 'Tests, docs, and architecture maps stay perpetually current.' }
    ];

    return (
        <section className="py-[160px] bg-white/90 backdrop-blur-md relative z-10 w-full overflow-hidden">
            <div className="max-w-[800px] w-full mx-auto px-8 text-center flex flex-col items-center">

                <span className="font-mono text-primary text-sm tracking-widest uppercase font-bold mb-4 block">
                    <TextGenerate>How It Works</TextGenerate>
                </span>

                <h2 className="font-display text-[clamp(40px,5vw,64px)] font-bold tracking-tight leading-[1] mb-24">
                    <TextGenerate delay={0.2}>Connect Once.</TextGenerate>
                    <TextGenerate delay={0.4}>Always Running.</TextGenerate>
                </h2>

                <div className="w-full flex flex-col gap-16 relative before:content-[''] before:absolute before:inset-y-0 before:left-12 before:w-[2px] before:bg-borderSubtle md:before:left-1/2 md:before:-translate-x-1/2">
                    {steps.map((step, i) => (
                        <CardGenerate key={i} delay={0.1} duration={0.8}>
                            <div className={`flex flex-col md:flex-row items-center w-full relative ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>

                                {/* Number Node */}
                                <div className="absolute left-12 md:left-1/2 transform -translate-x-1/2 bg-white/50 backdrop-blur-sm z-10 py-4 text-center">
                                    <div className="w-16 h-16 rounded-full bg-surface border-2 border-primary flex items-center justify-center font-display font-bold text-2xl text-dark shadow-xl">
                                        {step.num}
                                    </div>
                                </div>

                                {/* Text Content */}
                                <div className={`w-full md:w-1/2 pl-24 md:pl-0 flex flex-col justify-center ${i % 2 === 0 ? 'md:items-start md:text-left md:pl-20' : 'md:items-end md:text-right md:pr-20'}`}>
                                    <h3 className="font-display font-bold text-2xl mb-3">
                                        <TextGenerate delay={0.5}>{step.title}</TextGenerate>
                                    </h3>
                                    <p className="text-textMuted text-lg leading-relaxed max-w-[320px]">
                                        <TextGenerate delay={0.7}>{step.desc}</TextGenerate>
                                    </p>
                                </div>

                                {/* Empty Spacer */}
                                <div className="hidden md:block w-1/2"></div>
                            </div>
                        </CardGenerate>
                    ))}
                </div>

            </div>
        </section>
    );
}
