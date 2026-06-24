/**
 * ASTRAEA SPACE TRAVEL FAQ SYSTEM - FRONTEND MANAGER
 * Handles Chat UI, API integrations, and local JS-NLP simulation fallback.
 */

const API_BASE = "http://127.0.0.1:5000/api";
let faqDataset = [];
let localEngineActive = false;

// Elements
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const faqDirectoryList = document.getElementById("faqDirectoryList");
const quickSuggestContainer = document.getElementById("quickSuggestContainer");

// Debug elements
const debugEngine = document.getElementById("debugEngine");
const stepRaw = document.getElementById("stepRaw");
const stepTokens = document.getElementById("stepTokens");
const stepClean = document.getElementById("stepClean");
const stepStemmed = document.getElementById("stepStemmed");
const debugScoresBody = document.getElementById("debugScoresBody");
const vectorDetails = document.getElementById("vectorDetails");

// Local Preprocessing Stopwords
const JS_STOPWORDS = new Set([
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
]);

// Simple suffix stripping stemmer in JavaScript
function jsStem(word) {
    word = word.toLowerCase().trim();
    if (word.length <= 2) return word;
    if (word.endsWith('sses')) word = word.slice(0, -2);
    else if (word.endsWith('ies')) word = word.slice(0, -3) + 'i';
    else if (word.endsWith('s') && !word.endsWith('us') && !word.endsWith('is') && !word.endsWith('as')) word = word.slice(0, -1);
    
    if (word.endsWith('eed')) word = word.slice(0, -1);
    else if (word.endsWith('ing')) {
        word = word.slice(0, -3);
        if (word.endsWith('at') || word.endsWith('bl') || word.endsWith('iz')) word += 'e';
    }
    else if (word.endsWith('ed')) word = word.slice(0, -2);
    else if (word.endsWith('y') && word.length > 3) word = word.slice(0, -1) + 'i';
    return word;
}

// Tokenize text into words
function jsTokenize(text) {
    return text.toLowerCase().match(/\b\w+\b/g) || [];
}

// Preprocess query using pure JS
function jsPreprocess(text) {
    const tokens = jsTokenize(text);
    const cleaned = tokens.filter(t => !JS_STOPWORDS.has(t));
    const stemmed = cleaned.map(t => jsStem(t));
    return { tokens, cleaned, stemmed };
}

// Custom TF-IDF similarity in JavaScript
class LocalSimilarityMatcher {
    constructor(faqs) {
        this.faqs = faqs;
        // Preprocess all questions
        this.processedCorpus = faqs.map(faq => ({
            faq,
            prep: jsPreprocess(faq.question)
        }));
        
        // Build vocabulary and IDF mapping
        const allStems = this.processedCorpus.flatMap(d => d.prep.stemmed);
        this.vocabulary = [...new Set(allStems)];
        this.vocabIdx = {};
        this.vocabulary.forEach((word, idx) => { this.vocabIdx[word] = idx; });
        
        this.N = faqs.length;
        this.idfs = {};
        this.vocabulary.forEach(word => {
            const df = this.processedCorpus.filter(doc => doc.prep.stemmed.includes(word)).length;
            this.idfs[word] = Math.log(1 + (this.N / (df + 1))) + 1.0;
        });
    }

    vectorize(stems) {
        const vector = new Array(this.vocabulary.length).fill(0.0);
        if (stems.length === 0) return vector;
        
        const tfs = {};
        stems.forEach(word => { tfs[word] = (tfs[word] || 0) + 1; });
        const maxTf = Math.max(...Object.values(tfs));
        
        Object.entries(tfs).forEach(([word, count]) => {
            if (word in this.vocabIdx) {
                const idx = this.vocabIdx[word];
                const tf = count / maxTf;
                vector[idx] = tf * this.idfs[word];
            }
        });
        return vector;
    }

    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0.0;
        let sumSqA = 0.0;
        let sumSqB = 0.0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            sumSqA += vecA[i] * vecA[i];
            sumSqB += vecB[i] * vecB[i];
        }
        const magA = Math.sqrt(sumSqA);
        const magB = Math.sqrt(sumSqB);
        if (magA === 0 || magB === 0) return 0.0;
        return dotProduct / (magA * magB);
    }

    match(queryText) {
        const prepQuery = jsPreprocess(queryText);
        const qVec = this.vectorize(prepQuery.stemmed);
        
        const scores = this.processedCorpus.map(doc => {
            const docVec = this.vectorize(doc.prep.stemmed);
            const score = this.cosineSimilarity(qVec, docVec);
            return {
                id: doc.faq.id,
                question: doc.faq.question,
                score: score
            };
        });
        
        scores.sort((a, b) => b.score - a.score);
        
        const bestScore = scores[0]?.score || 0.0;
        let answer = "";
        let matchedQuestion = "";
        
        if (bestScore >= 0.20) {
            const bestFaq = this.faqs.find(f => f.id === scores[0].id);
            answer = bestFaq.answer;
            matchedQuestion = bestFaq.question;
        } else {
            answer = "I'm sorry, I couldn't find a direct match for your question in our system. Let me check with our support databases or try rephrasing. Here are some topics that might be related:";
            matchedQuestion = "None (No match above threshold)";
        }

        return {
            answer,
            matched_question: matchedQuestion,
            score: bestScore,
            debug: {
                tokens: prepQuery.tokens,
                cleaned: prepQuery.cleaned,
                stemmed: prepQuery.stemmed,
                scores: scores,
                engine: "Built-in Browser NLP Engine (Backend Offline)"
            }
        };
    }
}

let localMatcher = null;

// ==========================================
// FAQ STATIC DATAPACK (For client simulation fallback)
// ==========================================
const LOCAL_FAQS = [
    {
        id: 1,
        category: "Booking & Travel",
        question: "How much does a ticket to Mars cost?",
        answer: "A standard economy ticket on our Starship class vessels starts at $250,000. This price includes pre-flight training, habitat lodging on Mars, and a 100kg luggage allowance. Luxury suites are available for $750,000."
    },
    {
        id: 2,
        category: "Booking & Travel",
        question: "How long is the journey to Mars?",
        answer: "The journey typically takes between 6 to 8 months, depending on orbital alignment. We launch exclusively during the Hohmann transfer window, which opens once every 26 months when Earth and Mars are closest."
    },
    {
        id: 3,
        category: "Booking & Travel",
        question: "What is the baggage limit for Mars flights?",
        answer: "Passengers are allowed up to 100 kg of personal luggage. Extra baggage is charged at $500 per kg due to strict weight-to-fuel ratio limits. Cargo is shipped 12 months ahead of passenger departures."
    },
    {
        id: 4,
        category: "Booking & Travel",
        question: "Can I cancel or reschedule my flight to Mars?",
        answer: "Yes, flights can be rescheduled to a future launch window up to 6 months before departure. Cancellations are subject to a 15% booking fee to cover mandatory pre-departure training and medical examinations."
    },
    {
        id: 5,
        category: "Life on Mars",
        question: "Where will I live on Mars?",
        answer: "Citizens live in the Astraea Prime colony dome. The dome features pressurized biosphere habitats, advanced solar-radiation shielding, subterranean parks, climate control, and simulated 1.0G gravity workout zones."
    },
    {
        id: 6,
        category: "Life on Mars",
        question: "What do people eat on Mars?",
        answer: "Our hydroponic and aeroponic farms produce fresh vegetables, fruits, and grains. Cultured cell proteins (synthetic meat) are grown in labs. Specialty gourmet earth foods are imported, though they are expensive due to shipping costs."
    },
    {
        id: 7,
        category: "Life on Mars",
        question: "Is there internet access on Mars?",
        answer: "Yes, we have AresNet, a high-speed satellite network. However, communicating with Earth has a speed-of-light delay ranging from 4 to 24 minutes depending on orbital positions. Direct video calls are impossible; email, chat, and offline content sync are standard."
    },
    {
        id: 8,
        category: "Life on Mars",
        question: "What is the gravity like on Mars?",
        answer: "Mars gravity is approximately 38% of Earth's gravity (0.38G). While moving around feels light and bouncy, residents must perform 2 hours of resistance exercise daily to prevent muscle atrophy and bone density loss."
    },
    {
        id: 9,
        category: "Requirements & Training",
        question: "What are the health requirements for space travel?",
        answer: "All travelers must pass a comprehensive health evaluation, including cardiovascular stress tests, bone density scans, and psychological evaluations. Individuals with chronic cardiovascular conditions are generally restricted from long flights."
    },
    {
        id: 10,
        category: "Requirements & Training",
        question: "How long is the pre-flight training?",
        answer: "Pre-flight training is a mandatory 8-week program held at our high-altitude training center in Utah. The curriculum covers high-G centrifuge training, emergency habitat depressurization drills, spacesuit operations, and zero-G simulations."
    },
    {
        id: 11,
        category: "Requirements & Training",
        question: "Is there an age limit for Mars colonists?",
        answer: "Applicants must be at least 18 years old. There is no strict upper age limit, provided the candidate passes all medical fitness, psychological resilience, and pre-departure physical stamina benchmarks."
    },
    {
        id: 12,
        category: "Safety & Health",
        question: "What happens in case of a solar flare?",
        answer: "Both our spaceships and Mars habitats contain water-shielded solar storm shelters. In the event of an incoming solar particle event (SPE), alarms will trigger, and residents are required to stay in the shelter until radiation levels return to safe baselines (usually 12-36 hours)."
    },
    {
        id: 13,
        category: "Safety & Health",
        question: "Is medical care available on Mars?",
        answer: "Astraea Prime has a fully equipped medical clinic and trauma center. It is staffed by medical professionals and a state-of-the-art medical AI system capable of automated diagnostics, pharmacy formulation, and remote surgery assistance."
    }
];

// Initialise App
async function initApp() {
    appendBotMessage("Welcome! I'm the Product Support AI assistant. Ask me anything about our mobile phones - pricing, features, specifications, warranty, technical support, or sustainability initiatives.");
    
    // Set up clear chat
    clearChatBtn.addEventListener("click", () => {
        chatMessages.innerHTML = "";
        appendBotMessage("Core systems cleared. Ask me any question to begin mapping similarities.");
        resetDebugConsole();
    });

    // Load FAQs
    try {
        const response = await fetch(`${API_BASE}/faqs`);
        if (!response.ok) throw new Error("Backend response error");
        faqDataset = await response.json();
        console.log("Successfully connected to Python backend!");
        localEngineActive = false;
    } catch (err) {
        console.warn("Backend server connection failed. Defaulting to local JS-NLP engine simulation.", err);
        faqDataset = LOCAL_FAQS;
        localEngineActive = true;
        localMatcher = new LocalSimilarityMatcher(faqDataset);
    }
    
    renderFAQDirectory("all");
    setupCategoryFilters();
    renderQuickSuggests();
}

// Renders directories in the sidebar
function renderFAQDirectory(categoryFilter = "all") {
    faqDirectoryList.innerHTML = "";
    const filtered = categoryFilter === "all" 
        ? faqDataset 
        : faqDataset.filter(faq => faq.category === categoryFilter);

    if (filtered.length === 0) {
        faqDirectoryList.innerHTML = `<div class="directory-loader">No questions in this category.</div>`;
        return;
    }

    filtered.forEach(faq => {
        const card = document.createElement("div");
        card.className = "faq-item";
        card.innerHTML = `
            <span class="faq-cat-badge">${faq.category}</span>
            <div class="faq-q">${faq.question}</div>
        `;
        card.addEventListener("click", () => {
            userInput.value = faq.question;
            userInput.focus();
        });
        faqDirectoryList.appendChild(card);
    });
}

// Set up FAQ Category Filters
function setupCategoryFilters() {
    const filterButtons = document.querySelectorAll(".filter-btn");
    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            filterButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderFAQDirectory(btn.dataset.category);
        });
    });
}

// Render footer suggestions
function renderQuickSuggests() {
    const suggestions = [
        "What is the mobile phone price?",
        "What are the camera features?",
        "How long is the battery life?",
        "Does it support 5G?"
    ];
    
    quickSuggestContainer.innerHTML = "";
    suggestions.forEach(query => {
        const tag = document.createElement("div");
        tag.className = "suggest-tag";
        tag.textContent = query;
        tag.addEventListener("click", () => {
            submitUserQuestion(query);
        });
        quickSuggestContainer.appendChild(tag);
    });
}

// Chat UI Appenders
function appendUserMessage(text) {
    const wrapper = document.createElement("div");
    wrapper.className = "msg-wrapper user";
    wrapper.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid fa-user-astronaut"></i></div>
        <div class="msg-bubble">${escapeHTML(text)}</div>
    `;
    chatMessages.appendChild(wrapper);
    scrollToBottom();
}

function appendBotMessage(text, suggestions = []) {
    const wrapper = document.createElement("div");
    wrapper.className = "msg-wrapper bot";
    
    let suggestHtml = "";
    if (suggestions.length > 0) {
        suggestHtml = `<div class="msg-suggestions">`;
        suggestions.forEach(s => {
            suggestHtml += `<button class="msg-suggest-btn" onclick="submitUserQuestion('${escapeHTML(s.replace(/'/g, "\\'"))}')">${escapeHTML(s)}</button>`;
        });
        suggestHtml += `</div>`;
    }

    wrapper.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="msg-bubble">
            <div>${text}</div>
            ${suggestHtml}
        </div>
    `;
    chatMessages.appendChild(wrapper);
    scrollToBottom();
    return wrapper;
}

// Renders the bouncing typing state
function appendTypingIndicator() {
    const wrapper = document.createElement("div");
    wrapper.className = "msg-wrapper bot typing-indicator-wrapper";
    wrapper.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="msg-bubble">
            <div class="typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(wrapper);
    scrollToBottom();
    return wrapper;
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// Handle Form Submission
chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = userInput.value.trim();
    if (!query) return;
    
    submitUserQuestion(query);
    userInput.value = "";
});

async function submitUserQuestion(query) {
    appendUserMessage(query);
    const typingIndicator = appendTypingIndicator();
    
    await new Promise(resolve => setTimeout(resolve, 600));

    let result = null;

    if (localEngineActive) {
        result = localMatcher.match(query);
    } else {
        try {
            const response = await fetch(`${API_BASE}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: query })
            });
            if (!response.ok) throw new Error("API call failed");
            result = await response.json();
        } catch (error) {
            console.warn("API error, executing client-side NLP fallback.", error);
            if (!localMatcher) {
                localMatcher = new LocalSimilarityMatcher(faqDataset.length > 0 ? faqDataset : LOCAL_FAQS);
            }
            result = localMatcher.match(query);
        }
    }

    typingIndicator.remove();

    let suggestions = [];
    if (result.score < 0.20 && result.debug && result.debug.scores.length > 0) {
        suggestions = result.debug.scores.slice(0, 2).map(s => s.question);
    }

    appendBotMessage(result.answer, suggestions);
    updateDebugConsole(query, result);
    
    // Update similarity chart with match results
    if (result.debug && result.debug.scores) {
        const matchResults = result.debug.scores.map(score => ({
            question: score.question,
            score: score.score
        }));
        if (typeof updateSimilarityChart === 'function') {
            updateSimilarityChart(matchResults);
        }
    }
}

// Reset debug visual interface
function resetDebugConsole() {
    debugEngine.textContent = "Idle (Waiting for input)";
    debugEngine.className = "engine-badge";
    stepRaw.textContent = "-";
    stepTokens.innerHTML = "-";
    stepClean.innerHTML = "-";
    stepStemmed.innerHTML = "-";
    debugScoresBody.innerHTML = `<tr><td colspan="2" class="empty-table">Submit a query to inspect cosine calculations</td></tr>`;
    vectorDetails.innerHTML = "Submit a question to see vector dot product calculations.";
}

// Update NLP Debug Panel
function updateDebugConsole(query, data) {
    const debug = data.debug;
    
    debugEngine.textContent = debug.engine || "Active Model";
    if (localEngineActive) {
        debugEngine.className = "engine-badge offline";
        debugEngine.style.backgroundColor = "hsla(0, 100%, 50%, 0.15)";
        debugEngine.style.borderColor = "hsl(0, 100%, 50%)";
        debugEngine.style.color = "hsl(0, 100%, 50%)";
    } else {
        debugEngine.className = "engine-badge";
        debugEngine.style = "";
    }

    stepRaw.textContent = `"${query}"`;
    renderTokens(stepTokens, debug.tokens, false);
    renderTokens(stepClean, debug.cleaned, false);
    renderTokens(stepStemmed, debug.stemmed, true);

    debugScoresBody.innerHTML = "";
    
    if (!debug.scores || debug.scores.length === 0) {
        debugScoresBody.innerHTML = `<tr><td colspan="2" class="empty-table">No similarity data returned.</td></tr>`;
        return;
    }

    const sortedScores = [...debug.scores].sort((a, b) => b.score - a.score);
    
    sortedScores.forEach(item => {
        const tr = document.createElement("tr");
        const isMatched = item.score >= 0.20 && item.question === data.matched_question;
        tr.className = `candidate-row ${isMatched ? "high-match" : ""}`;
        
        const scorePercent = Math.max(0, Math.min(100, Math.round(item.score * 100)));
        
        tr.innerHTML = `
            <td>
                <span class="candidate-q">${escapeHTML(item.question)}</span>
            </td>
            <td class="score-col">
                <div class="score-display">
                    <span class="score-num">${item.score.toFixed(4)}</span>
                    <div class="score-bar">
                        <div class="score-bar-fill" style="width: ${scorePercent}%"></div>
                    </div>
                </div>
            </td>
        `;
        debugScoresBody.appendChild(tr);
    });

    if (sortedScores.length > 0 && debug.stemmed.length > 0) {
        const topItem = sortedScores[0];
        const hasMatch = topItem.score > 0.05;
        
        if (hasMatch) {
            const queryStems = debug.stemmed;
            let matchedStems = [];
            const topFaqData = faqDataset.find(f => f.question === topItem.question);
            let faqStems = [];
            if (topFaqData) {
                faqStems = jsPreprocess(topFaqData.question).stemmed;
            }
            
            queryStems.forEach(stem => {
                if (faqStems.includes(stem)) {
                    matchedStems.push(stem);
                }
            });

            let mathHtml = `
                <div style="margin-bottom: 8px; font-weight: bold; color: var(--text-primary);">
                    Query ⟷ Best Match Vector Mapping:
                </div>
                <div>Top candidate: <em>"${escapeHTML(topItem.question)}"</em></div>
                <div class="math-detail-item">
                    Shared Stems: [${matchedStems.map(s => `'${s}'`).join(", ") || "None"}]<br>
                    Query Vector Size: ${queryStems.length} terms<br>
                    FAQ Vector Size: ${faqStems.length} terms<br>
                    Dot Product Sum: ${(topItem.score * Math.sqrt(queryStems.length * faqStems.length)).toFixed(2)}<br>
                    Cosine Similarity: <strong>${topItem.score.toFixed(4)}</strong>
                </div>
                <div style="margin-top: 10px; font-size: 10px; color: var(--text-muted);">
                    *Higher cosine scores reflect matching stems in both documents. Scores exceeding the 0.20 threshold represent valid matches.
                </div>
            `;
            vectorDetails.innerHTML = mathHtml;
        } else {
            vectorDetails.innerHTML = `<div class="math-detail-item" style="color: var(--accent-magenta);">Cosine: 0.0000 (No shared stems found after stopword filtering)</div>`;
        }
    } else {
        vectorDetails.innerHTML = `<div class="math-detail-item" style="color: var(--text-muted);">Empty query after preprocessing. Dot product is zero.</div>`;
    }

    if (window.renderMathInElement) {
        renderMathInElement(document.getElementById("debugPanel"));
    }
}

function renderTokens(container, tokensArray, isStems) {
    container.innerHTML = "";
    if (!tokensArray || tokensArray.length === 0) {
        container.textContent = "[] (None)";
        return;
    }
    
    tokensArray.forEach(token => {
        const chip = document.createElement("span");
        chip.className = `token-chip ${isStems ? "stem" : ""}`;
        chip.textContent = token;
        container.appendChild(chip);
    });
}

window.addEventListener("DOMContentLoaded", initApp);
