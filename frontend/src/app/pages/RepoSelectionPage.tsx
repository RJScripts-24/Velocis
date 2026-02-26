import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, GitBranch } from 'lucide-react';

// Mock data for repositories
const MOCK_REPOSITORIES = [
    { id: 1, name: 'InfraZero', visibility: 'Private', updatedTime: '2 days ago', language: 'TypeScript', color: '#3178C6' },
    { id: 2, name: 'Immersa', visibility: 'Private', updatedTime: '5 hours ago', language: 'Python', color: '#3572A5' },
    { id: 3, name: 'velocis-core', visibility: 'Private', updatedTime: '1 week ago', language: 'TypeScript', color: '#3178C6' },
    { id: 4, name: 'ai-observatory', visibility: 'Public', updatedTime: '3 days ago', language: 'JavaScript', color: '#F1E05A' },
];

export const RepoSelectionPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredRepos = MOCK_REPOSITORIES.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleInstallClick = (repoId: number) => {
        // Mock installation & redirect to repository page
        navigate(`/repo/${repoId}`);
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] font-['Inter'] relative overflow-hidden flex flex-col">
            {/* Minimal Navbar specific to this flow */}
            <div className="w-full py-4 px-8 flex justify-between items-center border-b border-gray-100 bg-white sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-bold text-lg cursor-pointer transition-transform hover:scale-105" onClick={() => navigate('/')}>
                        V
                    </div>
                    <span className="font-bold text-[18px] tracking-tight text-gray-900">Velocis</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-sm font-medium">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        GitHub connected
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-medium text-gray-600 border border-gray-200">
                        JD
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center pt-20 px-6 sm:px-12 w-full max-w-5xl mx-auto">
                <div className="text-center mb-12 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold tracking-wider uppercase">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        GITHUB CONNECTED
                    </div>
                    <h1 className="text-[32px] md:text-[40px] font-extrabold text-gray-900 tracking-tight mb-4">
                        Select a repository to install Velocis
                    </h1>
                    <p className="text-[16px] text-gray-500 leading-relaxed font-medium">
                        Velocis will configure secure webhooks, initialize the autonomous agents, and begin continuous analysis of the selected repository.
                    </p>
                </div>

                {/* Repository List Container */}
                <div className="w-full max-w-3xl bg-white rounded-2xl border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                    <div className="p-5 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h2 className="text-[18px] font-semibold text-gray-900">Your repositories</h2>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black focus:border-black sm:text-sm transition-colors"
                                placeholder="Search repositories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="p-5 md:p-6 flex flex-col gap-3 max-h-[500px] overflow-y-auto">
                        {filteredRepos.length > 0 ? (
                            filteredRepos.map((repo) => (
                                <div key={repo.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all bg-white group">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                                            <GitBranch className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <h3 className="text-[15px] font-semibold text-gray-900 leading-none">{repo.name}</h3>
                                            </div>
                                            <div className="flex items-center gap-2 text-[13px] text-gray-500 font-medium">
                                                <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${repo.visibility === 'Public' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                    {repo.visibility}
                                                </span>
                                                <span>•</span>
                                                <span>Updated {repo.updatedTime}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: repo.color }}></span>
                                                    {repo.language}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleInstallClick(repo.id)}
                                        className="h-10 px-5 bg-black text-white text-[13px] font-semibold rounded-lg hover:bg-gray-800 transition-colors shrink-0 shadow-sm"
                                    >
                                        Install Velocis
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-gray-500 font-medium">
                                No repositories found matching "{searchQuery}"
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RepoSelectionPage;
