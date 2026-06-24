import os
import re
import math
from flask import Flask, request, jsonify
from flask_cors import CORS
import nltk

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    nltk.download('punkt_tab', quiet=True)

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing for frontend communication

# ==========================================
# 1. FAQ DATASET
# ==========================================
FAQS = [
    {
        "id": 1,
        "category": "Pricing & Plans",
        "question": "How much does a mobile phone cost?",
        "answer": "Our standard mobile phones start at $399 for the base model. Premium flagship models with advanced features are available from $999 to $1,299. We also offer financing plans with 0% interest over 12 months."
    },
    {
        "id": 2,
        "category": "Pricing & Plans",
        "question": "What is included in the warranty?",
        "answer": "Every mobile phone comes with a 1-year limited warranty covering manufacturing defects and hardware failures. Accidental damage protection can be added for an additional $99, extending coverage to 2 years including liquid damage."
    },
    {
        "id": 3,
        "category": "Pricing & Plans",
        "question": "Do you offer trade-in programs?",
        "answer": "Yes, we accept trade-ins on older devices and provide credit towards new purchases. The value depends on the condition and model of your current phone. Trade-in credit typically ranges from $50 to $500."
    },
    {
        "id": 4,
        "category": "Pricing & Plans",
        "question": "Can I return or exchange my phone?",
        "answer": "We offer a 30-day return or exchange period from the date of purchase. The device must be in original condition with all accessories. Return shipping is free on most models. Refunds are processed within 5-7 business days."
    },
    {
        "id": 5,
        "category": "Features & Specs",
        "question": "What are the main features of the phone?",
        "answer": "Our flagship includes a 6.7-inch OLED display, 5G connectivity, AI-powered camera with computational photography, 12GB RAM, 256GB storage, and a 4500mAh battery with 65W fast charging. IP68 water and dust resistance rated to 50 meters."
    },
    {
        "id": 6,
        "category": "Features & Specs",
        "question": "How is the camera performance?",
        "answer": "The phone features a triple camera system: 48MP main sensor, 12MP ultra-wide, and 12MP telephoto with 3x optical zoom. Night mode uses AI processing for exceptional low-light photography. 8K video recording at 24fps and 4K at 120fps are supported."
    },
    {
        "id": 7,
        "category": "Features & Specs",
        "question": "What is the battery life?",
        "answer": "Battery life depends on usage but typically lasts 18-20 hours on normal use, or up to 3 days in low-power mode. The 4500mAh battery charges to 50% in just 20 minutes with our rapid charger. Wireless charging and reverse wireless charging are both supported."
    },
    {
        "id": 8,
        "category": "Features & Specs",
        "question": "Does it support 5G connectivity?",
        "answer": "Yes, the phone supports all major 5G bands globally. It also includes WiFi 6E, Bluetooth 5.3, NFC for contactless payments, and dual SIM support (physical + eSIM). Download speeds can reach up to 3Gbps on compatible networks."
    },
    {
        "id": 9,
        "category": "Technical Support",
        "question": "What operating system does the phone run?",
        "answer": "The phone runs the latest version of Android with our custom interface overlay. We guarantee 4 years of major OS updates and 5 years of security patches. Regular monthly security updates are provided automatically."
    },
    {
        "id": 10,
        "category": "Technical Support",
        "question": "How do I get technical support?",
        "answer": "Support is available 24/7 through our website chat, email, and phone hotline. We also offer in-store support at our service centers. Premium support includes device replacement within 24 hours and access to technical experts."
    },
    {
        "id": 11,
        "category": "Technical Support",
        "question": "Is the phone water resistant?",
        "answer": "Yes, the phone has an IP68 rating and can withstand submersion in up to 50 meters of water for 30 minutes. While not fully waterproof, it is safe for swimming, snorkeling, and daily splash exposure."
    },
    {
        "id": 12,
        "category": "Sustainability",
        "question": "What is the environmental impact?",
        "answer": "Our devices are made with 40% recycled materials and 100% recyclable packaging. We have a device take-back program that ensures proper recycling and e-waste management. Carbon-neutral shipping is available on all orders."
    },
    {
        "id": 13,
        "category": "Sustainability",
        "question": "How long will the phone receive software updates?",
        "answer": "We provide 4 years of major Android updates and 5 years of security patches. This means devices remain secure and feature-complete far longer than competitors. Extended support options are available for enterprise customers."
    },
    {
        "id": 14,
        "category": "Features & Specs",
        "question": "What is the display quality?",
        "answer": "The 6.7-inch OLED display features a 120Hz refresh rate, 2400x1080 resolution, and HDR10+ support. With AMOLED technology, you get perfect blacks and vibrant colors. Peak brightness reaches 1500 nits in direct sunlight for excellent outdoor visibility."
    },
    {
        "id": 15,
        "category": "Features & Specs",
        "question": "What processor powers the phone?",
        "answer": "The phone uses the latest flagship processor with 8 cores running at up to 3.2 GHz. It delivers exceptional performance for gaming, productivity, and AI tasks. Integrated neural engine handles on-device AI processing. Manufactured on 5nm technology for energy efficiency."
    },
    {
        "id": 16,
        "category": "Features & Specs",
        "question": "What are the storage and RAM options?",
        "answer": "Models are available in 12GB/256GB, 12GB/512GB, and 16GB/1TB configurations. No microSD card slot, but cloud storage integration with 100GB free for 1 year. All models use fast UFS 4.0 storage for rapid app loading and file transfers."
    },
    {
        "id": 17,
        "category": "Features & Specs",
        "question": "What color options are available?",
        "answer": "We offer 6 stunning colors: Midnight Black, Pearl White, Ocean Blue, Forest Green, Sunset Orange, and Titanium Gray. Each uses premium matte glass back with anti-fingerprint coating. Limited edition colors are released seasonally."
    },
    {
        "id": 18,
        "category": "Technical Support",
        "question": "Does the phone have biometric security?",
        "answer": "Yes, the phone features an under-display optical fingerprint sensor and facial recognition with 3D depth sensing. Both are encrypted and stored locally. You can use either method or combine them for enhanced security."
    },
    {
        "id": 19,
        "category": "Features & Specs",
        "question": "What about the speakers and audio?",
        "answer": "Dual stereo speakers with spatial audio technology provide immersive sound. Dolby Atmos support for surround sound. 3.5mm headphone jack is not included, but we include premium wireless earbuds. Exceptional bass and clarity for music and gaming."
    },
    {
        "id": 20,
        "category": "Features & Specs",
        "question": "Is the phone good for gaming?",
        "answer": "Absolutely! The flagship processor, 120Hz display, and dedicated GPU deliver console-like gaming. Vapor cooling system keeps the phone cool during extended play sessions. Touch sampling rate of 720Hz ensures precise game controls."
    },
    {
        "id": 21,
        "category": "Pricing & Plans",
        "question": "What accessories are available?",
        "answer": "We offer official cases, screen protectors, chargers, wireless earbuds, and chargers. Third-party accessories are also widely available. Protective bundles start at $49 and cover all major needs. Accessories come with the same warranty support."
    },
    {
        "id": 22,
        "category": "Technical Support",
        "question": "Can I repair the phone if it breaks?",
        "answer": "Yes, our service centers offer screen replacement, battery replacement, and other repairs. Screen replacements are $199, battery $79. Out-of-warranty repairs are available at higher costs. We use only genuine replacement parts."
    },
    {
        "id": 23,
        "category": "Features & Specs",
        "question": "What are the phone dimensions and weight?",
        "answer": "The phone measures 159.9 x 75.7 x 8.5mm and weighs just 195 grams. Premium aluminum frame with Gorilla Glass Armor on front and back. Extremely slim and lightweight for comfortable one-handed operation."
    },
    {
        "id": 24,
        "category": "Pricing & Plans",
        "question": "Are there discounts for students or seniors?",
        "answer": "We offer 15% discount for verified students with valid ID. Seniors (65+) receive 10% off all purchases. Corporate bulk orders qualify for additional discounts. Military personnel get 20% discount with military ID verification."
    },
    {
        "id": 25,
        "category": "Technical Support",
        "question": "How do I transfer data from my old phone?",
        "answer": "Our Quick Start app automatically transfers contacts, photos, messages, and app data from your old Android device via NFC or WiFi. The process takes 10-15 minutes and supports iOS to Android migration with our Migration assistant app."
    },
    {
        "id": 26,
        "category": "Features & Specs",
        "question": "What security features does it have?",
        "answer": "The phone includes a dedicated security processor for encryption. Regular security updates are pushed monthly. The OS provides app permissions, firewall protection, and malware detection. All user data is encrypted end-to-end."
    },
    {
        "id": 27,
        "category": "Sustainability",
        "question": "Is the phone made with ethical materials?",
        "answer": "Our phones use conflict-free minerals sourced ethically. We partner with Fair Trade organizations for responsible sourcing. Packaging uses 100% recycled cardboard and biodegradable materials. Labor practices meet international standards."
    },
    {
        "id": 28,
        "category": "Pricing & Plans",
        "question": "Can I purchase the phone through a carrier plan?",
        "answer": "Yes, we partner with all major carriers for subsidized pricing with 2-year contracts. Carrier contracts typically offer the phone for $199-$299 with eligible plans. Unlocked versions can be purchased outright or through our website financing."
    },
    {
        "id": 29,
        "category": "Features & Specs",
        "question": "What mobile phone brands and models do you offer?",
        "answer": "We offer a comprehensive range of mobile devices from leading manufacturers worldwide. Popular brands include: Apple iPhone (iPhone 15, iPhone 15 Pro, iPhone 15 Max), Samsung Galaxy (S24, S24+, Z Fold 6, Z Flip 6), Google Pixel (Pixel 9, Pixel 9 Pro, Pixel 9 XL), OnePlus (12, Open), Nothing (Phone 2), Motorola (Edge 50 Pro, Razr 50), Sony Xperia (1 VI, 5 VI), OPPO (Find X7, Reno 12), Vivo (X100, Y200), Xiaomi (14 Ultra, Mix Fold 4), Nokia (G100, C110), Realme (GT 6), Poco (X6 Pro), iQOO (12, Fold 1), Nubia (Z60 Ultra), ZTE, and Huawei models. We stock both flagship and budget-friendly options to suit every customer's needs and budget. Contact us for current inventory and exclusive regional availability."
    }
]

# Fallback stopwords for security violations
BUILTIN_STOPWORDS = set([
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", 
    "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself", 
    "it", "its", "itself", "they", "them", "their", "theirs", "themselves", "what", "which", 
    "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", 
    "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", 
    "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", 
    "for", "with", "about", "against", "between", "into", "through", "during", "before", 
    "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", 
    "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", 
    "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", 
    "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", 
    "will", "just", "don", "should", "now", "would", "could", "should", "get"
])

# ==========================================
# 2. NLP ENGINE SETUP (NLTK/sklearn with Fallback)
# ==========================================

# Try importing NLTK libraries
try:
    import nltk
    from nltk.tokenize import word_tokenize
    from nltk.corpus import stopwords
    from nltk.stem import PorterStemmer

    # Download required datasets if they aren't available
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt', quiet=True)

    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords', quiet=True)

    NLTK_AVAILABLE = True
    stemmer = PorterStemmer()
    
    # Try to load stopwords, fallback to builtin if security violation occurs
    try:
        english_stopwords = set(stopwords.words('english'))
    except (ValueError, OSError):
        print("NLP Setup: Using fallback stopwords (NLTK security restriction)")
        english_stopwords = BUILTIN_STOPWORDS
    
    print("NLP Setup: NLTK is available.")
except ImportError:
    NLTK_AVAILABLE = False
    print("NLP Warning: NLTK not found. Using built-in fallback NLP engine.")

# Try importing scikit-learn
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np
    SKLEARN_AVAILABLE = True
    print("NLP Setup: scikit-learn is available.")
except ImportError:
    SKLEARN_AVAILABLE = False
    print("NLP Warning: scikit-learn not found. Using built-in TF-IDF & Cosine Similarity.")

def fallback_tokenize(text):
    return re.findall(r'\b\w+\b', text.lower())

def fallback_stem(word):
    word = word.lower()
    if len(word) <= 2:
        return word
    if word.endswith('sses'):
        word = word[:-2]
    elif word.endswith('ies'):
        word = word[:-3] + 'i'
    elif word.endswith('ss'):
        pass
    elif word.endswith('s') and not word.endswith('us') and not word.endswith('is') and not word.endswith('as'):
        word = word[:-1]
    
    if word.endswith('eed'):
        word = word[:-1]
    elif word.endswith('ing'):
        word = word[:-3]
        if word.endswith('at') or word.endswith('bl') or word.endswith('iz'):
            word = word + 'e'
    elif word.endswith('ed'):
        word = word[:-2]
    elif word.endswith('y') and len(word) > 3:
        word = word[:-1] + 'i'
    return word

def preprocess_text(text):
    if NLTK_AVAILABLE:
        tokens = word_tokenize(text.lower())
        tokens = [t for t in tokens if t.isalnum()]
        cleaned = [t for t in tokens if t not in english_stopwords]
        stemmed = [stemmer.stem(t) for t in cleaned]
    else:
        tokens = fallback_tokenize(text)
        cleaned = [t for t in tokens if t not in BUILTIN_STOPWORDS]
        stemmed = [fallback_stem(t) for t in cleaned]
    return {
        "tokens": tokens,
        "cleaned": cleaned,
        "stemmed": stemmed
    }

# ==========================================
# 3. TF-IDF & COSINE SIMILARITY ENGINE
# ==========================================
class CustomTFIDF:
    def __init__(self, corpus_stems):
        self.vocabulary = list(set([word for doc in corpus_stems for word in doc]))
        self.vocab_idx = {word: i for i, word in enumerate(self.vocabulary)}
        self.N = len(corpus_stems)
        self.idfs = {}
        for word in self.vocabulary:
            df = sum(1 for doc in corpus_stems if word in doc)
            self.idfs[word] = math.log(1 + (self.N / (df + 1))) + 1.0
            
    def vectorize(self, doc_stems):
        vector = [0.0] * len(self.vocabulary)
        if not doc_stems:
            return vector
        tfs = {}
        for word in doc_stems:
            tfs[word] = tfs.get(word, 0) + 1
        max_tf = max(tfs.values()) if tfs else 1
        for word, count in tfs.items():
            if word in self.vocab_idx:
                idx = self.vocab_idx[word]
                tf = count / max_tf
                vector[idx] = tf * self.idfs[word]
        return vector

def custom_cosine_similarity(vecA, vecB):
    dot_product = sum(a * b for a, b in zip(vecA, vecB))
    magnitude_A = math.sqrt(sum(a * a for a in vecA))
    magnitude_B = math.sqrt(sum(b * b for b in vecB))
    if magnitude_A == 0.0 or magnitude_B == 0.0:
        return 0.0
    return dot_product / (magnitude_A * magnitude_B)

# Precompute FAQ vectors
FAQ_PREPROCESSED = []
for faq in FAQS:
    prep = preprocess_text(faq["question"])
    FAQ_PREPROCESSED.append({
        "faq": faq,
        "stems": prep["stemmed"],
        "tokens": prep["tokens"],
        "cleaned": prep["cleaned"]
    })

if SKLEARN_AVAILABLE:
    corpus_sentences = [" ".join(x["stems"]) for x in FAQ_PREPROCESSED]
    vectorizer = TfidfVectorizer(token_pattern=r'(?u)\b\w+\b')
    if corpus_sentences and any(corpus_sentences):
        faq_vectors = vectorizer.fit_transform(corpus_sentences)
    else:
        faq_vectors = None
else:
    custom_tfidf = CustomTFIDF([x["stems"] for x in FAQ_PREPROCESSED])
    faq_vectors = [custom_tfidf.vectorize(x["stems"]) for x in FAQ_PREPROCESSED]

# ==========================================
# 4. BOT ROUTER & API ENDPOINTS
# ==========================================
@app.route('/api/faqs', methods=['GET'])
def get_faqs():
    return jsonify(FAQS)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json() or {}
    user_query = data.get('message', '').strip()
    
    if not user_query:
        return jsonify({
            "answer": "I didn't receive any input. Please ask me a question about Astraea Space!",
            "matched_question": "",
            "score": 0.0,
            "debug": {
                "tokens": [],
                "cleaned": [],
                "stemmed": [],
                "scores": []
            }
        })
        
    prep_query = preprocess_text(user_query)
    query_stems = prep_query["stemmed"]
    scores = []
    
    # Calculate similarities
    if SKLEARN_AVAILABLE:
        query_str = " ".join(query_stems)
        if faq_vectors is not None and query_stems:
            try:
                query_vec = vectorizer.transform([query_str])
                sims = cosine_similarity(query_vec, faq_vectors).flatten()
                for i, faq_data in enumerate(FAQ_PREPROCESSED):
                    scores.append({
                        "id": faq_data["faq"]["id"],
                        "question": faq_data["faq"]["question"],
                        "score": float(sims[i])
                    })
            except Exception as e:
                print(f"Sklearn Error: {e}, falling back to custom math")
                temp_custom = CustomTFIDF([x["stems"] for x in FAQ_PREPROCESSED])
                q_vec = temp_custom.vectorize(query_stems)
                for i, faq_data in enumerate(FAQ_PREPROCESSED):
                    f_vec = temp_custom.vectorize(faq_data["stems"])
                    score = custom_cosine_similarity(q_vec, f_vec)
                    scores.append({
                        "id": faq_data["faq"]["id"],
                        "question": faq_data["faq"]["question"],
                        "score": score
                    })
        else:
            for faq_data in FAQ_PREPROCESSED:
                scores.append({
                    "id": faq_data["faq"]["id"],
                    "question": faq_data["faq"]["question"],
                    "score": 0.0
                })
    else:
        q_vec = custom_tfidf.vectorize(query_stems)
        for i, faq_data in enumerate(FAQ_PREPROCESSED):
            f_vec = faq_vectors[i]
            score = custom_cosine_similarity(q_vec, f_vec)
            scores.append({
                "id": faq_data["faq"]["id"],
                "question": faq_data["faq"]["question"],
                "score": score
            })
            
    scores.sort(key=lambda x: x["score"], reverse=True)
    
    best_match = None
    similarity_threshold = 0.20
    
    if scores and scores[0]["score"] >= similarity_threshold:
        best_match = scores[0]
        matched_faq = next((f for f in FAQS if f["id"] == best_match["id"]), None)
        answer = matched_faq["answer"] if matched_faq else "No answer found."
        matched_question = best_match["question"]
        score_val = best_match["score"]
    else:
        answer = "I'm sorry, I couldn't find a direct match for your question in our system. Let me check with our support databases or try rephrasing. Here are some topics that might be related:"
        matched_question = "None (No match above threshold)"
        score_val = scores[0]["score"] if scores else 0.0

    return jsonify({
        "answer": answer,
        "matched_question": matched_question,
        "score": score_val,
        "debug": {
            "tokens": prep_query["tokens"],
            "cleaned": prep_query["cleaned"],
            "stemmed": prep_query["stemmed"],
            "scores": scores,
            "engine": "NLTK + scikit-learn" if (NLTK_AVAILABLE and SKLEARN_AVAILABLE) else "Built-in Light NLP Engine"
        }
    })

# Serve static files
@app.route('/')
def index():
    return open('index.html', 'r', encoding='utf-8').read(), 200, {'Content-Type': 'text/html; charset=utf-8'}

@app.route('/<path:filename>')
def serve_static(filename):
    if filename.endswith('.css'):
        return open(filename, 'r', encoding='utf-8').read(), 200, {'Content-Type': 'text/css; charset=utf-8'}
    elif filename.endswith('.js'):
        return open(filename, 'r', encoding='utf-8').read(), 200, {'Content-Type': 'application/javascript; charset=utf-8'}
    else:
        return open(filename, 'r', encoding='utf-8').read(), 200, {'Content-Type': 'text/plain; charset=utf-8'}

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
