/**
 * MOBILE DEVICES - AI CHARTS & ANALYTICS
 * Visualizes FAQ data, phone specs, pricing, and performance metrics
 */

let charts = {
    faqCategory: null,
    specs: null,
    price: null,
    performance: null,
    similarity: null
};

// Initialize all charts
async function initializeCharts() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/faqs');
        const faqs = await response.json();
        
        // Render all charts
        renderFAQCategoryChart(faqs);
        renderPhoneSpecsChart();
        renderPriceComparisonChart();
        renderPerformanceChart();
        renderSimilarityChart();
        
        console.log("Charts initialized successfully");
    } catch (error) {
        console.warn("Charts initialization error:", error);
        // Fallback with static data
        renderChartsWithStaticData();
    }
}

// 1. FAQ DISTRIBUTION BY CATEGORY
function renderFAQCategoryChart(faqs) {
    const categories = {};
    faqs.forEach(faq => {
        categories[faq.category] = (categories[faq.category] || 0) + 1;
    });

    const ctx = document.getElementById('faqCategoryChart').getContext('2d');
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'
    ];

    charts.faqCategory = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: colors,
                borderColor: '#1a1a2e',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e0e0e0',
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

// 2. PHONE SPECIFICATIONS CHART
function renderPhoneSpecsChart() {
    const ctx = document.getElementById('specsChart').getContext('2d');
    
    charts.specs = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Display (nits)', 'Camera (MP)', 'Battery (mAh)', 'RAM (GB)', 'Storage (GB)', 'Refresh (Hz)'],
            datasets: [
                {
                    label: 'Base Model',
                    data: [1000, 48, 4500, 12, 256, 120],
                    borderColor: '#45B7D1',
                    backgroundColor: 'rgba(69, 183, 209, 0.1)',
                    borderWidth: 2
                },
                {
                    label: 'Premium Model',
                    data: [1500, 48, 5000, 16, 1024, 120],
                    borderColor: '#FF6B6B',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: '#e0e0e0' }
                }
            },
            scales: {
                r: {
                    grid: { color: '#444' },
                    ticks: { color: '#bbb' }
                }
            }
        }
    });
}

// 3. PRICE COMPARISON CHART
function renderPriceComparisonChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    charts.price = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Base\n256GB', 'Mid-Range\n512GB', 'Premium\n1TB', 'Ultra\n1TB+'],
            datasets: [{
                label: 'Price ($)',
                data: [399, 599, 999, 1299],
                backgroundColor: [
                    '#45B7D1',
                    '#4ECDC4',
                    '#FF6B6B',
                    '#FFA07A'
                ],
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'x',
            plugins: {
                legend: {
                    labels: { color: '#e0e0e0' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1500,
                    grid: { color: '#444' },
                    ticks: { color: '#bbb' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#bbb' }
                }
            }
        }
    });
}

// 4. PERFORMANCE BENCHMARKS CHART
function renderPerformanceChart() {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    charts.performance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['AnTuTu', 'Geekbench', 'GFXBench', 'Battery Test', 'Thermal'],
            datasets: [
                {
                    label: 'Our Phone',
                    data: [1400000, 2100, 180, 22, 95],
                    borderColor: '#FF6B6B',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: '#FF6B6B'
                },
                {
                    label: 'Competitor A',
                    data: [1350000, 2050, 170, 20, 90],
                    borderColor: '#45B7D1',
                    backgroundColor: 'rgba(69, 183, 209, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#45B7D1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: '#e0e0e0' }
                }
            },
            scales: {
                y: {
                    grid: { color: '#444' },
                    ticks: { color: '#bbb' }
                },
                x: {
                    grid: { color: '#444' },
                    ticks: { color: '#bbb' }
                }
            }
        }
    });
}

// 5. SIMILARITY SCORES FOR RECENT QUERIES
function renderSimilarityChart() {
    const ctx = document.getElementById('similarityChart').getContext('2d');
    
    // Default data - will be updated when user makes queries
    const defaultData = [
        'Pricing',
        'Features',
        'Battery',
        'Camera',
        'Support'
    ];
    
    const defaultScores = [0.95, 0.88, 0.92, 0.87, 0.85];
    
    charts.similarity = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: defaultData,
            datasets: [{
                label: 'Match Score',
                data: defaultScores,
                backgroundColor: defaultScores.map(score => {
                    if (score > 0.9) return '#4ECDC4';
                    if (score > 0.8) return '#45B7D1';
                    return '#FFA07A';
                }),
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: '#e0e0e0' }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 1,
                    grid: { color: '#444' },
                    ticks: { color: '#bbb' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#bbb' }
                }
            }
        }
    });
}

// Update similarity chart with query results
function updateSimilarityChart(matchResults) {
    if (!charts.similarity || !matchResults || matchResults.length === 0) return;
    
    const top5 = matchResults.slice(0, 5);
    
    charts.similarity.data.labels = top5.map(m => m.question.substring(0, 30) + '...');
    charts.similarity.data.datasets[0].data = top5.map(m => m.score);
    charts.similarity.data.datasets[0].backgroundColor = top5.map(m => {
        if (m.score > 0.7) return '#4ECDC4';
        if (m.score > 0.4) return '#45B7D1';
        return '#FFA07A';
    });
    
    charts.similarity.update();
}

// Fallback charts with static data
function renderChartsWithStaticData() {
    renderFAQCategoryChart([
        { category: 'Pricing & Plans' },
        { category: 'Pricing & Plans' },
        { category: 'Pricing & Plans' },
        { category: 'Pricing & Plans' },
        { category: 'Features & Specs' },
        { category: 'Features & Specs' },
        { category: 'Features & Specs' },
        { category: 'Features & Specs' },
        { category: 'Features & Specs' },
        { category: 'Features & Specs' },
        { category: 'Technical Support' },
        { category: 'Technical Support' },
        { category: 'Technical Support' },
        { category: 'Sustainability' },
        { category: 'Sustainability' }
    ]);
    
    renderPhoneSpecsChart();
    renderPriceComparisonChart();
    renderPerformanceChart();
    renderSimilarityChart();
}

// Initialize charts when page loads
window.addEventListener('load', initializeCharts);
