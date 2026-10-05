import React, { useState, useEffect } from 'react';
import { X, Award, Shield, Users, CheckCircle2, XCircle, Briefcase, Calendar, FileText, Info } from 'lucide-react';

interface DetailedExperienceModalProps {
  userId: number;
  employeeName: string;
  mode: 'category' | 'leadership';
  category?: string;
  onClose: () => void;
}

export function DetailedExperienceModal({ userId, employeeName, mode, category, onClose }: DetailedExperienceModalProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    const url = mode === 'category'
      ? `/api/users/${userId}/experiences?category=${encodeURIComponent(category || '')}`
      : `/api/users/${userId}/leadership`;

    fetch(url, { headers })
      .then(async res => {
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to fetch details');
        return result;
      })
      .then(result => {
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [userId, mode, category]);

  return (
    <div 
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70] p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-gradient-to-r from-gray-50 to-white">
          <div>
            <div className="text-[10px] font-black text-blue-600 mb-1 tracking-widest uppercase">
              {mode === 'category' ? 'Detailed Experience Profile' : 'Leadership History Log'}
            </div>
            <h3 className="font-extrabold text-gray-900 text-xl flex items-center gap-2">
              {mode === 'category' ? (
                <>
                  <Award className="w-5 h-5 text-orange-500" />
                  {category} Experience
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 text-blue-600" />
                  Leadership Portfolio
                </>
              )}
              <span className="text-gray-300 font-normal">|</span>
              <span className="text-gray-500 font-medium text-base">{employeeName}</span>
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full bg-gray-100 text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-gray-500 animate-pulse">Retrieving project record files...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
              <Info className="w-5 h-5 shrink-0" />
              <div><strong>Error:</strong> {error}</div>
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200 p-8">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="font-bold text-gray-700">No Projects Found</h4>
              <p className="text-xs text-gray-400 mt-1">There are no projects recorded under this criteria.</p>
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <div className="space-y-6">
              {data.map((item: any) => {
                const details = item.projectDetails || {};
                const isOutcomeSuccess = details.outcome === 'Success';
                
                return (
                  <div 
                    key={item.id} 
                    className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:border-blue-100 hover:shadow-md transition-all duration-300"
                  >
                    {/* Project Title Block */}
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3 bg-gradient-to-r from-white to-gray-50/20">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-gray-900 text-base">{details.name || "Prior Project"}</h4>
                          {item.role && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                              item.role === 'Senior Lead' 
                                ? 'bg-purple-50 text-purple-700 border-purple-100'
                                : item.role === 'Team Lead' || item.leadership_role === 'Team Lead'
                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                              {item.role || item.leadership_role}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{details.category || item.project_category}</p>
                      </div>

                      {mode === 'leadership' && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          isOutcomeSuccess 
                            ? 'bg-green-50 text-green-700 border-green-100' 
                            : 'bg-red-50 text-red-700 border-red-100'
                        }`}>
                          {isOutcomeSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          Tender: {isOutcomeSuccess ? 'Successful' : `Failed (Pos ${details.outcomeDetails?.ranking || '—'})`}
                        </span>
                      )}
                    </div>

                    {/* Metadata Grid */}
                    <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-b border-gray-50 bg-gray-50/30">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Duration</span>
                        <span className="font-bold text-gray-800 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {item.duration}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Timeline</span>
                        <span className="font-medium text-gray-600 mt-0.5 block">
                          {details.startDate || '—'} to {details.endDate || 'Active'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Project Status</span>
                        <span className={`inline-block font-bold mt-1 text-[10px] uppercase px-2 py-0.5 rounded-full ${
                          details.status === 'Completed' 
                            ? 'bg-green-50 text-green-700 border border-green-100' 
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {details.status || item.status}
                        </span>
                      </div>
                      {mode === 'leadership' ? (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Team Size</span>
                          <span className="font-bold text-gray-800 flex items-center gap-1 mt-0.5">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            {details.teamSize || '—'} Members
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Team Lead</span>
                          <span className="font-bold text-gray-800 truncate block mt-0.5" title={details.teamLeadName}>
                            {details.teamLeadName || '—'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Project Summaries & Teams */}
                    <div className="p-5 space-y-4">
                      {/* Description */}
                      {details.description && details.description !== '—' && (
                        <div>
                          <h5 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5 mb-1.5">
                            <FileText className="w-3.5 h-3.5" /> Project Summary
                          </h5>
                          <p className="text-gray-600 text-xs leading-relaxed bg-gray-50/50 p-3 rounded-lg border border-gray-100">{details.description}</p>
                        </div>
                      )}

                      {/* Objectives and Work Performed (Only for Category Experience mode) */}
                      {mode === 'category' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {details.objectives && details.objectives !== '—' && (
                            <div>
                              <h5 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">Project Objectives</h5>
                              <p className="text-gray-600 text-xs leading-relaxed bg-gray-50/50 p-3 rounded-lg border border-gray-100">{details.objectives}</p>
                            </div>
                          )}
                          {details.workPerformed && details.workPerformed !== '—' && (
                            <div>
                              <h5 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">Work Performed</h5>
                              <p className="text-gray-600 text-xs leading-relaxed bg-gray-50/50 p-3 rounded-lg border border-gray-100">{details.workPerformed}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Stakeholders and Members list */}
                      <div className="text-xs pt-2 border-t border-gray-50 flex flex-wrap gap-x-8 gap-y-2">
                        {details.seniorLeadName && details.seniorLeadName !== '—' && (
                          <div>
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block">Senior Lead</span>
                            <span className="font-medium text-gray-700">{details.seniorLeadName}</span>
                          </div>
                        )}
                        {mode === 'leadership' && details.teamMembers && details.teamMembers.length > 0 && (
                          <div className="flex-1">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block">Team Members Led</span>
                            <span className="font-medium text-gray-700">{details.teamMembers.join(', ')}</span>
                          </div>
                        )}
                        {mode === 'category' && details.teamMembers && details.teamMembers.length > 0 && (
                          <div className="flex-1">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block">Team Members</span>
                            <span className="font-medium text-gray-700">{details.teamMembers.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex justify-end">
          <button 
            onClick={onClose} 
            className="px-5 py-2 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase hover:bg-black transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
