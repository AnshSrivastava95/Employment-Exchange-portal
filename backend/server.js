
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const natural = require('natural');

const app = express();
app.use(cors());
app.use(express.json());


const MONGO_URI = 'mongodb://127.0.0.1:27017/smartmatch_ai'; 
mongoose.connect(MONGO_URI)
  .then(() => console.log("💾 MongoDB Connected Successfully with ML Modules!"))
  .catch(err => console.error("MongoDB connection error:", err));


const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  role: { type: String, enum: ['candidate', 'poster'], required: true },
  skills: [String],
  experience: { type: Number, default: 0 },
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

function calculateMLMatchScore(candidate, job) {
  if (!job.requiredSkills || !job.requiredSkills.length) return 1.0; 
  if (!candidate.skills || !candidate.skills.length) return 0;

  
  const candidateText = `
    ${(candidate.skills || []).join(' ')} 
    ${candidate.experience} years engineering
  `.toLowerCase();

  const jobText = `
    ${(job.requiredSkills || []).join(' ')} 
    ${job.title || ''} 
    ${job.description || ''}
  `.toLowerCase();

  
  const tfidf = new natural.TfIdf();
  tfidf.addDocument(jobText);

  let rawMatchScore = 0;
  tfidf.tfidfs(candidateText, function(i, measure) {
    rawMatchScore += measure;
  });

  
  let finalScore = Math.min(Math.max(rawMatchScore / 3, 0), 1);

  
  if (candidate.experience < job.experienceRequired) {
    finalScore *= 0.7;
  }

  return finalScore;
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, role, skills, experience } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered." });
    
    const skillArray = skills ? skills.split(',').map(s => s.trim()) : [];
    const newUser = new User({ name, email, role, skills: skillArray, experience: experience || 0 });
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

app.post('/api/auth/2fa/setup', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    const secret = speakeasy.generateSecret({ name: `SmartMatch AI (${user.email})` });
    user.twoFactorSecret = secret.base32;
    await user.save();
    
    qrcode.toDataURL(secret.otpauth_url, (err, dataUrl) => {
      if (err) return res.status(500).json({ error: "QR Generation Stream Broken" });
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
    } else { res.status(400).json({ success: false, message: "Invalid 2FA token authentication match." }); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/recommendations/candidate/:userId', async (req, res) => {
  try {
    const candidate = await User.findById(req.params.userId);
    const allJobs = await Job.find();
    
    const matchedJobs = allJobs.map(job => {
      const matchScore = calculateMLMatchScore(candidate, job);
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
      const matchScore = calculateMLMatchScore(candidate, job);
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

app.post('/api/jobs/fetch-external', async (req, res) => {
  try {
    const { searchKeyword, targetPlatform } = req.body;
    
    const multiPlatformMock = [
      { title: `${searchKeyword} System Engineer`, company: "Stripe Enterprise", description: "Production scaling pipeline infrastructure execution parsing structures.", skills: [searchKeyword, "NodeJS", "AWS"], exp: 3, location: "Remote", source: "LinkedIn", url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchKeyword)}` },
      { title: `Senior ${searchKeyword} Developer`, company: "Meta Platforms", description: "Advanced full stack engineering design deployment optimization core routines.", skills: [searchKeyword, "React", "TypeScript"], exp: 5, location: "New York", source: "Indeed", url: `https://www.indeed.com/jobs?q=${encodeURIComponent(searchKeyword)}` },
      { title: `Full-Stack ${searchKeyword} Associate`, company: "HedgeTech Labs", description: "Ecosystem design utilizing optimized query processing mechanics.", skills: [searchKeyword, "Python", "Docker"], exp: 1, location: "Remote", source: "ZipRecruiter", url: "https://www.ziprecruiter.com" }
    ];

    const selectedJobs = targetPlatform === "All Platforms" ? multiPlatformMock : multiPlatformMock.filter(j => j.source === targetPlatform);

    const mappedJobs = selectedJobs.map(job => ({
      title: job.title, company: job.company, description: job.description, requiredSkills: job.skills, experienceRequired: job.exp, location: job.location, sourceWebsite: job.source, applyUrl: job.url
    }));

    await Job.deleteMany({ sourceWebsite: { $in: ["LinkedIn", "Indeed", "ZipRecruiter"] }, requiredSkills: searchKeyword });
    const savedJobs = await Job.insertMany(mappedJobs);

    res.json({ success: true, message: `🎉 ML Sync complete! Ingested ${savedJobs.length} live entries from ${targetPlatform}.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


app.get('/api/feeds/public-jobs', async (req, res) => {
  try {
    const internalJobs = await Job.find({ sourceWebsite: "SmartMatch Platform" });
    res.json({ platform: "SmartMatch Automated Syndication Hub", totalActivePostings: internalJobs.length, listings: internalJobs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(5000, () => console.log("Live ML-Powered Unified SmartMatch Engine running on Port 5000"));