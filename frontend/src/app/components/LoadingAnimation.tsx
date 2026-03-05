import React from 'react';

interface LoadingAnimationProps {
  text?: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ text = "Loading..." }) => {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#f6f7fb] dark:bg-[#0A0A0E] gap-4">
      <style>{`
        .loader {
          width: 120px;
          height: 20px;
          -webkit-mask: linear-gradient(90deg, #000 70%, #0000 0) 0/20%;
          mask: linear-gradient(90deg, #000 70%, #0000 0) 0/20%;
          background:
            linear-gradient(#000 0 0) 0/0% no-repeat
            #ddd;
          animation: l4 2s infinite steps(6);
        }

        @keyframes l4 {
          100% {
            background-size: 120%;
          }
        }

        .dark .loader {
          background:
            linear-gradient(#fff 0 0) 0/0% no-repeat
            #444;
        }
      `}</style>
      
      <div className="loader"></div>
      <span className="text-sm text-zinc-400 dark:text-zinc-500 font-medium">{text}</span>
    </div>
  );
};

export default LoadingAnimation;
