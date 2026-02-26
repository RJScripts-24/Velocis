import TextGenerate from './animations/TextGenerate';
import CardGenerate from './animations/CardGenerate';

export default function TechStack() {
    const chips = [
        "Foundation Models", "Serverless Infrastructure", "Webhook Orchestration",
        "Vector Embeddings", "Secure API Layer", "Real-Time Pipelines",
        "Generative Reasoning", "SOC 2 Compliant", "Zero Config Deployment",
        "GitHub · GitLab · Bitbucket"
    ];

    return (
        <section className="py-[120px] bg-background">
            <div className="max-w-[1200px] w-full mx-auto px-8 flex flex-col items-center text-center">

                <span className="font-mono text-tertiary text-sm tracking-widest uppercase font-bold mb-4 block">
                    <TextGenerate>Under the Hood</TextGenerate>
                </span>

                <h2 className="font-display text-[clamp(40px,5vw,64px)] font-bold tracking-tight leading-[1] mb-8">
                    <TextGenerate delay={0.2}>Built on the Best of</TextGenerate>
                    <TextGenerate delay={0.4}>Modern AI Infrastructure.</TextGenerate>
                </h2>

                <p className="text-lg text-textMuted max-w-[600px] mb-16 leading-relaxed">
                    <TextGenerate delay={0.6}>
                        Velocis combines state-of-the-art foundation models with high-speed serverless task orchestration, ensuring deep vector-embedded understanding of your entire codebase securely.
                    </TextGenerate>
                </p>

                <div className="flex flex-wrap justify-center gap-4 max-w-[900px]">
                    {chips.map((chip, i) => (
                        <CardGenerate
                            key={i}
                            delay={0.8 + (i * 0.05)}
                            duration={0.6}
                            className="bg-surface text-textMain border border-borderSubtle px-6 py-4 rounded-pill font-mono text-sm tracking-wide font-medium transition-colors hover:bg-dark hover:text-textInverse cursor-default"
                        >
                            {chip}
                        </CardGenerate>
                    ))}
                </div>

            </div>
        </section>
    );
}
