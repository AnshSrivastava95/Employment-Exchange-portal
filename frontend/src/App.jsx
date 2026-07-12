import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Briefcase, PlusCircle, ShieldCheck, Key, LogOut, UserPlus,
  Users, Building, FolderGit, LayoutDashboard, Settings, ArrowRight, CheckCircle2,
  Search, ExternalLink, Loader2, DollarSign
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const c = {
  ink: '#0E1420',
  inkBorder: '#242C42',
  offwhite: '#F4F1E8',
  mutedOnDark: '#8B93A7',
  paper: '#EDE6D6',
  paperRow: '#E4DBC5',
  paperBorder: '#D9CEB0',
  inkText: '#1C2130',
  mutedOnPaper: '#736B58',
  stamp: '#A63D2F',
  stampDark: '#8A2F23',
  teal: '#2F6F62',
};

function FontStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,600;0,700;1,500&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      .font-display { font-family: 'Fraunces', serif; }
      .font-ui { font-family: 'IBM Plex Sans', sans-serif; }
      .font-data { font-family: 'IBM Plex Mono', monospace; }
      .sm-focus:focus-visible { outline: 2px solid ${c.stamp}; outline-offset: 2px; }
      .spin { animation: sm-spin 1s linear infinite; }
      @keyframes sm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `}</style>
  );
}

function Eyebrow({ children, tone = 'dark' }) {
  return (
    <span className="font-data text-[10px] tracking-[0.22em] uppercase" style={{ color: tone === 'dark' ? c.mutedOnDark : c.mutedOnPaper }}>
      {children}
    </span>
  );
}

function FitStamp({ score, size = 84 }) {
  const fontSize = size <= 64 ? 15 : 20;
  return (
    <div
      className="relative shrink-0 rounded-full flex flex-col items-center justify-center select-none"
      style={{ width: size, height: size, transform: 'rotate(-4deg)', border: `2px solid ${c.stamp}`, color: c.stamp, background: 'rgba(166,61,47,0.06)' }}
    >
      <div className="absolute rounded-full" style={{ inset: size <= 64 ? 4 : 7, border: `1px dashed rgba(166,61,47,0.45)` }} />
      <span className="font-data font-semibold leading-none" style={{ fontSize }}>{score}</span>
      <span className="font-data mt-1" style={{ fontSize: 9, letterSpacing: '0.2em' }}>FIT</span>
    </div>
  );
}

function PaperCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl p-6 ${className}`} style={{ background: c.paper, border: `1px solid ${c.paperBorder}`, color: c.inkText }}>
      {children}
    </div>
  );
}

function fieldClass() {
  return 'w-full rounded-lg px-3.5 py-2.5 text-sm font-ui focus:outline-none sm-focus transition';
}

function fieldStyle() {
  return { background: '#F7F3E9', border: `1px solid ${c.paperBorder}`, color: c.inkText };
}

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

  const [externalQuery, setExternalQuery] = useState('');
  const [externalResults, setExternalResults] = useState([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState('');
  const [externalSearched, setExternalSearched] = useState(false);

  const [salaryQuery, setSalaryQuery] = useState('');
  const [salaryCountry, setSalaryCountry] = useState('us');
  const [salaryResult, setSalaryResult] = useState(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryError, setSalaryError] = useState('');

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
      const res = await axios.post(`${API_BASE}/auth/login`, { email: authEmail });
      if (res.data.requires2FA) {
        setPendingUserId(res.data.userId);
        setPending2FA(true);
      } else {
        initializeUserProfileState(res.data.user);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...regForm,
        companies: regCompanies,
        projects: regProjects.map(p => ({
          ...p,
          techStack: typeof p.techStack === 'string' ? p.techStack.split(',').map(s => s.trim()).filter(Boolean) : p.techStack
        }))
      };
      const res = await axios.post(`${API_BASE}/auth/register`, payload);
      if (res.data.success) {
        alert('Account created. Please log in.');
        setCurrentView('login');
      }
    } catch (err) {
      alert('Registration failed. Please check your details and try again.');
    }
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

      const res = await axios.post(`${API_BASE}/auth/update-profile`, {
        userId: currentUser._id,
        skills: typeof editSkills === 'string' ? editSkills.split(',').map(s => s.trim()).filter(Boolean) : editSkills,
        experience: Number(editExperience),
        companies: editCompanies,
        projects: formattedProjects
      });

      if (res.data.success) {
        alert('Profile updated successfully!');
        setCurrentUser(res.data.user);
        setEditSkills(res.data.user.skills?.join(', ') || '');
        setEditExperience(res.data.user.experience || 0);
        setEditCompanies(res.data.user.companies || []);
        setEditProjects(res.data.user.projects || []);

        const rRes = await axios.get(`${API_BASE}/recommendations/candidate/${res.data.user._id}`);
        setRecommendations(rRes.data);
      }
    } catch (err) {
      alert(`Failed to update profile: ${err.response?.data?.error || err.message}`);
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
      const res = await axios.post(`${API_BASE}/auth/2fa/verify`, { userId: pendingUserId || currentUser._id, token: totpToken });
      if (res.data.success) {
        alert('Token verified successfully!');
        if (pending2FA) {
          initializeUserProfileState(res.data.user);
          setPending2FA(false);
        } else {
          setCurrentUser(res.data.user);
          setQrCodeUrl('');
        }
      }
    } catch (err) {
      alert('Invalid 2FA code. Please try again.');
    }
  };

  const setup2FA = async () => {
    const res = await axios.post(`${API_BASE}/auth/2fa/setup`, { userId: currentUser._id });
    setQrCodeUrl(res.data.qrCodeUrl);
  };

  const loadCandidateData = async () => {
    const res = await axios.get(`${API_BASE}/recommendations/candidate/${currentUser._id}`);
    setRecommendations(res.data);
  };

  const loadPosterData = async () => {
    const res = await axios.get(`${API_BASE}/jobs/posted/${currentUser._id}`);
    setMyPostedJobs(res.data);
  };

  const inspectTopCandidates = async (jobId) => {
    setInspectingJobId(jobId);
    const res = await axios.get(`${API_BASE}/recommendations/job/${jobId}/candidates`);
    setActiveJobCandidates(res.data);
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    await axios.post(`${API_BASE}/jobs`, { ...jobForm, postedBy: currentUser._id });
    alert('Job posted successfully.');
    setJobForm({ title: '', company: '', description: '', requiredSkills: '', experienceRequired: 0, location: 'Remote' });
    loadPosterData();
  };

  const handleExternalSearch = async (e) => {
    e.preventDefault();
    if (!externalQuery.trim()) return;
    setExternalLoading(true);
    setExternalError('');
    setExternalSearched(true);
    try {
      const res = await axios.get(`${API_BASE}/jobs/external-search`, {
        params: { query: externalQuery, candidateId: currentUser._id }
      });
      setExternalResults(res.data);
    } catch (err) {
      setExternalError(err.response?.data?.error || 'Search failed. Please try again.');
      setExternalResults([]);
    } finally {
      setExternalLoading(false);
    }
  };

  const handleSalaryLookup = async (e) => {
    e.preventDefault();
    if (!salaryQuery.trim()) return;
    setSalaryLoading(true);
    setSalaryError('');
    setSalaryResult(null);
    try {
      const res = await axios.get(`${API_BASE}/jobs/salary-insights`, {
        params: { query: salaryQuery, countryCode: salaryCountry }
      });
      setSalaryResult(res.data);
    } catch (err) {
      setSalaryError(err.response?.data?.error || 'Could not fetch salary data.');
    } finally {
      setSalaryLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentView === 'candidate') loadCandidateData();
    if (currentUser && currentView === 'poster') loadPosterData();
  }, [currentUser, currentView]);

  return (
    <div className="min-h-screen font-ui" style={{ background: c.ink, color: c.offwhite }}>
      <FontStyles />

      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{ background: `radial-gradient(600px circle at 15% -10%, rgba(166,61,47,0.18), transparent 60%), radial-gradient(500px circle at 100% 0%, rgba(47,111,98,0.14), transparent 55%)` }}
      />

      <header className="relative sticky top-0 z-10 backdrop-blur" style={{ background: 'rgba(14,20,32,0.85)', borderBottom: `1px solid ${c.inkBorder}` }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md flex items-center justify-center font-data text-xs font-semibold shrink-0" style={{ border: `1px solid ${c.stamp}`, color: c.stamp }}>SM</div>
            <div>
              <h1 className="font-display text-xl font-semibold leading-none" style={{ color: c.offwhite }}>Smartmatch</h1>
              <p className="font-data text-[10px] tracking-[0.2em] uppercase mt-1" style={{ color: c.mutedOnDark }}>Talent Matching Desk</p>
            </div>
          </div>
          {currentUser && (
            <button onClick={handleLogout} className="sm-focus flex items-center gap-2 font-ui font-medium px-4 py-2 rounded-lg text-sm transition" style={{ color: '#E7B4AA', border: `1px solid rgba(166,61,47,0.4)`, background: 'rgba(166,61,47,0.08)' }}>
              <LogOut size={15} /> Sign out ({currentUser.name})
            </button>
          )}
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 py-12">

        {currentView === 'login' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center pt-4">
            <div className="lg:col-span-7 space-y-7">
              <Eyebrow>AI-assisted matching</Eyebrow>
              <h2 className="font-display text-5xl lg:text-6xl font-semibold leading-[1.05]" style={{ color: c.offwhite }}>
                Where fit is <span className="italic" style={{ color: '#E7B4AA' }}>measured</span>,<br />not guessed.
              </h2>
              <p className="text-[15px] leading-relaxed max-w-xl" style={{ color: c.mutedOnDark }}>
                Smartmatch reads your skills, work history, and shipped projects, then scores every opening against them, and can pull live listings straight from LinkedIn, Indeed, Glassdoor and more.
              </p>
              <div className="flex items-center gap-8 pt-4">
                <div>
                  <p className="font-data text-2xl font-semibold" style={{ color: c.offwhite }}>98.4%</p>
                  <Eyebrow>Match accuracy</Eyebrow>
                </div>
                <div className="w-px h-9" style={{ background: c.inkBorder }} />
                <div>
                  <p className="font-data text-2xl font-semibold" style={{ color: c.offwhite }}>&lt;2s</p>
                  <Eyebrow>Rescore time</Eyebrow>
                </div>
                <div className="w-px h-9" style={{ background: c.inkBorder }} />
                <div>
                  <p className="font-data text-2xl font-semibold" style={{ color: c.offwhite }}>TOTP</p>
                  <Eyebrow>2FA security</Eyebrow>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <PaperCard className="shadow-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <Key size={16} style={{ color: c.stamp }} />
                  <Eyebrow tone="light">Sign in</Eyebrow>
                </div>
                <h3 className="font-display text-2xl font-semibold mb-6" style={{ color: c.inkText }}>Welcome back</h3>
                {!pending2FA ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label className="font-data text-[10px] tracking-[0.15em] uppercase block mb-1.5" style={{ color: c.mutedOnPaper }}>Email address</label>
                      <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@company.com" className={fieldClass()} style={fieldStyle()} />
                    </div>
                    <button type="submit" className="sm-focus w-full font-ui font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2" style={{ background: c.stamp, color: c.offwhite }} onMouseEnter={e => e.currentTarget.style.background = c.stampDark} onMouseLeave={e => e.currentTarget.style.background = c.stamp}>
                      Sign in <ArrowRight size={16} />
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4 text-center">
                    <p className="text-sm font-medium" style={{ color: c.mutedOnPaper }}>Enter the 6-digit code from your authenticator app</p>
                    <input type="text" maxLength="6" value={totpToken} onChange={e => setTotpToken(e.target.value)} placeholder="000000" className="font-data w-full rounded-lg px-4 py-3 text-center tracking-[0.4em] text-lg focus:outline-none sm-focus" style={{ background: '#F7F3E9', border: `1px solid ${c.paperBorder}`, color: c.teal }} />
                    <button onClick={verify2FAToken} className="sm-focus w-full font-ui font-semibold py-3 rounded-lg transition" style={{ background: c.teal, color: c.offwhite }}>Verify code</button>
                  </div>
                )}
                <p className="text-xs text-center mt-6" style={{ color: c.mutedOnPaper }}>
                  New here? <span onClick={() => setCurrentView('register')} className="underline cursor-pointer font-semibold" style={{ color: c.stamp }}>Create a profile</span>
                </p>
              </PaperCard>
            </div>
          </div>
        )}

        {currentView === 'register' && (
          <div className="max-w-3xl mx-auto">
            <PaperCard>
              <div className="flex items-center gap-2 mb-1">
                <UserPlus size={16} style={{ color: c.stamp }} />
                <Eyebrow tone="light">New profile</Eyebrow>
              </div>
              <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: c.inkText }}>Tell us about yourself</h2>
              <form onSubmit={handleRegisterSubmit} className="space-y-7">
                <div>
                  <p className="font-data text-[10px] tracking-[0.15em] uppercase mb-3" style={{ color: c.mutedOnPaper }}>Basic information</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select value={regForm.role} onChange={e => setRegForm({...regForm, role: e.target.value})} className={fieldClass()} style={fieldStyle()}>
                      <option value="candidate">Job seeker (candidate)</option>
                      <option value="poster">Recruiter (job poster)</option>
                    </select>
                    <input type="text" placeholder="Full name" required value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} className={fieldClass()} style={fieldStyle()} />
                    <input type="email" placeholder="Email address" required value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} className={fieldClass()} style={fieldStyle()} />
                  </div>
                </div>

                {regForm.role === 'candidate' && (
                  <>
                    <div className="pt-6" style={{ borderTop: `1px solid ${c.paperBorder}` }}>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
                        <div className="md:col-span-3">
                          <p className="font-data text-[10px] tracking-[0.15em] uppercase mb-3" style={{ color: c.mutedOnPaper }}>Core skills</p>
                          <input type="text" placeholder="e.g. React, Node, Python" value={regForm.skills} onChange={e => setRegForm({...regForm, skills: e.target.value})} className={fieldClass()} style={fieldStyle()} />
                        </div>
                        <div>
                          <p className="font-data text-[10px] tracking-[0.15em] uppercase mb-3" style={{ color: c.mutedOnPaper }}>Experience (yrs)</p>
                          <input type="number" value={regForm.experience} onChange={e => setRegForm({...regForm, experience: parseInt(e.target.value) || 0})} className={fieldClass()} style={fieldStyle()} />
                        </div>
                      </div>
                    </div>

                    {regForm.experience > 0 && (
                      <div className="rounded-xl p-5" style={{ background: c.paperRow, border: `1px solid ${c.paperBorder}` }}>
                        <div className="flex justify-between items-center mb-4">
                          <p className="font-medium text-sm flex items-center gap-1.5" style={{ color: c.inkText }}><Building size={14}/> Work history</p>
                          <button type="button" onClick={() => addCompanyRow(false)} className="sm-focus text-xs font-semibold px-3 py-1.5 rounded-md transition" style={{ background: c.paper, border: `1px solid ${c.paperBorder}`, color: c.stamp }}>+ Add company</button>
                        </div>
                        <div className="space-y-3">
                          {regCompanies.map((comp, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-2.5 p-3 rounded-lg" style={{ background: c.paper, border: `1px solid ${c.paperBorder}` }}>
                              <input type="text" placeholder="Company name" required value={comp.companyName} onChange={e => { const updated = [...regCompanies]; updated[idx].companyName = e.target.value; setRegCompanies(updated); }} className="rounded-md px-3 py-2 text-xs font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                              <input type="text" placeholder="Role title" required value={comp.roleTitle} onChange={e => { const updated = [...regCompanies]; updated[idx].roleTitle = e.target.value; setRegCompanies(updated); }} className="rounded-md px-3 py-2 text-xs font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                              <input type="text" placeholder="Duration (e.g., 2024 – 2026)" required value={comp.duration} onChange={e => { const updated = [...regCompanies]; updated[idx].duration = e.target.value; setRegCompanies(updated); }} className="rounded-md px-3 py-2 text-xs font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                              <input type="text" placeholder="Responsibilities & achievements" required value={comp.description} onChange={e => { const updated = [...regCompanies]; updated[idx].description = e.target.value; setRegCompanies(updated); }} className="rounded-md px-3 py-2 text-xs font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl p-5" style={{ background: c.paperRow, border: `1px solid ${c.paperBorder}` }}>
                      <div className="flex justify-between items-center mb-4">
                        <p className="font-medium text-sm flex items-center gap-1.5" style={{ color: c.inkText }}><FolderGit size={14}/> Projects</p>
                        <button type="button" onClick={() => addProjectRow(false)} className="sm-focus text-xs font-semibold px-3 py-1.5 rounded-md transition" style={{ background: c.paper, border: `1px solid ${c.paperBorder}`, color: c.stamp }}>+ Add project</button>
                      </div>
                      <div className="space-y-3">
                        {regProjects.map((proj, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-3 rounded-lg" style={{ background: c.paper, border: `1px solid ${c.paperBorder}` }}>
                            <input type="text" placeholder="Project title" required value={proj.title} onChange={e => { const updated = [...regProjects]; updated[idx].title = e.target.value; setRegProjects(updated); }} className="rounded-md px-3 py-2 text-xs font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                            <input type="text" placeholder="Tech stack (comma-separated)" required value={proj.techStack} onChange={e => { const updated = [...regProjects]; updated[idx].techStack = e.target.value; setRegProjects(updated); }} className="rounded-md px-3 py-2 text-xs font-ui focus:outline-none sm-focus md:col-span-2" style={fieldStyle()} />
                            <input type="text" placeholder="What did you build or accomplish?" required value={proj.description} onChange={e => { const updated = [...regProjects]; updated[idx].description = e.target.value; setRegProjects(updated); }} className="rounded-md px-3 py-2 text-xs font-ui focus:outline-none sm-focus md:col-span-3" style={fieldStyle()} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <button type="submit" className="sm-focus w-full font-ui font-semibold py-3 rounded-lg transition" style={{ background: c.inkText, color: c.paper }}>Create account</button>
              </form>
              <p className="text-xs text-center mt-5" style={{ color: c.mutedOnPaper }}>
                Already registered? <span onClick={() => setCurrentView('login')} className="underline cursor-pointer font-semibold" style={{ color: c.stamp }}>Sign in</span>
              </p>
            </PaperCard>
          </div>
        )}

        {currentView === 'candidate' && currentUser && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">

              <PaperCard>
                <h3 className="font-medium text-sm flex items-center gap-2 pb-3 mb-4" style={{ color: c.inkText, borderBottom: `1px solid ${c.paperBorder}` }}>
                  <LayoutDashboard size={16} style={{ color: c.teal }}/> Profile overview
                </h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium" style={{ color: c.mutedOnPaper }}>Name — </span>{currentUser.name}</p>
                  <p><span className="font-medium" style={{ color: c.mutedOnPaper }}>Experience — </span>{currentUser.experience} years</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {currentUser.skills?.map((s, i) => (
                      <span key={i} className="font-data text-[10px] tracking-wide uppercase px-2 py-1 rounded" style={{ background: c.paperRow, border: `1px solid ${c.paperBorder}`, color: c.stamp }}>{s}</span>
                    ))}
                  </div>
                </div>
              </PaperCard>

              <PaperCard>
                <h3 className="font-medium text-sm flex items-center gap-2 pb-3 mb-4" style={{ color: c.inkText, borderBottom: `1px solid ${c.paperBorder}` }}>
                  <Settings size={16} style={{ color: c.stamp }}/> Edit profile
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="font-data text-[10px] tracking-[0.15em] uppercase block mb-1.5" style={{ color: c.mutedOnPaper }}>Skills</label>
                    <input type="text" value={editSkills} onChange={e => setEditSkills(e.target.value)} className="w-full rounded-lg px-3 py-2 text-xs font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                  </div>
                  <div>
                    <label className="font-data text-[10px] tracking-[0.15em] uppercase block mb-1.5" style={{ color: c.mutedOnPaper }}>Experience (yrs)</label>
                    <input type="number" value={editExperience} onChange={e => setEditExperience(parseInt(e.target.value) || 0)} className="w-full rounded-lg px-3 py-2 text-xs font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                  </div>

                  {editExperience > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-data text-[10px] tracking-[0.15em] uppercase" style={{ color: c.mutedOnPaper }}>Work history</span>
                        <button type="button" onClick={() => addCompanyRow(true)} className="sm-focus text-[11px] font-semibold underline" style={{ color: c.stamp }}>+ Add row</button>
                      </div>
                      {editCompanies.map((cm, idx) => (
                        <div key={idx} className="space-y-1.5 p-2.5 rounded-lg" style={{ background: c.paperRow, border: `1px solid ${c.paperBorder}` }}>
                          <input type="text" placeholder="Company name" value={cm.companyName || ''} onChange={e => { const u = [...editCompanies]; u[idx].companyName = e.target.value; setEditCompanies(u); }} className="w-full rounded px-2 py-1 text-[11px] font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                          <input type="text" placeholder="Role title" value={cm.roleTitle || ''} onChange={e => { const u = [...editCompanies]; u[idx].roleTitle = e.target.value; setEditCompanies(u); }} className="w-full rounded px-2 py-1 text-[11px] font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                          <input type="text" placeholder="Description" value={cm.description || ''} onChange={e => { const u = [...editCompanies]; u[idx].description = e.target.value; setEditCompanies(u); }} className="w-full rounded px-2 py-1 text-[11px] font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-data text-[10px] tracking-[0.15em] uppercase" style={{ color: c.mutedOnPaper }}>Projects</span>
                      <button type="button" onClick={() => addProjectRow(true)} className="sm-focus text-[11px] font-semibold underline" style={{ color: c.stamp }}>+ Add row</button>
                    </div>
                    {editProjects.map((p, idx) => (
                      <div key={idx} className="space-y-1.5 p-2.5 rounded-lg" style={{ background: c.paperRow, border: `1px solid ${c.paperBorder}` }}>
                        <input type="text" placeholder="Project title" value={p.title || ''} onChange={e => { const u = [...editProjects]; u[idx].title = e.target.value; setEditProjects(u); }} className="w-full rounded px-2 py-1 text-[11px] font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                        <input type="text" placeholder="Tech stack" value={Array.isArray(p.techStack) ? p.techStack.join(', ') : (p.techStack || '')} onChange={e => { const u = [...editProjects]; u[idx].techStack = e.target.value; setEditProjects(u); }} className="w-full rounded px-2 py-1 text-[11px] font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                        <input type="text" placeholder="Description" value={p.description || ''} onChange={e => { const u = [...editProjects]; u[idx].description = e.target.value; setEditProjects(u); }} className="w-full rounded px-2 py-1 text-[11px] font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                      </div>
                    ))}
                  </div>

                  <button onClick={handleUpdateProfile} className="sm-focus w-full font-ui font-semibold py-2.5 rounded-lg transition mt-3" style={{ background: c.stamp, color: c.offwhite }}>Save changes</button>
                </div>
              </PaperCard>

              <PaperCard>
                <h3 className="font-medium text-sm flex items-center gap-2 pb-3 mb-4" style={{ color: c.inkText, borderBottom: `1px solid ${c.paperBorder}` }}>
                  <ShieldCheck size={16} style={{ color: c.teal }}/> Two-factor authentication
                </h3>
                {!currentUser.isTwoFactorEnabled ? (
                  <div className="space-y-3 text-center">
                    <p className="text-xs text-left leading-relaxed" style={{ color: c.mutedOnPaper }}>Add an extra layer of security using an authenticator app.</p>
                    {!qrCodeUrl ? (
                      <button onClick={setup2FA} className="sm-focus w-full font-ui font-semibold py-2.5 rounded-lg transition" style={{ background: c.teal, color: c.offwhite }}>Enable 2FA</button>
                    ) : (
                      <div className="space-y-3 flex flex-col items-center">
                        <img src={qrCodeUrl} alt="2FA setup QR code" className="rounded-lg w-32 h-32" style={{ border: `4px solid ${c.paper}`, outline: `1px solid ${c.paperBorder}` }} />
                        <input type="text" maxLength="6" placeholder="000000" value={totpToken} onChange={e => setTotpToken(e.target.value)} className="font-data w-full rounded-lg px-3 py-2 text-center tracking-[0.3em] focus:outline-none sm-focus" style={fieldStyle()} />
                        <button onClick={verify2FAToken} className="sm-focus w-full font-ui font-semibold py-2.5 rounded-lg transition" style={{ background: c.teal, color: c.offwhite }}>Confirm & enable</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2" style={{ background: 'rgba(47,111,98,0.12)', border: `1px solid rgba(47,111,98,0.35)`, color: c.teal }}>
                    <CheckCircle2 size={14}/> Two-factor authentication enabled
                  </div>
                )}
              </PaperCard>

              <PaperCard>
                <h3 className="font-medium text-sm flex items-center gap-2 pb-3 mb-4" style={{ color: c.inkText, borderBottom: `1px solid ${c.paperBorder}` }}>
                  <DollarSign size={16} style={{ color: c.stamp }}/> Salary insights
                </h3>
                <form onSubmit={handleSalaryLookup} className="space-y-2.5">
                  <input type="text" placeholder="Job title, e.g. Backend Developer" value={salaryQuery} onChange={e => setSalaryQuery(e.target.value)} className="w-full rounded-lg px-3 py-2 text-xs font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                  <select value={salaryCountry} onChange={e => setSalaryCountry(e.target.value)} className="w-full rounded-lg px-3 py-2 text-xs font-ui focus:outline-none sm-focus" style={fieldStyle()}>
                    <option value="us">United States</option>
                    <option value="in">India</option>
                    <option value="gb">United Kingdom</option>
                    <option value="de">Germany</option>
                    <option value="ca">Canada</option>
                  </select>
                  <button type="submit" disabled={salaryLoading} className="sm-focus w-full font-ui font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2" style={{ background: c.inkText, color: c.paper }}>
                    {salaryLoading ? <Loader2 size={14} className="spin" /> : <Search size={14} />} Check salary range
                  </button>
                </form>
                {salaryError && <p className="text-xs mt-3" style={{ color: c.stamp }}>{salaryError}</p>}
                {salaryResult && (
                  <div className="mt-3 p-3 rounded-lg text-xs font-data" style={{ background: c.paperRow, border: `1px solid ${c.paperBorder}` }}>
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(salaryResult, null, 2)}</pre>
                  </div>
                )}
              </PaperCard>

            </div>

            <div className="lg:col-span-8 space-y-8">
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-2xl font-semibold flex items-center gap-2" style={{ color: c.offwhite }}>
                    <Briefcase size={20} style={{ color: '#E7B4AA' }} /> Recommended for you
                  </h2>
                  <Eyebrow>{recommendations.length} roles scored</Eyebrow>
                </div>

                {recommendations.length === 0 && (
                  <PaperCard>
                    <p className="text-sm" style={{ color: c.mutedOnPaper }}>No matches yet — add a few more skills or projects to your profile so we can score openings against them.</p>
                  </PaperCard>
                )}

                {recommendations.map((job) => (
                  <PaperCard key={job._id} className="flex justify-between items-start gap-5">
                    <div className="min-w-0">
                      <Eyebrow tone="light">{job.sourceWebsite}</Eyebrow>
                      <h4 className="font-display text-xl font-semibold mt-1.5" style={{ color: c.inkText }}>{job.title}</h4>
                      <p className="text-xs font-medium mt-0.5" style={{ color: c.mutedOnPaper }}>{job.company} — {job.location} · requires {job.experienceRequired} yrs</p>
                      <p className="text-sm mt-3 leading-relaxed" style={{ color: '#3D4459' }}>{job.description}</p>
                    </div>
                    <FitStamp score={job.match_score} />
                  </PaperCard>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-2xl font-semibold flex items-center gap-2" style={{ color: c.offwhite }}>
                    <Search size={20} style={{ color: '#E7B4AA' }} /> Search live listings
                  </h2>
                  <Eyebrow>LinkedIn · Indeed · Glassdoor · ZipRecruiter</Eyebrow>
                </div>

                <PaperCard>
                  <form onSubmit={handleExternalSearch} className="flex gap-3">
                    <input type="text" placeholder="e.g. React developer in Austin" value={externalQuery} onChange={e => setExternalQuery(e.target.value)} className="flex-1 rounded-lg px-3.5 py-2.5 text-sm font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                    <button type="submit" disabled={externalLoading} className="sm-focus px-5 rounded-lg font-ui font-semibold text-sm flex items-center gap-2 transition" style={{ background: c.stamp, color: c.offwhite }}>
                      {externalLoading ? <Loader2 size={16} className="spin" /> : <Search size={16} />} Search
                    </button>
                  </form>
                </PaperCard>

                {externalError && (
                  <PaperCard>
                    <p className="text-sm" style={{ color: c.stamp }}>{externalError}</p>
                  </PaperCard>
                )}

                {externalSearched && !externalLoading && !externalError && externalResults.length === 0 && (
                  <PaperCard>
                    <p className="text-sm" style={{ color: c.mutedOnPaper }}>No listings found for that search. Try a broader query.</p>
                  </PaperCard>
                )}

                {externalResults.map((job) => (
                  <PaperCard key={job.externalId} className="flex justify-between items-start gap-5">
                    <div className="min-w-0">
                      <Eyebrow tone="light">{job.source}</Eyebrow>
                      <h4 className="font-display text-xl font-semibold mt-1.5" style={{ color: c.inkText }}>{job.title}</h4>
                      <p className="text-xs font-medium mt-0.5" style={{ color: c.mutedOnPaper }}>{job.company} — {job.location}{job.employmentType ? ` · ${job.employmentType}` : ''}</p>
                      <p className="text-sm mt-3 leading-relaxed line-clamp-4" style={{ color: '#3D4459' }}>{job.description}</p>
                      <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="sm-focus inline-flex items-center gap-1.5 mt-3 text-xs font-semibold underline" style={{ color: c.stamp }}>
                        Apply on {job.source} <ExternalLink size={12} />
                      </a>
                    </div>
                    {job.match_score !== null && job.match_score !== undefined && <FitStamp score={job.match_score} />}
                  </PaperCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentView === 'poster' && currentUser && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
              <PaperCard>
                <h3 className="font-medium text-sm flex items-center gap-2 pb-3 mb-4" style={{ color: c.inkText, borderBottom: `1px solid ${c.paperBorder}` }}>
                  <PlusCircle size={16} style={{ color: c.stamp }}/> Post a job
                </h3>
                <form onSubmit={handleCreateJob} className="space-y-2.5">
                  <input type="text" placeholder="Title" required value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} className="w-full rounded-lg px-3 py-2 text-xs font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                  <input type="text" placeholder="Company" required value={jobForm.company} onChange={e => setJobForm({...jobForm, company: e.target.value})} className="w-full rounded-lg px-3 py-2 text-xs font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                  <input type="text" placeholder="Skills required" required value={jobForm.requiredSkills} onChange={e => setJobForm({...jobForm, requiredSkills: e.target.value})} className="w-full rounded-lg px-3 py-2 text-xs font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                  <input type="number" placeholder="Experience required" required value={jobForm.experienceRequired} onChange={e => setJobForm({...jobForm, experienceRequired: parseInt(e.target.value) || 0})} className="w-full rounded-lg px-3 py-2 text-xs font-ui focus:outline-none sm-focus" style={fieldStyle()} />
                  <textarea placeholder="Job description" required value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} rows="4" className="w-full rounded-lg px-3 py-2 text-xs font-ui focus:outline-none sm-focus resize-none" style={fieldStyle()}></textarea>
                  <button type="submit" className="sm-focus w-full font-ui font-semibold py-2.5 rounded-lg transition" style={{ background: c.stamp, color: c.offwhite }}>Publish job</button>
                </form>
              </PaperCard>

              {inspectingJobId && (
                <PaperCard>
                  <h3 className="font-medium text-sm flex items-center gap-2 pb-3 mb-4" style={{ color: c.inkText, borderBottom: `1px solid ${c.paperBorder}` }}>
                    <Users size={16} style={{ color: c.teal }}/> Top candidates
                  </h3>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {activeJobCandidates.map((cand) => (
                      <div key={cand._id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg" style={{ background: c.paperRow, border: `1px solid ${c.paperBorder}` }}>
                        <div className="min-w-0">
                          <p className="font-medium text-xs truncate" style={{ color: c.inkText }}>{cand.name}</p>
                          <p className="text-[11px]" style={{ color: c.mutedOnPaper }}>{cand.experience} yrs experience</p>
                        </div>
                        <FitStamp score={cand.match_score} size={56} />
                      </div>
                    ))}
                  </div>
                </PaperCard>
              )}
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h2 className="font-display text-2xl font-semibold" style={{ color: c.offwhite }}>Your posted jobs</h2>
              {myPostedJobs.length === 0 && (
                <PaperCard>
                  <p className="text-sm" style={{ color: c.mutedOnPaper }}>Nothing posted yet — publish your first role to start matching candidates.</p>
                </PaperCard>
              )}
              {myPostedJobs.map((job) => (
                <PaperCard key={job._id} className="flex flex-col justify-between">
                  <div>
                    <h4 className="font-display text-lg font-semibold" style={{ color: c.inkText }}>{job.title}</h4>
                    <p className="text-xs font-semibold mb-2" style={{ color: c.stamp }}>{job.company} — {job.location}</p>
                    <p className="text-sm line-clamp-3" style={{ color: '#3D4459' }}>{job.description}</p>
                  </div>
                  <button onClick={() => inspectTopCandidates(job._id)} className="sm-focus mt-4 flex items-center justify-center gap-1.5 w-full font-ui font-semibold py-2 rounded-lg text-xs transition" style={{ background: c.paperRow, border: `1px solid ${c.paperBorder}`, color: c.inkText }}>
                    View best matching candidates <Users size={14}/>
                  </button>
                </PaperCard>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
