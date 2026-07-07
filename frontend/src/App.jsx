import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, User, Code, Zap, PlusCircle, ShieldCheck, Key, LogOut, UserPlus, Globe, ExternalLink, Users } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('login'); 
  const [currentUser, setCurrentUser] = useState(null);
  
  const [authEmail, setAuthEmail] = useState('');
  const [pending2FA, setPending2FA] = useState(false);
  const [pendingUserId, setPendingUserId] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const [recommendations, setRecommendations] = useState([]);
  const [myPostedJobs, setMyPostedJobs] = useState([]);
  const [activeJobCandidates, setActiveJobCandidates] = useState([]);
  const [inspectingJobId, setInspectingJobId] = useState(null);

  const [aggregatorKeyword, setAggregatorKeyword] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('All Platforms');

  const [regForm, setRegForm] = useState({ name: '', email: '', role: 'candidate', skills: '', experience: 0 });
  const [jobForm, setJobForm] = useState({ title: '', company: '', description: '', requiredSkills: '', experienceRequired: 0, location: 'Remote' });

  const handleLogout = () => {
    setCurrentUser(null);
    setPending2FA(false);
    setQrCodeUrl('');
    setTotpToken('');
    setCurrentView('login');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email: authEmail });
      if (res.data.requires2FA) {
        setPendingUserId(res.data.userId);
        setPending2FA(true);
      } else {
        const user = res.data.user;
        setCurrentUser(user);
        setCurrentView(user.role);
      }
    } catch (err) { alert(err.response?.data?.message || "Login sequence failure."); }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', regForm);
      if (res.data.success) {
        alert("Registration complete! Proceed to sign-in.");
        setCurrentView('login');
      }
    } catch (err) { alert("Registration error."); }
  };

  const verify2FAToken = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/2fa/verify', { userId: pendingUserId || currentUser._id, token: totpToken });
      if (res.data.success) {
        alert("Identity Fully Verified!");
        if (pending2FA) {
          setCurrentUser(res.data.user);
          setCurrentView(res.data.user.role);
          setPending2FA(false);
        } else {
          setCurrentUser(res.data.user);
          setQrCodeUrl('');
        }
      }
    } catch (err) { alert("Invalid token match sequential exception."); }
  };

  const setup2FA = async () => {
    const res = await axios.post('http://localhost:5000/api/auth/2fa/setup', { userId: currentUser._id });
    setQrCodeUrl(res.data.qrCodeUrl);
  };

  const loadCandidateData = async () => {
    const res = await axios.get(`http://localhost:5000/api/recommendations/candidate/${currentUser._id}`);
    setRecommendations(res.data);
  };

  const loadPosterData = async () => {
    const res = await axios.get(`http://localhost:5000/api/jobs/posted/${currentUser._id}`);
    setMyPostedJobs(res.data);
  };

  const inspectTopCandidates = async (jobId) => {
    setInspectingJobId(jobId);
    const res = await axios.get(`http://localhost:5000/api/recommendations/job/${jobId}/candidates`);
    setActiveJobCandidates(res.data);
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    await axios.post('http://localhost:5000/api/jobs', { ...jobForm, postedBy: currentUser._id });
    alert("Deployed and cross-synced to public index arrays!");
    setJobForm({ title: '', company: '', description: '', requiredSkills: '', experienceRequired: 0, location: 'Remote' });
    loadPosterData();
  };

  const handleFetchExternalAggregator = async () => {
    if (!aggregatorKeyword) return alert("Enter keyword parameter");
    const res = await axios.post('http://localhost:5000/api/jobs/fetch-external', { searchKeyword: aggregatorKeyword, targetPlatform: selectedPlatform });
    alert(res.data.message);
    if(currentView === 'candidate') loadCandidateData();
    if(currentView === 'poster') loadPosterData();
  };

  useEffect(() => {
    if (currentUser && currentView === 'candidate') loadCandidateData();
    if (currentUser && currentView === 'poster') loadPosterData();
  }, [currentUser, currentView]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <header className="max-w-6xl mx-auto flex justify-between items-center border-b border-slate-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
            <Zap className="fill-emerald-400 text-emerald-400" /> SmartMatch ML Network
          </h1>
          <p className="text-slate-400 text-xs mt-1">NLP Content Vectorization & Bidirectional Matrix Mapping Enabled</p>
        </div>
        {currentUser && (
          <button onClick={handleLogout} className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold px-4 py-2 rounded-xl text-sm transition">
            <LogOut size={16} /> Logout Node ({currentUser.name})
          </button>
        )}
      </header>

      <main className="max-w-6xl mx-auto">
        
        
        {currentView === 'login' && (
          <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
            <h2 className="text-2xl font-black text-center flex items-center justify-center gap-2"><Key className="text-cyan-400" /> System Authorization Portal</h2>
            {!pending2FA ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email Address Input" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none" />
                <button type="submit" className="w-full bg-cyan-500 text-slate-950 font-black py-3 rounded-xl transition">Authenticate Base Layer</button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-sm text-amber-400 animate-pulse">🔒 2FA Token Shield Verification Frame Triggered:</p>
                <input type="text" maxLength="6" value={totpToken} onChange={e => setTotpToken(e.target.value)} placeholder="000000" className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center tracking-widest text-lg font-mono w-full focus:outline-none" />
                <button onClick={verify2FAToken} className="w-full bg-emerald-500 text-slate-950 font-black py-3 rounded-xl transition">Submit Verification Key</button>
              </div>
            )}
            <p className="text-xs text-center text-slate-500">New deployment? <span onClick={() => setCurrentView('register')} className="text-cyan-400 underline cursor-pointer font-bold">Instantiate Node Profile</span></p>
          </div>
        )}

        
        {currentView === 'register' && (
          <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
            <h2 className="text-2xl font-black text-center flex items-center justify-center gap-2"><UserPlus className="text-violet-400" /> Create System Node</h2>
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-sm">
              <input type="text" placeholder="Full Name" required value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none" />
              <input type="email" placeholder="Email Address" required value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none" />
              <select value={regForm.role} onChange={e => setRegForm({...regForm, role: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none">
                <option value="candidate">Job Candidate (Seek Optimal Vector Match Placement)</option>
                <option value="poster">Job Poster / Recruiter (Deploy Assets & Evaluate Talent)</option>
              </select>
              {regForm.role === 'candidate' && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <input type="text" placeholder="Skills (React, NodeJS, Python)" value={regForm.skills} onChange={e => setRegForm({...regForm, skills: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none" />
                  <input type="number" placeholder="Experience Tier (Years)" value={regForm.experience} onChange={e => setRegForm({...regForm, experience: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none" />
                </div>
              )}
              <button type="submit" className="w-full bg-violet-600 font-black py-3 rounded-xl transition">Register Profile Context</button>
            </form>
            <p className="text-xs text-center text-slate-500">Go back? <span onClick={() => setCurrentView('login')} className="text-cyan-400 underline cursor-pointer">Login Menu</span></p>
          </div>
        )}

      
        {currentView === 'candidate' && currentUser && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h3 className="font-bold border-b border-slate-800 pb-3 flex items-center gap-2 text-emerald-400"><User size={16}/> Profile Matrix Metadata</h3>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <p><span className="text-slate-400">Node Identifier:</span> {currentUser.name}</p>
                  <p><span className="text-slate-400">Experience Profile:</span> {currentUser.experience} Years</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {currentUser.skills.map((s, i) => (<span key={i} className="text-xs px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-cyan-400">{s}</span>))}
                  </div>
                </div>
              </div>

              
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="font-bold flex items-center gap-2 text-sky-400 border-b border-slate-800 pb-2"><Globe size={16}/> Multi-Website Ingestion Pipeline</h3>
                <div className="space-y-2 text-xs">
                  <select value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:outline-none">
                    <option value="All Platforms">All Platforms Combined</option>
                    <option value="LinkedIn">LinkedIn Stream Only</option>
                    <option value="Indeed">Indeed Crawler Interface</option>
                    <option value="ZipRecruiter">ZipRecruiter Core Engine</option>
                  </select>
                  <input type="text" placeholder="Target Keyword (e.g. React)" value={aggregatorKeyword} onChange={e => setAggregatorKeyword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none" />
                  <button onClick={handleFetchExternalAggregator} className="w-full bg-sky-600 font-bold py-2 rounded-lg hover:bg-sky-700 text-white transition">Execute Target Mining Operations</button>
                </div>
              </div>

              
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h3 className="font-bold border-b border-slate-800 pb-3 flex items-center gap-2 text-violet-400"><ShieldCheck size={16}/> Security Engine Node</h3>
                {!currentUser.isTwoFactorEnabled ? (
                  <div className="mt-4 space-y-3">
                    {!qrCodeUrl ? (
                      <button onClick={setup2FA} className="w-full text-xs bg-violet-600 font-bold py-2 rounded-xl transition">Bind Authenticator App (2FA)</button>
                    ) : (
                      <div className="space-y-3 text-center">
                        <img src={qrCodeUrl} alt="QR Code" className="mx-auto p-1.5 bg-white rounded-lg w-32" />
                        <input type="text" placeholder="000000" maxLength="6" value={totpToken} onChange={e => setTotpToken(e.target.value)} className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded text-center tracking-widest font-mono text-sm w-full focus:outline-none" />
                        <button onClick={verify2FAToken} className="w-full bg-emerald-500 text-slate-900 font-bold text-xs py-1.5 rounded-lg">Confirm Token Handshake</button>
                      </div>
                    )}
                  </div>
                ) : ( <p className="text-xs text-emerald-400 mt-4 font-semibold flex items-center gap-1.5">✓ Cryptographic MFA Shield Engaged.</p> )}
              </div>
            </div>

            
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-black text-emerald-400 flex items-center gap-2"><Briefcase /> NLP Vector-Matched Jobs (Probability Density Sorted)</h2>
              {recommendations.map((job) => (
                <div key={job._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-400 font-bold">Platform: {job.sourceWebsite}</span>
                      <span className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs text-emerald-400 font-bold rounded-xl">{job.match_score}% Selection Likelihood</span>
                    </div>
                    <h4 className="text-lg font-bold mt-3">{job.title}</h4>
                    <p className="text-xs text-slate-400 font-bold">{job.company} — {job.location} (Threshold: {job.experienceRequired} Yrs)</p>
                    <p className="text-sm text-slate-300 mt-2 line-clamp-3">{job.description}</p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {job.requiredSkills.map((sk, id) => (<span key={id} className="text-[10px] px-2 py-0.5 bg-slate-950 text-slate-400 border border-slate-800 rounded flex items-center gap-1"><Code size={10}/>{sk}</span>))}
                    </div>
                  </div>
                  {job.applyUrl && (
                    <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition">
                      Apply Directly on Source Link <ExternalLink size={14}/>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        
        {currentView === 'poster' && currentUser && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="font-bold flex items-center gap-2 text-cyan-400 border-b border-slate-800 pb-2"><PlusCircle size={18}/> Deploy Core Requisition</h3>
                <form onSubmit={handleCreateJob} className="space-y-3 text-xs">
                  <input type="text" placeholder="Requisition Position Title" required value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none" />
                  <input type="text" placeholder="Target Company" required value={jobForm.company} onChange={e => setJobForm({...jobForm, company: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none" />
                  <input type="text" placeholder="Prerequisite Skills (React, NodeJS)" required value={jobForm.requiredSkills} onChange={e => setJobForm({...jobForm, requiredSkills: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none" />
                  <input type="number" placeholder="Experience Threshold Requirement" required value={jobForm.experienceRequired} onChange={e => setJobForm({...jobForm, experienceRequired: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none" />
                  <textarea placeholder="Provide explicit contextual parameters for text mining evaluation loops..." required value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} rows="4" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none resize-none"></textarea>
                  <button type="submit" className="w-full bg-cyan-500 text-slate-950 font-bold py-2 rounded-lg hover:bg-cyan-600 transition">Broadcast Asset Structure</button>
                </form>
              </div>

              
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-2 text-xs">
                <h3 className="font-bold flex items-center gap-2 text-amber-400"><Globe size={16}/> Automated External Syndication Link</h3>
                <p className="text-slate-400 text-[11px]">Give this URL endpoint to global search aggregators (Google for Jobs, ZipRecruiter) to automatically list your platform openings across their networks:</p>
                <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded font-mono text-[10px] text-cyan-400 break-all select-all">
                  http://localhost:5000/api/feeds/public-jobs
                </div>
              </div>
              
              
              {inspectingJobId && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                  <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2"><Users size={16}/> Top ML Match Candidates Pool</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {activeJobCandidates.map((cand) => (
                      <div key={cand._id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-200">
                          <span>{cand.name}</span>
                          <span className="text-emerald-400">{cand.match_score}% Optimal</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">Exp Layer: {cand.experience} Yrs</p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {cand.skills.map((sk, id) => (<span key={id} className="bg-slate-900 text-[9px] px-1 text-cyan-400 rounded">{sk}</span>))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-black text-cyan-400">Deployed Internal Assets Dashboard</h2>
              {myPostedJobs.map((job) => (
                <div key={job._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-lg font-bold">{job.title}</h4>
                    <p className="text-xs text-cyan-400 font-semibold mb-2">{job.company} — {job.location} (Experience Limit: {job.experienceRequired} Yrs)</p>
                    <p className="text-sm text-slate-400 line-clamp-3">{job.description}</p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {job.requiredSkills.map((s, idx) => (<span key={idx} className="text-[10px] bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded">{s}</span>))}
                    </div>
                  </div>
                  <button onClick={() => inspectTopCandidates(job._id)} className="mt-4 flex items-center justify-center gap-1.5 w-full bg-slate-950 border border-slate-800 text-slate-200 hover:text-white hover:bg-slate-900 font-bold py-2 rounded-xl text-xs transition">
                    Run NLP Evaluation Over Candidate Pool <Users size={14}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}