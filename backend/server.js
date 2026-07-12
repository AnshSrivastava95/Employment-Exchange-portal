require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { spawn } = require('child_process');

const app = express();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartmatch_ai';
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim());

const JSEARCH_HOST = 'jsearch.p.rapidapi.com';
const JSEARCH_API_KEY = process.env.RAPIDAPI_KEY;

const JOBS_API14_HOST = 'jobs-api14.p.rapidapi.com';
const JOBS_API14_KEY = process.env.JOBS_API14_KEY;

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

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
  twoFactorSecret: { type: String, default: '' },
  isTwoFactorEnabled: { type: Boolean, default: false }
});

const JobSchema = new mongoose.Schema({
  title: String,
  company: String,
  description: String,
  requiredSkills: [String],
  experienceRequired: Number,
  location: { type: String, default: 'Remote' },
  sourceWebsite: { type: String, default: 'SmartMatch Platform' },
  applyUrl: { type: String, default: '' },
  postedBy: String
});

const User = mongoose.model('User', UserSchema);
const Job = mongoose.model('Job', JobSchema);

function runPythonMatchScore(candidate, job) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(process.env.PYTHON_BIN || 'python3', ['./ml_engine/logic.py']);
    let outputData = '';
    let errorData = '';

    pythonProcess.stdin.write(JSON.stringify({ candidate, job }));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('error', (err) => {
      reject(new Error(`Could not start Python process (checked "${process.env.PYTHON_BIN || 'python3'}"): ${err.message}`));
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python process exited with code ${code}: ${errorData || 'no error output'}`));
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
    if (existingUser) return res.status(400).json({ message: 'Email already registered.' });

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
    if (!user) return res.status(400).json({ message: 'No account found with that email.' });

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
      if (err) return res.status(500).json({ error: 'Failed to generate QR code.' });
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
    } else {
      res.status(400).json({ success: false, message: 'Invalid 2FA token.' });
    }
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
      applyUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/apply/internal`
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

app.get('/api/jobs/external-search', async (req, res) => {
  try {
    if (!JSEARCH_API_KEY) {
      return res.status(500).json({ error: 'RAPIDAPI_KEY is not configured on the server.' });
    }

    const { query, country = 'us', date_posted = 'all', candidateId } = req.query;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'A search query is required.' });
    }

    const params = new URLSearchParams({ query, num_pages: '1', country, date_posted });
    const searchRes = await fetch(`https://${JSEARCH_HOST}/search-v2?${params.toString()}`, {
      headers: {
        'x-rapidapi-key': JSEARCH_API_KEY,
        'x-rapidapi-host': JSEARCH_HOST
      }
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      return res.status(searchRes.status).json({ error: `Job search request failed: ${errText}` });
    }

    const payload = await searchRes.json();
    const rawJobs = payload.data?.jobs || payload.data || [];

    let candidateSkills = [];
    if (candidateId) {
      const candidate = await User.findById(candidateId);
      candidateSkills = (candidate?.skills || []).map(s => s.toLowerCase().trim()).filter(Boolean);
    }

    const jobs = rawJobs.map(j => {
      const description = j.job_description || '';
      let matchScore = null;
      if (candidateSkills.length) {
        const descLower = description.toLowerCase();
        const hits = candidateSkills.filter(skill => descLower.includes(skill));
        matchScore = Math.round((hits.length / candidateSkills.length) * 100);
      }
      return {
        externalId: j.job_id,
        title: j.job_title,
        company: j.employer_name,
        description,
        location: j.job_is_remote
          ? 'Remote'
          : [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ') || 'Not specified',
        employmentType: j.job_employment_type || null,
        isRemote: !!j.job_is_remote,
        salaryMin: j.job_min_salary || null,
        salaryMax: j.job_max_salary || null,
        postedAt: j.job_posted_at_datetime_utc || null,
        applyUrl: j.job_apply_link,
        source: j.job_publisher || 'Web',
        match_score: matchScore
      };
    });

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/jobs/salary-insights', async (req, res) => {
  try {
    if (!JOBS_API14_KEY) {
      return res.status(500).json({ error: 'JOBS_API14_KEY is not configured on the server.' });
    }

    const { query, countryCode = 'us' } = req.query;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'A job title is required.' });
    }

    const params = new URLSearchParams({ query, countryCode });
    const salaryRes = await fetch(`https://${JOBS_API14_HOST}/v2/salary/range?${params.toString()}`, {
      headers: {
        'x-rapidapi-key': JOBS_API14_KEY,
        'x-rapidapi-host': JOBS_API14_HOST,
        'Content-Type': 'application/json'
      }
    });

    if (!salaryRes.ok) {
      const errText = await salaryRes.text();
      return res.status(salaryRes.status).json({ error: `Salary lookup failed: ${errText}` });
    }

    const data = await salaryRes.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
