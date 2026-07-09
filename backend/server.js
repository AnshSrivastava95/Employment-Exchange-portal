const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { spawn } = require('child_process');

const app = express();

app.use(cors());
app.use(express.json());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/employment_exchange";

mongoose.connect(mongoURI)
  .then(() => console.log("Database connected successfully!"))
  .catch(err => console.error("Database connection failed:", err));

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

function runPythonMatchScore(candidate, job) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', ['./ml_engine/logic.py']);
    let outputData = '';

    pythonProcess.stdin.write(JSON.stringify({ candidate, job }));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python process exited with error code ${code}`));
      }
      try {
        const parsed = JSON.parse(outputData);
        if (parsed.error) return reject(new Error(parsed.error));
        resolve(parsed.matchScore);
      } catch (e) {
        reject(e);
      }
    });
  });
}

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
    const skillArray = Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []);
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { skills: skillArray, experience, companies, projects },
      { new: true }
    );
    res.json({ success: true, user: updatedUser });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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
    
    const matchedJobs = await Promise.all(allJobs.map(async (job) => {
      const matchScore = await runPythonMatchScore(candidate, job);
      return { ...job.toObject(), match_score: Math.round(matchScore * 100) };
    }));

    matchedJobs.sort((a, b) => b.match_score - a.match_score);
    res.json(matchedJobs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/recommendations/job/:jobId/candidates', async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    const allCandidates = await User.find({ role: 'candidate' });

    const matchedCandidates = await Promise.all(allCandidates.map(async (candidate) => {
      const matchScore = await runPythonMatchScore(candidate, job);
      return { ...candidate.toObject(), match_score: Math.round(matchScore * 100) };
    }));

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

const PORT = process.env.PORT || 5000; 

app.listen(PORT,"0.0.0.0", () => {
    console.log(`Live Deep-Matching AI Pipeline listening on Port ${PORT}`);
});