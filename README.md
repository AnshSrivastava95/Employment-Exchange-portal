# SmartMatch ML Network

An advanced, asymmetric bidirectional content-based filtering recommendation engine designed to optimize automated recruitment matching. Built natively on a single-language runtime stack (MongoDB, Express, React, Node.js), this platform replaces traditional keyword-matching ATS flaws with real-time NLP tokenization vectors and statistical scoring.

## ?? Core Features
* **Asymmetric Content-Based Recommendation Engine:** Utilizes Natural Language Processing (NLP) and TF-IDF parsing vectors to match candidate profiles directly to explicit job thresholds without penalizing candidates for possessing alternative/extra skills.
* **Dynamic Bidirectional Sorting:** Operates a dual-sided pipeline—instantly sorting and ranking top-tier candidate profiles for recruiters, while simultaneously serving candidates job vacancies sorted by match likelihood.
* **Heuristic Tenure Evaluation:** Features an automated experience validator that seamlessly applies ranking modifiers (30% adjustment) for experience discrepancies.
* **Cryptographic User Gating (2FA):** Implements zero-trust Time-based One-Time Password (TOTP) verification using secure base32 secrets and dynamic automated QR-code graphic streaming.
* **Platform Interoperability & Aggregator Hub:** Ingests external multi-website listings (LinkedIn, Indeed, ZipRecruiter) into a unified internal data schema, while exposing an automated outbound public syndication feed for external search indexers.

## ??? Tech Stack
* **Frontend:** React, Axios, Tailwind CSS
* **Backend:** Node.js, Express.js, Natural (NLP Engine), Speakeasy, QRCode
* **Database:** MongoDB / Mongoose Object Schemas
