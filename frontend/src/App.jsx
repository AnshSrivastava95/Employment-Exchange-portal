import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, User, Code, Zap, PlusCircle, ShieldCheck, Key, LogOut, UserPlus, Globe, Users, Cpu, FolderGit, Building, LayoutDashboard, Settings } from 'lucide-react';

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


  const [regForm, setRegForm] = useState({ name: '', email: '', role: 'candidate', skills: '', experience: 0 });
  const [regCompanies, setRegCompanies] = useState([]);
  const [regProjects, setRegProjects] = useState([]);


  const [editSkills, setEditSkills] = useState('');
  const [editExperience, setEditExperience] = useState(0);
  const [editCompanies, setEditCompanies] = useState([]);
  const [editProjects, setEditProjects] = useState([]);

  const [jobForm, setJobForm] = useState({ title: '', company: '', description: '', requiredSkills: '', experienceRequired: 0, location: 'Remote' });


  const addCompanyRow = (isEdit = false) => {
    const newCompany = { companyName: '', roleTitle: '', duration: '', description: '' };
    isEdit ? setEditCompanies([...editCompanies, newCompany]) : setRegCompanies([...regCompanies, newCompany]);
  };

  const addProjectRow = (isEdit = false) => {
    const newProj = { title: '', techStack: '', description: '' };
    isEdit ? setEditProjects([...editProjects, newProj]) : setRegProjects([...regProjects, newProj]);
  };

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
      const res = await axios.post('https://smartmatch-ai-52mm.onrender.com', { email: authEmail });
      if (res.data.requires2FA) {
        setPendingUserId(res.data.userId);
        setPending2FA(true);
      } else {
        initializeUserProfileState(res.data.user);
      }
    } catch (err) { alert(err.response?.data?.message || "Login missing target context match."); }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const compiledPayload = {
        ...regForm,
        companies: regCompanies,
        projects: regProjects.map(p => ({ 
          ...p, 
          techStack: typeof p.techStack === 'string' ? p.techStack.split(',').map(s => s.trim()).filter(Boolean) : p.techStack 
        }))
      };
      const res = await axios.post('https://smartmatch-ai-52mm.onrender.com', compiledPayload);
      if (res.data.success) {
        alert("Account completely structured. Please login.");
        setCurrentView('login');
      }
    } catch (err) { alert("Registration layout rejected."); }
  };

  const handleUpdateProfile = async () => {
    try {

      const formattedProjects = editProjects.map(p => {
        let stackArray = [];
        if (Array.isArray(p.techStack)) {
          stackArray = p.techStack;
        } else if (typeof p.techStack === 'string') {
          stackArray = p.techStack.split(',').map(s => s.trim()).filter(Boolean);
        }
        return { ...p, techStack: stackArray };
      });

      const res = await axios.post('https://smartmatch-ai-52mm.onrender.com/api/auth/update-profile', {
        userId: currentUser._id,
        skills: typeof editSkills === 'string' ? editSkills.split(',').map(s => s.trim()).filter(Boolean) : editSkills,
        experience: Number(editExperience),
        companies: editCompanies,
        projects: formattedProjects
      });

      if (res.data.success) {
        alert("Profile re-vectored & vector tracking refreshed!");
        setCurrentUser(res.data.user);
        

        setEditSkills(res.data.user.skills?.join(', ') || '');
        setEditExperience(res.data.user.experience || 0);
        setEditCompanies(res.data.user.companies || []);
        setEditProjects(res.data.user.projects || []);
        
        const rRes = await axios.get(`https://smartmatch-ai-52mm.onrender.com/api/recommendations/candidate/${res.data.user._id}`);
        setRecommendations(rRes.data);
      }
    } catch (err) { 
      console.error(err);
      alert(`Failed to re-match profile: ${err.response?.data?.error || err.message}`); 
    }
  };

  const initializeUserProfileState = (user) => {
    setCurrentUser(user);
    setEditSkills(user.skills?.join(', ') || '');
    setEditExperience(user.experience || 0);
    setEditCompanies(user.companies || []);
    setEditProjects(user.projects || []);
    setCurrentView(user.role);
  };

  const verify2FAToken = async () => {
    try {
      const res = await axios.post('https://smartmatch-ai-52mm.onrender.com/api/auth/2fa/verify', { userId: pendingUserId || currentUser._id, token: totpToken });
      if (res.data.success) {
        alert("Token match verified successfully!"); 
        if (pending2FA) {
          initializeUserProfileState(res.data.user);
          setPending2FA(false);
        } else {
          setCurrentUser(res.data.user);
          setQrCodeUrl('');
        }
      }
    } catch (err) { alert("Invalid 2FA token code."); }
  };

  const setup2FA = async () => {
    const res = await axios.post('https://smartmatch-ai-52mm.onrender.com/api/auth/2fa/setup', { userId: currentUser._id });
    setQrCodeUrl(res.data.qrCodeUrl);
  };

  const loadCandidateData = async () => {
    const res = await axios.get(`https://smartmatch-ai-52mm.onrender.com/api/recommendations/candidate/${currentUser._id}`);
    setRecommendations(res.data);
  };

  const loadPosterData = async () => {
    const res = await axios.get(`https://smartmatch-ai-52mm.onrender.com/api/jobs/posted/${currentUser._id}`);
    setMyPostedJobs(res.data);
  };

  const inspectTopCandidates = async (jobId) => {
    setInspectingJobId(jobId);
    const res = await axios.get(`https://smartmatch-ai-52mm.onrender.com/api/recommendations/job/${jobId}/candidates`);
    setActiveJobCandidates(res.data);
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    await axios.post('https://smartmatch-ai-52mm.onrender.com/api/jobs', { ...jobForm, postedBy: currentUser._id });
    alert("Role published to active queues.");
    setJobForm({ title: '', company: '', description: '', requiredSkills: '', experienceRequired: 0, location: 'Remote' });
    loadPosterData();
  };

  useEffect(() => {
    if (currentUser && currentView === 'candidate') loadCandidateData();
    if (currentUser && currentView === 'poster') loadPosterData();
  }, [currentUser, currentView]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans antialiased">
      <header className="max-w-7xl mx-auto flex justify-between items-center border-b border-slate-900 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
            <Zap className="fill-emerald-400 text-emerald-400" /> SmartMatch AI <span className="text-xs bg-cyan-500/20 text-cyan-300 font-normal px-2.5 py-0.5 rounded-full border border-cyan-500/30">Pro v2.0</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">Multi-Dimensional Natural Language Profile Ingestion Architecture</p>
        </div>
        {currentUser && (
          <button onClick={handleLogout} className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold px-4 py-2 rounded-xl text-sm transition">
            <LogOut size={16} /> Logout ({currentUser.name})
          </button>
        )}
      </header>

      <main className="max-w-7xl mx-auto">
        
        
        {currentView === 'login' && (
          <div className="space-y-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-4">
              <div className="lg:col-span-7 space-y-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Cpu size={12} /> Natural Language ML Extraction Vectorizer Active
                </span>
                <h2 className="text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                  The Intelligent Way To <br />
                  <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">Match Dynamic Talent</span>
                </h2>
                <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
                  SmartMatch AI profiles complex candidate telemetry. We parse through nested arrays of technical projects and past work experiences to verify matching alignments instantly.
                </p>
                <div className="grid grid-cols-3 gap-4 max-w-lg pt-4">
                  <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-cyan-400">98.4%</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Precision Match Match</p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-emerald-400">&lt; 2s</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Telemetry Re-Score</p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-violet-400">TOTP</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">2FA Secure Token</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6 shadow-2xl relative">
                  <h3 className="text-xl font-black text-center flex items-center justify-center gap-2"><Key className="text-cyan-400" /> Gateway Authentication</h3>
                  {!pending2FA ? (
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Enter enterprise email" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-200" />
                      <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-xl transition shadow-lg shadow-cyan-500/10">Proceed Into Ecosystem</button>
                    </form>
                  ) : (
                    <div className="space-y-4 text-center">
                      <p className="text-sm text-amber-400 flex items-center justify-center gap-1.5 font-bold">🔒 Multi-Factor Vault Check Active:</p>
                      <input type="text" maxLength="6" value={totpToken} onChange={e => setTotpToken(e.target.value)} placeholder="000000" className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center tracking-widest text-lg font-mono w-full focus:outline-none focus:border-emerald-500 text-emerald-400" />
                      <button onClick={verify2FAToken} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl transition">Verify Verification Token</button>
                    </div>
                  )}
                  <p className="text-xs text-center text-slate-500">Need profile deployment? <span onClick={() => setCurrentView('register')} className="text-cyan-400 underline cursor-pointer font-bold">Instantiate Data Profile</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        
        {currentView === 'register' && (
          <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
            <h2 className="text-2xl font-black text-center flex items-center justify-center gap-2 text-violet-400"><UserPlus /> Build Structural Profile Matrix</h2>
            
            <form onSubmit={handleRegisterSubmit} className="space-y-6 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select value={regForm.role} onChange={e => setRegForm({...regForm, role: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300">
                  <option value="candidate">Job Seeker (Candidate)</option>
                  <option value="poster">Recruiter (Job Poster)</option>
                </select>
                <input type="text" placeholder="Full Identity Name" required value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5" />
                <input type="email" placeholder="Secure Email Address" required value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5" />
              </div>

              {regForm.role === 'candidate' && (
                <div className="space-y-6 pt-4 border-t border-slate-800">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3">
                      <input type="text" placeholder="Core Skills (e.g. React, Node, Python)" value={regForm.skills} onChange={e => setRegForm({...regForm, skills: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5" />
                    </div>
                    <div>
                      <input type="number" placeholder="Experience (Yrs)" value={regForm.experience} onChange={e => setRegForm({...regForm, experience: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5" />
                    </div>
                  </div>

                  
                  {regForm.experience > 0 && (
                    <div className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5"><Building size={14}/> Professional Work History</h4>
                        <button type="button" onClick={() => addCompanyRow(false)} className="text-xs bg-slate-900 border border-slate-800 hover:border-amber-400/50 px-3 py-1 rounded-lg transition font-bold text-slate-300">+ Add Company Registry</button>
                      </div>
                      {regCompanies.map((comp, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
                          <input type="text" placeholder="Company Name" required value={comp.companyName} onChange={e => {
                            const updated = [...regCompanies]; updated[idx].companyName = e.target.value; setRegCompanies(updated);
                          }} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs" />
                          <input type="text" placeholder="Role Title" required value={comp.roleTitle} onChange={e => {
                            const updated = [...regCompanies]; updated[idx].roleTitle = e.target.value; setRegCompanies(updated);
                          }} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs" />
                          <input type="text" placeholder="Duration (e.g., 2024 - 2026)" required value={comp.duration} onChange={e => {
                            const updated = [...regCompanies]; updated[idx].duration = e.target.value; setRegCompanies(updated);
                          }} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs" />
                          <input type="text" placeholder="Summary of responsibilities and achievements..." required value={comp.description} onChange={e => {
                            const updated = [...regCompanies]; updated[idx].description = e.target.value; setRegCompanies(updated);
                          }} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs" />
                        </div>
                      ))}
                    </div>
                  )}

                
                  <div className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-cyan-400 text-xs flex items-center gap-1.5"><FolderGit size={14}/> Engineering Projects Vector Pool</h4>
                      <button type="button" onClick={() => addProjectRow(false)} className="text-xs bg-slate-900 border border-slate-800 hover:border-cyan-400/50 px-3 py-1 rounded-lg transition font-bold text-slate-300">+ Add Project Registry</button>
                    </div>
                    {regProjects.map((proj, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
                        <input type="text" placeholder="Project Title" required value={proj.title} onChange={e => {
                          const updated = [...regProjects]; updated[idx].title = e.target.value; setRegProjects(updated);
                        }} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs" />
                        <input type="text" placeholder="Tech Stack (Comma-separated)" required value={proj.techStack} onChange={e => {
                          const updated = [...regProjects]; updated[idx].techStack = e.target.value; setRegProjects(updated);
                        }} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs md:col-span-2" />
                        <input type="text" placeholder="Execution metrics and architecture details..." required value={proj.description} onChange={e => {
                          const updated = [...regProjects]; updated[idx].description = e.target.value; setRegProjects(updated);
                        }} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs md:col-span-3" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 font-black py-3 rounded-xl transition">Submit Profile Structural Deployment</button>
            </form>
            <p className="text-xs text-center text-slate-500">Existing context metadata? <span onClick={() => setCurrentView('login')} className="text-cyan-400 underline cursor-pointer">Login</span></p>
          </div>
        )}

        {currentView === 'candidate' && currentUser && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            

            <div className="lg:col-span-4 space-y-6">
              
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="font-bold border-b border-slate-800 pb-3 flex items-center gap-2 text-emerald-400"><LayoutDashboard size={16}/> Identity Matrix Registry</h3>
                <div className="space-y-2 text-sm text-slate-300">
                  <p><span className="text-slate-500 font-bold">Principal Identity:</span> {currentUser.name}</p>
                  <p><span className="text-slate-500 font-bold">Experience Ingestion:</span> {currentUser.experience} Years</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {currentUser.skills?.map((s, i) => (<span key={i} className="text-[10px] tracking-wide uppercase font-bold px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-cyan-400">{s}</span>))}
                  </div>
                </div>
              </div>

              
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="font-bold border-b border-slate-800 pb-3 flex items-center gap-2 text-amber-400"><Settings size={16}/> Telemetry Target Workspace</h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Skills String Map</label>
                    <input type="text" value={editSkills} onChange={e => setEditSkills(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Experience Ingest (Yrs)</label>
                    <input type="number" value={editExperience} onChange={e => setEditExperience(parseInt(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none" />
                  </div>

                  
                  {editExperience > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 block">Work History Tracking Rows</span>
                        <button type="button" onClick={() => addCompanyRow(true)} className="text-[10px] text-cyan-400 underline">+ Add Row</button>
                      </div>
                      {editCompanies.map((c, idx) => (
                        <div key={idx} className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <input type="text" placeholder="Company Name" value={c.companyName || ''} onChange={e => { const u = [...editCompanies]; u[idx].companyName = e.target.value; setEditCompanies(u); }} className="w-full bg-slate-900 border border-slate-800 text-[11px] rounded p-1" />
                          <input type="text" placeholder="Role Title" value={c.roleTitle || ''} onChange={e => { const u = [...editCompanies]; u[idx].roleTitle = e.target.value; setEditCompanies(u); }} className="w-full bg-slate-900 border border-slate-800 text-[11px] rounded p-1" />
                          <input type="text" placeholder="Summary Context" value={c.description || ''} onChange={e => { const u = [...editCompanies]; u[idx].description = e.target.value; setEditCompanies(u); }} className="w-full bg-slate-900 border border-slate-800 text-[11px] rounded p-1" />
                        </div>
                      ))}
                    </div>
                  )}

                  
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 block">Engineering Projects Rows</span>
                      <button type="button" onClick={() => addProjectRow(true)} className="text-[10px] text-cyan-400 underline">+ Add Row</button>
                    </div>
                    {editProjects.map((p, idx) => (
                      <div key={idx} className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <input type="text" placeholder="Project Title" value={p.title || ''} onChange={e => { const u = [...editProjects]; u[idx].title = e.target.value; setEditProjects(u); }} className="w-full bg-slate-900 border border-slate-800 text-[11px] rounded p-1" />
                        <input type="text" placeholder="Tech Stack" value={Array.isArray(p.techStack) ? p.techStack.join(', ') : (p.techStack || '')} onChange={e => { const u = [...editProjects]; u[idx].techStack = e.target.value; setEditProjects(u); }} className="w-full bg-slate-900 border border-slate-800 text-[11px] rounded p-1" />
                        <input type="text" placeholder="Architecture Description" value={p.description || ''} onChange={e => { const u = [...editProjects]; u[idx].description = e.target.value; setEditProjects(u); }} className="w-full bg-slate-900 border border-slate-800 text-[11px] rounded p-1" />
                      </div>
                    ))}
                  </div>

                  <button onClick={handleUpdateProfile} className="w-full bg-amber-500 font-bold text-slate-950 py-2 rounded-lg transition mt-4 hover:bg-amber-400">Re-vector Ecosystem Profile</button>
                </div>
              </div>

              
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="font-bold flex items-center gap-2 text-violet-400 border-b border-slate-800 pb-3"><ShieldCheck size={18}/> Ecosystem Guard (2FA)</h3>
                {!currentUser.isTwoFactorEnabled ? (
                  <div className="space-y-3 text-xs text-center">
                    <p className="text-slate-400 text-left leading-relaxed">Boost your security metrics. Activate TOTP verification across your profile gateway.</p>
                    {!qrCodeUrl ? (
                      <button onClick={setup2FA} className="w-full bg-violet-600 font-bold py-2 rounded-lg text-white transition hover:bg-violet-500">Initiate Security Handshake</button>
                    ) : (
                      <div className="space-y-3 text-center flex flex-col items-center">
                        <img src={qrCodeUrl} alt="Authenticator Token Setup QR" className="border-4 border-white p-1 rounded-lg w-36 h-36" />
                        <input type="text" maxLength="6" placeholder="000000" value={totpToken} onChange={e => setTotpToken(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-center tracking-widest font-mono text-slate-200" />
                        <button onClick={verify2FAToken} className="w-full bg-emerald-500 font-bold py-2 text-slate-950 rounded-lg transition hover:bg-emerald-400">Lock Cryptographic Pairing</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                     Multi-Factor Vault Routing Shield Fully Operational
                  </div>
                )}
              </div>

            </div>

          
            <div className="lg:col-span-8 space-y-4">
              <h2 className="text-xl font-black text-emerald-400 flex items-center gap-2"><Briefcase /> Vector Matching Pipeline Score Metrics</h2>
              {recommendations.map((job) => (
                <div key={job._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative transition hover:border-slate-700/50">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-400 tracking-wide uppercase">Source Network: {job.sourceWebsite}</span>
                      <h4 className="text-xl font-black mt-3 text-slate-100">{job.title}</h4>
                      <p className="text-xs text-slate-400 font-bold mt-0.5">{job.company} — {job.location} (Engine Threshold: {job.experienceRequired} Years)</p>
                    </div>
                    <span className="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 px-4 py-2 text-sm text-emerald-400 font-black rounded-xl shadow-lg">
                      {job.match_score}% Deep Match
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mt-4 leading-relaxed font-normal">{job.description}</p>
                </div>
              ))}
            </div>

          </div>
        )}

        
        {currentView === 'poster' && currentUser && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="font-bold flex items-center gap-2 text-cyan-400 border-b border-slate-800 pb-2"><PlusCircle size={18}/> Post Role Matrix</h3>
                <form onSubmit={handleCreateJob} className="space-y-3 text-xs">
                  <input type="text" placeholder="Title" required value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2" />
                  <input type="text" placeholder="Company" required value={jobForm.company} onChange={e => setJobForm({...jobForm, company: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2" />
                  <input type="text" placeholder="Skills Required" required value={jobForm.requiredSkills} onChange={e => setJobForm({...jobForm, requiredSkills: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2" />
                  <input type="number" placeholder="Experience Required" required value={jobForm.experienceRequired} onChange={e => setJobForm({...jobForm, experienceRequired: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2" />
                  <textarea placeholder="Job Content Description..." required value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} rows="4" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 resize-none"></textarea>
                  <button type="submit" className="w-full bg-cyan-500 text-slate-950 font-bold py-2 rounded-lg hover:bg-cyan-600 transition">Publish Position</button>
                </form>
              </div>

              {inspectingJobId && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                  <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2"><Users size={16}/> Filter Match Candidates</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {activeJobCandidates.map((cand) => (
                      <div key={cand._id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-200">
                          <span>{cand.name}</span>
                          <span className="text-emerald-400">{cand.match_score}% Score</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">Experience Ingest: {cand.experience} Yrs</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-black text-cyan-400">Active Board Postings</h2>
              {myPostedJobs.map((job) => (
                <div key={job._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-lg font-bold">{job.title}</h4>
                    <p className="text-xs text-cyan-400 font-semibold mb-2">{job.company} — {job.location}</p>
                    <p className="text-sm text-slate-400 line-clamp-3">{job.description}</p>
                  </div>
                  <button onClick={() => inspectTopCandidates(job._id)} className="mt-4 flex items-center justify-center gap-1.5 w-full bg-slate-950 border border-slate-800 text-slate-200 hover:bg-slate-900 font-bold py-2 rounded-xl text-xs transition">
                    Scan Database for Best Candidates <Users size={14}/>
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