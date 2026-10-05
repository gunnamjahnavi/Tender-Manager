import { X, Check } from 'lucide-react';
import { ProjectStatusStepper } from './ProjectStatusStepper';
import { getDisplayStatus, getProjectStageDeadlines, getProjectStages, getStatusPillClass } from '../constants/project';

interface ProjectDetailModalProps {
  project: any;
  onClose: () => void;
}

export function ProjectDetailModal({ project, onClose }: ProjectDetailModalProps) {
  if (!project) return null;

  const displayStatus = getDisplayStatus(project);
  const projectCode =
    project.projectCode ||
    `LT-${new Date(project.createdAt || Date.now()).getFullYear()}-${String(project.id).padStart(3, '0')}`;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-lg max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start">
          <div>
            <div className="text-[10px] font-black text-blue-600 mb-1">{projectCode}</div>
            <h3 className="font-semibold text-gray-900 text-lg">{project.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{project.clientName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-sm overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Category</p>
              <span
                className="inline-block px-2 py-0.5 rounded-full text-white text-[10px]"
                style={{ backgroundColor: project.categoryColor || '#94a3b8' }}
              >
                {project.category || 'General'}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Current Status</p>
              <span className={`status-pill ${getStatusPillClass(displayStatus)}`}>
                {displayStatus}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">State</p>
              <p className="font-semibold text-gray-800">{project.projectState || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Country</p>
              <p className="font-semibold text-gray-800">{project.country || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Estimated Value</p>
              <p className="font-semibold text-gray-800">
                {project.currency === 'Dollars' ? '$' : '₹'} {project.estimatedValue}{' '}
                {project.currency === 'Dollars' ? 'Million' : 'Crore'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">HOD</p>
              <p className="font-semibold text-gray-800">{project.hod?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Senior Lead</p>
              <p className="font-semibold text-gray-800">{project.seniorLead?.name || '—'}</p>
            </div>
          </div>

          {project.description && (
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">Project Description</p>
              <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
                {project.description}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">Assigned Team</p>
            {project.teamDetails ? (
              <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm space-y-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Team Lead: </span>
                  <span className="font-semibold text-gray-800">
                    {project.teamDetails.leader?.name || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Members: </span>
                  <span className="font-semibold text-gray-800">
                    {project.teamDetails.members?.map((m: any) => m.name).join(', ') || '—'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Team not yet formed</p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">Status Pipeline & Progress</p>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <ProjectStatusStepper
                completedStages={project.completedStages || []}
                stages={getProjectStages(project)}
                stageDeadlines={getProjectStageDeadlines(project)}
                isReadOnly={true}
              />
            </div>
          </div>

          {project.status === 'Completed' && project.tenderOutcome && (
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">Tender Outcome</p>
              <div
                className={`p-3 rounded border ${
                  project.tenderOutcome.result === 'Success'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {project.tenderOutcome.result === 'Success' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-red-600" />
                  )}
                  <span
                    className={`font-bold text-sm ${
                      project.tenderOutcome.result === 'Success' ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {project.tenderOutcome.result === 'Success'
                      ? 'Successful'
                      : `Failed at Position ${project.tenderOutcome.ranking}`}
                  </span>
                </div>
                {project.tenderOutcome.remarks && (
                  <p className="text-xs text-gray-700 mt-2">Remarks: {project.tenderOutcome.remarks}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
