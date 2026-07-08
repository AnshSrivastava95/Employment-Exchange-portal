const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const natural = require('natural');

const app = express();

// Explicit CORS implementation to avoid preflight browser block errors
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const MONGO_URI = 'mongodb://127.0.0.1:27017/smartmatch_ai'; 
mongoose.connect(MONGO_URI)
  .then(() => console.log("💾 Advanced ML Engine & DB Connected Successfully!"))
  .catch(err => console.error("MongoDB connection error:", err));

// Database Schemas Supporting Projects, Multi-Company Work History, and 2FA
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  role: { type: String, enum: ['candidate', 'poster'], required: true },
  skills: [String],
  experience: { type: Number, default: 0 },
  companies: [{
    companyName: String,
    roleTitle: String,
    duration: String,
    description: String
  }],
  projects: [{
    title: String,
    techStack: [String],
    description: String
  }],
  twoFactorSecret: { type: String, default: "" },
  isTwoFactorEnabled: { type: Boolean, default: false }
});

const JobSchema = new mongoose.Schema({
  title: String,
  company: String,
  description: String,
  requiredSkills: [String],
  experienceRequired: Number,
  location: { type: String, default: "Remote" },
  sourceWebsite: { type: String, default: "SmartMatch Platform" }, 
  applyUrl: { type: String, default: "" }, 
  postedBy: String 
});

const User = mongoose.model('User', UserSchema);
const Job = mongoose.model('Job', JobSchema);

// Deep Vectorization ML Match Engine (TF-IDF Processing)
function calculateDeepMLMatchScore(candidate, job) {
  if (!job.requiredSkills || !job.requiredSkills.length) return 1.0;
  
  // 1. Build a rich textual profile representation of the candidate
  let candidateCorpus = `${(candidate.skills || []).join(' ')} `;
  candidateCorpus += `${candidate.experience} years engineering experience. `;
  
  if (candidate.companies && candidate.companies.length) {
    candidate.companies.forEach(c => {
      candidateCorpus += `${c.companyName} ${c.roleTitle} ${c.description} `;
    });
  }
  
  if (candidate.projects && candidate.projects.length) {
    candidate.projects.forEach(p => {
      candidateCorpus += `${p.title} ${(p.techStack || []).join(' ')} ${p.description} `;
    });
  }

  // 2. Build a clear textual definition of the target job
  const jobCorpus = `
    ${(job.requiredSkills || []).join(' ')} 
    ${job.title || ''} 
    ${job.description || ''}
  `.toLowerCase();

  const tfidf = new natural.TfIdf();
  tfidf.addDocument(jobCorpus);

  let rawScore = 0;
  tfidf.tfidfs(candidateCorpus.toLowerCase(), function(i, measure) {
    rawScore += measure;
  });

  let finalScore = Math.min(Math.max(rawScore / 4, 0), 1);

  // Exact Penalty for Experience Deficit
  if (candidate.experience < job.experienceRequired) {
    finalScore *= 0.65;
  }

  return finalScore;
}

// REST Endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, role, skills, experience, companies, projects } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered." });
    
    const skillArray = skills ? skills.split(',').map(s => s.trim()) : [];
    const newUser = new User({ 
      name, email, role, 
      skills: skillArray, 
      experience: experience || 0,
      companies: companies || [],
      projects: projects || []
    });
    await newUser.save();
    res.status(201).json({ success: true, user: newUser });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User profile context not found." });
    
    if (user.isTwoFactorEnabled) {
      return res.json({ requires2FA: true, userId: user._id, role: user.role });
    }
    res.json({ requires2FA: false, user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/update-profile', async (req, res) => {
  try {
    const { userId, skills, experience, companies, projects } = req.body;
    
    // Explicit Backend Type Guards to ensure Array formats pass correctly into Mongo
    const skillArray = Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []);
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { skills: skillArray, experience, companies, projects },
      { new: true }
    );
    res.json({ success: true, user: updatedUser });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Two-Factor Setup & Verification Handlers
app.post('/api/auth/2fa/setup', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    const secret = speakeasy.generateSecret({ name: `SmartMatch Pro (${user.email})` });
    user.twoFactorSecret = secret.base32;
    await user.save();
    
    qrcode.toDataURL(secret.otpauth_url, (err, dataUrl) => {
      if (err) return res.status(500).json({ error: "QR Token Generation Failure" });
      res.json({ qrCodeUrl: dataUrl });
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/2fa/verify', async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId);
    const verified = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token, window: 1 });
    if (verified) {
      user.isTwoFactorEnabled = true;
      await user.save();
      res.json({ success: true, user });
    } else { res.status(400).json({ success: false, message: "Invalid 2FA verification token." }); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/recommendations/candidate/:userId', async (req, res) => {
  try {
    const candidate = await User.findById(req.params.userId);
    const allJobs = await Job.find();
    
    const matchedJobs = allJobs.map(job => {
      const matchScore = calculateDeepMLMatchScore(candidate, job);
      return { ...job.toObject(), match_score: Math.round(matchScore * 100) };
    });

    matchedJobs.sort((a, b) => b.match_score - a.match_score);
    res.json(matchedJobs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/recommendations/job/:jobId/candidates', async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    const allCandidates = await User.find({ role: 'candidate' });

    const matchedCandidates = allCandidates.map(candidate => {
      const matchScore = calculateDeepMLMatchScore(candidate, job);
      return { ...candidate.toObject(), match_score: Math.round(matchScore * 100) };
    });

    matchedCandidates.sort((a, b) => b.match_score - a.match_score);
    res.json(matchedCandidates);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/jobs', async (req, res) => {
  try {
    const { title, company, description, requiredSkills, experienceRequired, location, postedBy } = req.body;
    const skillArray = Array.isArray(requiredSkills) ? requiredSkills : requiredSkills.split(',').map(s => s.trim());
    
    const newJob = new Job({ 
      title, company, description, requiredSkills: skillArray, experienceRequired, location, postedBy,
      applyUrl: "http://localhost:5173/apply/internal" 
    });
    await newJob.save();
    res.status(201).json(newJob);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/jobs/posted/:posterId', async (req, res) => {
  try {
    const activePostedJobs = await Job.find({ postedBy: req.params.posterId });
    res.json(activePostedJobs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(5000, () => console.log("Live Deep-Matching AI Pipeline listening on Port 5000"));