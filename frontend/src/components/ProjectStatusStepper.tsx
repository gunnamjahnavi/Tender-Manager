import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface ProjectStatusStepperProps {
  completedStages?: string[];
  stages: string[];
  stageDeadlines?: Record<string, string | null>;
  onStageToggle?: (stage: string) => void;
  isReadOnly?: boolean;
}

export function ProjectStatusStepper({ completedStages = [], stages, stageDeadlines = {}, onStageToggle, isReadOnly }: ProjectStatusStepperProps) {
  const isCompleted = (stage: string) => completedStages.includes(stage);
  const formatDeadline = (deadline?: string | null) => {
    if (!deadline) return '';
    const date = new Date(`${deadline}T00:00:00`);
    return Number.isNaN(date.getTime()) ? deadline : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  
  return (
    <div className="w-full py-10">
      <div className="relative flex items-center justify-between w-full px-2">
        {/* Progress Line Background */}
        <div className="absolute left-[20px] right-[20px] top-[22px] h-1 bg-gray-200 -z-10 rounded-full"></div>
        
        {/* Progress Line Active - shows progress based on completion percentage */}
        <div 
          className="absolute left-[20px] top-[22px] h-1 bg-green-500 transition-all duration-700 -z-10 rounded-full" 
          style={{ 
            width: completedStages.length > 0 
              ? `calc(${(completedStages.length / stages.length) * 100}% - 40px)` 
              : '0%',
            maxWidth: 'calc(100% - 40px)'
          }}
        ></div>

        {stages.map((stage, index) => {
          const stageCompleted = isCompleted(stage);
          
          return (
            <div key={stage} className="flex flex-col items-center relative flex-1">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={(e) => {
                  e.stopPropagation();
                  onStageToggle?.(stage);
                }}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all border-2 z-10 
                  ${stageCompleted 
                    ? 'bg-green-600 border-green-600 text-white shadow-md' 
                    : 'bg-white border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-600'} 
                  ${!isReadOnly ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                  ${stageCompleted && 'ring-4 ring-green-100 ring-offset-1'}`}
              >
                {stageCompleted ? (
                   <CheckCircle2 className="w-6 h-6" />
                ) : (
                   <span className="text-xs font-bold">{index + 1}</span>
                )}
              </button>
              
              {/* Label - Stacked for vertical space efficiency */}
              <div className="absolute top-[48px] w-full px-0.5">
                <div className={`text-[8px] font-black uppercase text-center leading-[1] transition-colors duration-300 break-words
                  ${stageCompleted ? 'text-green-800' : 'text-gray-400'}`}>
                  {stage}
                </div>
                {stageDeadlines[stage] && (
                  <div className="text-[8px] font-bold text-gray-400 text-center mt-1 leading-none">
                    {formatDeadline(stageDeadlines[stage])}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
