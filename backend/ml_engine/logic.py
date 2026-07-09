import sys
import json
import math
from collections import Counter

def tokenize_and_clean(text):
    text = text.lower()
    for char in [',', '.', '!', '?', ';', ':', '(', ')', '[', ']', '{', '}', '-', '_', '/', '\\']:
        text = text.replace(char, ' ')
    return [word for word in text.split() if len(word) > 1]

def calculate_deep_ml_match_score(candidate, job):
    required_skills = job.get('requiredSkills', [])
    if not required_skills or len(required_skills) == 0:
        return 1.0

    candidate_skills = candidate.get('skills', []) or []
    candidate_experience = candidate.get('experience', 0) or 0
    
    candidate_parts = [" ".join(candidate_skills)]
    for c in (candidate.get('companies', []) or []):
        candidate_parts.append(f"{c.get('companyName', '')} {c.get('roleTitle', '')} {c.get('description', '')}")
    for p in (candidate.get('projects', []) or []):
        tech_stack = p.get('techStack', []) or []
        candidate_parts.append(f"{p.get('title', '')} {' '.join(tech_stack)} {p.get('description', '')}")
    
    candidate_tokens = tokenize_and_clean(" ".join(candidate_parts))

    job_skills = job.get('requiredSkills', []) or []
    job_parts = [" ".join(job_skills), job.get('title', ''), job.get('description', '')]
    job_tokens = tokenize_and_clean(" ".join(job_parts))

    if not candidate_tokens or not job_tokens:
        return 0.0

    all_words = set(candidate_tokens + job_tokens)
    
    cand_counts = Counter(candidate_tokens)
    job_counts = Counter(job_tokens)
    
    cand_vector = []
    job_vector = []
    
    boosted_skills = set(word.lower() for skill in required_skills for word in tokenize_and_clean(skill))

    for word in all_words:
        cand_tf = cand_counts[word] / len(candidate_tokens)
        job_tf = job_counts[word] / len(job_tokens)
        
        doc_freq = 0
        if word in cand_counts: doc_freq += 1
        if word in job_counts: doc_freq += 1
        idf = math.log(1 + (2 / doc_freq))
        
        cand_val = cand_tf * idf
        job_val = job_tf * idf
        
        if word in boosted_skills:
            cand_val *= 2.5
            job_val *= 2.5
            
        cand_vector.append(cand_val)
        job_vector.append(job_val)

    dot_product = sum(c * j for c, j in zip(cand_vector, job_vector))
    cand_magnitude = math.sqrt(sum(c ** 2 for c in cand_vector))
    job_magnitude = math.sqrt(sum(j ** 2 for j in job_vector))
    
    if cand_magnitude == 0 or job_magnitude == 0:
        cosine_similarity = 0.0
    else:
        cosine_similarity = dot_product / (cand_magnitude * job_magnitude)

    final_score = min(max(cosine_similarity, 0.0), 1.0)

    job_experience_required = job.get('experienceRequired', 0) or 0
    if candidate_experience < job_experience_required:
        final_score *= 0.65

    return final_score

if __name__ == '__main__':
    try:
        input_data = json.loads(sys.stdin.read())
        candidate = input_data.get('candidate', {})
        job = input_data.get('job', {})
        score = calculate_deep_ml_match_score(candidate, job)
        print(json.dumps({"matchScore": score}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)