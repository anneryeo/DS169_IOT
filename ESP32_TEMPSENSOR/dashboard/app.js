/**
 * DS169 IoT Dashboard - App.js
 * Real-time Temperature & Humidity Monitoring
 * 
 * This application fetches data from Google Sheets using the Google Sheets API,
 * processes it to show only the latest 100 entries, and displays it using
 * Chart.js for trends and Google Charts for gauges.
 */

// ============================================================================
// Configuration
// ============================================================================
// Configuration is loaded from config.js (which is gitignored for security)
// This ensures API keys and sensitive data are never committed to git

// Debug: Check if CONFIG is available
console.log('CONFIG object available:', typeof CONFIG !== 'undefined');
if (typeof CONFIG === 'undefined') {
    console.error('CRITICAL: CONFIG object not found! Make sure config.js is loaded before app.js');
}

// Use CONFIG object from config.js, with fallbacks for safety
const API_KEY = CONFIG?.API_KEY || '';
const SHEET_ID = CONFIG?.SHEET_ID || '';
const SHEET_NAME = CONFIG?.SHEET_NAME || 'Sheet1';
const DISPLAY_LIMIT = CONFIG?.DISPLAY_LIMIT || 100;
const DISCOVERY_DOCS = CONFIG?.DISCOVERY_DOCS || [
    'https://sheets.googleapis.com/$discovery/rest?version=v4'
];

// Debug logging
console.log('Configuration loaded:', {
    hasAPIKey: !!API_KEY,
    hasSheetID: !!SHEET_ID,
    sheetsName: SHEET_NAME,
    displayLimit: DISPLAY_LIMIT
});

// Validate configuration
if (!API_KEY || !SHEET_ID) {
    console.error('ERROR: CONFIG object not loaded or credentials missing!');
    console.error('API_KEY present:', !!API_KEY);
    console.error('SHEET_ID present:', !!SHEET_ID);
    console.error('Please ensure config.js is loaded and contains API_KEY and SHEET_ID');
}

// ============================================================================
// Global Variables
// ============================================================================

let temperatureChart = null;
let humidityChart = null;
let chartData = {
    timestamps: [],
    temperatures: [],
    humidities: []
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the application when the page loads
 */
window.addEventListener('load', async () => {
    try {
        console.log('Dashboard initialization started');
        
        // Initialize Google API client
        console.log('Initializing Google API client...');
        await initializeGoogleAPI();
        console.log('Google API client initialized successfully');
        
        // Fetch and process data
        console.log('Fetching data from Google Sheets...');
        await fetchAndDisplayData();
        console.log('Data fetched successfully');
        
        // Set up auto-refresh every 5 minutes
        setInterval(fetchAndDisplayData, 5 * 60 * 1000);
        console.log('Auto-refresh scheduled every 5 minutes');
    } catch (error) {
        console.error('Initialization error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        showError('Failed to initialize dashboard. Please check your API key and Sheet ID. See console for details.');
    }
});

// ============================================================================
// Google API Initialization
// ============================================================================

/**
 * Initialize the Google Sheets API using Discovery Docs
 * This method loads the Sheets API dynamically
 */
async function initializeGoogleAPI() {
    return new Promise((resolve, reject) => {
        // Check if gapi is available
        if (!window.gapi) {
            reject(new Error('Google API library (gapi) not loaded. Check that Google API script tag is included in HTML.'));
            return;
        }
        
        gapi.load('client', async () => {
            try {
                console.log('Initializing gapi.client with API key:', API_KEY?.substring(0, 10) + '...');
                console.log('Discovery docs:', DISCOVERY_DOCS);
                await gapi.client.init({
                    apiKey: API_KEY,
                    discoveryDocs: DISCOVERY_DOCS
                });
                console.log('gapi.client initialized successfully');
                resolve();
            } catch (error) {
                console.error('gapi.client.init failed:', error);
                
                // Provide detailed error guidance
                let detailedMessage = 'Failed to initialize Google API: ' + error.message;
                
                if (error.message?.includes('403')) {
                    detailedMessage = 'API Error 403 (Forbidden): Your API key may not have Google Sheets API enabled, or there may be restrictions. Check Google Cloud Console.';
                } else if (error.message?.includes('400')) {
                    detailedMessage = 'API Error 400 (Bad Request): Invalid API key format or configuration.';
                } else if (!API_KEY) {
                    detailedMessage = 'No API key found in CONFIG. Please ensure config.js has a valid API_KEY.';
                }
                
                console.error('Detailed error:', detailedMessage);
                reject(new Error(detailedMessage));
            }
        });
    });
}

// ============================================================================
// Data Fetching & Processing
// ============================================================================

/**
 * Main function to fetch data from Google Sheets and update the dashboard
 * Strategy:
 * 1. First fetch metadata to determine the total number of rows
 * 2. Calculate the range for the last 100 entries
 * 3. Fetch only that range to optimize API performance
 * 4. Process and display the data
 */
async function fetchAndDisplayData() {
    try {
        // Hide error banner initially
        document.getElementById('errorBanner').classList.add('hidden');
        
        // Step 1: Fetch metadata to determine sheet dimensions
        const metadata = await fetchSheetMetadata();
        const totalRows = metadata.totalRows;
        
        console.log(`Total rows in sheet: ${totalRows}`);
        
        // Step 2: Calculate the range for the last DISPLAY_LIMIT entries
        // We add 1 for the header row, so we need DISPLAY_LIMIT + 1 rows total
        const startRow = Math.max(2, totalRows - DISPLAY_LIMIT + 1); // Row 2 is first data row
        const endRow = totalRows;
        
        const range = `${SHEET_NAME}!A${startRow}:C${endRow}`;
        console.log(`Fetching data from range: ${range}`);
        
        // Step 3: Fetch the optimized range
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: range
        });
        
        // Step 4: Process the response
        const rawData = response.result.values || [];
        console.log(`Fetched ${rawData.length} rows from Google Sheets`);
        
        // Step 5: Clean and validate the data
        const cleanedData = cleanAndValidateData(rawData);
        console.log(`Cleaned data contains ${cleanedData.length} valid rows`);
        
        // Step 6: Calculate statistics
        const stats = calculateStatistics(cleanedData);
        
        // Step 7: Update the UI with the new data
        updateDashboard(cleanedData, stats);
        
        // Show success
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('dashboardContent').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('loadingState').classList.add('hidden');
        showError('Failed to fetch data from Google Sheets. ' + error.message);
    }
}

/**
 * Fetch metadata about the sheet to determine total number of rows
 * This uses a large range (A:C) but only returns metadata
 */
async function fetchSheetMetadata() {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${SHEET_NAME}!A:C`
        });
        
        const values = response.result.values || [];
        
        // Total rows includes header, so subtract 1 for data rows only
        const totalRows = values.length;
        
        return {
            totalRows: totalRows,
            hasData: totalRows > 1
        };
    } catch (error) {
        throw new Error('Failed to fetch sheet metadata: ' + error.message);
    }
}

/**
 * Clean and validate data by filtering out:
 * - Rows with missing Temperature or Humidity values
 * - Rows containing 'NaN' strings (common with DHT11 sensors)
 * - Non-numeric values
 * 
 * @param {Array} rawData - Raw data rows from Google Sheets
 * @returns {Array} Array of cleaned data objects
 */
function cleanAndValidateData(rawData) {
    return rawData
        .map(row => {
            // Ensure row has at least 3 columns: [timestamp, temperature, humidity]
            if (!row || row.length < 3) {
                return null;
            }
            
            const timestamp = String(row[0]).trim();
            const tempStr = String(row[1]).trim();
            const humidStr = String(row[2]).trim();
            
            // Check for missing, invalid, or NaN values
            if (!timestamp || !tempStr || !humidStr) {
                return null;
            }
            
            // Reject rows containing 'NaN' (DHT11 sensor failures)
            if (tempStr.toUpperCase().includes('NAN') || 
                humidStr.toUpperCase().includes('NAN')) {
                return null;
            }
            
            // Parse numeric values
            const temperature = parseFloat(tempStr);
            const humidity = parseFloat(humidStr);
            
            // Validate parsed values are numbers and within reasonable ranges
            if (isNaN(temperature) || isNaN(humidity)) {
                return null;
            }
            
            // Temperature should be between -40°C and 125°C (DHT11 range: 0-50°C)
            if (temperature < -40 || temperature > 125) {
                return null;
            }
            
            // Humidity should be between 0% and 100%
            if (humidity < 0 || humidity > 100) {
                return null;
            }
            
            return {
                timestamp,
                temperature,
                humidity,
                rawRow: row
            };
        })
        .filter(row => row !== null); // Remove null entries
}

/**
 * Calculate statistics from the cleaned data
 * Returns averages, min/max values, and other metrics
 * 
 * @param {Array} data - Cleaned data array
 * @returns {Object} Statistics object
 */
function calculateStatistics(data) {
    if (data.length === 0) {
        return {
            avgTemp: 0,
            avgHumidity: 0,
            minTemp: 0,
            maxTemp: 0,
            minHumidity: 0,
            maxHumidity: 0,
            dataPoints: 0
        };
    }
    
    const temperatures = data.map(d => d.temperature);
    const humidities = data.map(d => d.humidity);
    
    const avgTemp = (temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(1);
    const avgHumidity = (humidities.reduce((a, b) => a + b, 0) / humidities.length).toFixed(1);
    const minTemp = Math.min(...temperatures).toFixed(1);
    const maxTemp = Math.max(...temperatures).toFixed(1);
    const minHumidity = Math.min(...humidities).toFixed(1);
    const maxHumidity = Math.max(...humidities).toFixed(1);
    
    return {
        avgTemp: parseFloat(avgTemp),
        avgHumidity: parseFloat(avgHumidity),
        minTemp: parseFloat(minTemp),
        maxTemp: parseFloat(maxTemp),
        minHumidity: parseFloat(minHumidity),
        maxHumidity: parseFloat(maxHumidity),
        dataPoints: data.length
    };
}

// ============================================================================
// UI Updates
// ============================================================================

/**
 * Update the entire dashboard with new data
 * This function coordinates updates to:
 * - Gauges (using Google Charts)
 * - Line charts (using Chart.js)
 * - Statistics section
 * - Timestamp
 */
function updateDashboard(data, stats) {
    // Prepare chart data
    prepareChartData(data);
    
    // Update gauges
    updateGauges(stats.avgTemp, stats.avgHumidity);
    
    // Update charts
    updateCharts(data);
    
    // Update statistics
    updateStatistics(stats);
    
    // Update last updated timestamp
    updateTimestamp();
}

/**
 * Prepare data for Chart.js visualization
 * Extract timestamps, temperatures, and humidities
 */
function prepareChartData(data) {
    chartData.timestamps = data.map(d => d.timestamp);
    chartData.temperatures = data.map(d => d.temperature);
    chartData.humidities = data.map(d => d.humidity);
}

/**
 * Update Google Charts Gauges
 * Display current average temperature and humidity
 */
function updateGauges(temperature, humidity) {
    // Load Google Charts library if not already loaded
    google.charts.load('current', {'packages': ['gauge']});
    google.charts.setOnLoadCallback(() => {
        drawTemperatureGauge(temperature);
        drawHumidityGauge(humidity);
    });
    
    // Update stat values
    document.getElementById('tempValue').textContent = temperature.toFixed(1);
    document.getElementById('humidValue').textContent = humidity.toFixed(1);
}

/**
 * Draw Temperature Gauge using Google Charts
 */
function drawTemperatureGauge(value) {
    const data = google.visualization.arrayToDataTable([
        ['Label', 'Value'],
        ['°C', value]
    ]);
    
    const options = {
        min: 0,
        max: 50,
        yellowFrom: 40,
        yellowTo: 45,
        redFrom: 45,
        redTo: 50,
        minorTicks: 5,
        majorTicks: ['0', '10', '20', '30', '40', '50'],
        greenFrom: 10,
        greenTo: 30
    };
    
    const chart = new google.visualization.Gauge(
        document.getElementById('temperatureGauge')
    );
    chart.draw(data, options);
}

/**
 * Draw Humidity Gauge using Google Charts
 */
function drawHumidityGauge(value) {
    const data = google.visualization.arrayToDataTable([
        ['Label', 'Value'],
        ['%', value]
    ]);
    
    const options = {
        min: 0,
        max: 100,
        yellowFrom: 70,
        yellowTo: 80,
        redFrom: 80,
        redTo: 100,
        minorTicks: 5,
        majorTicks: ['0', '20', '40', '60', '80', '100'],
        greenFrom: 30,
        greenTo: 70
    };
    
    const chart = new google.visualization.Gauge(
        document.getElementById('humidityGauge')
    );
    chart.draw(data, options);
}

/**
 * Update Chart.js line charts for trends
 * Creates two responsive charts: Temperature and Humidity
 */
function updateCharts(data) {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            x: {
                grid: {
                    drawBorder: false,
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            },
            y: {
                grid: {
                    drawBorder: false,
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            }
        }
    };
    
    // Destroy existing charts if they exist to avoid memory leaks
    if (temperatureChart) temperatureChart.destroy();
    if (humidityChart) humidityChart.destroy();
    
    // Create Temperature Chart
    const tempCtx = document.getElementById('temperatureChart').getContext('2d');
    temperatureChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            labels: chartData.timestamps.map((ts, idx) => 
                idx % Math.ceil(chartData.timestamps.length / 10) === 0 ? ts : ''
            ),
            datasets: [{
                label: 'Temperature (°C)',
                data: chartData.temperatures,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 2,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 1
            }]
        },
        options: chartOptions
    });
    
    // Create Humidity Chart
    const humidCtx = document.getElementById('humidityChart').getContext('2d');
    humidityChart = new Chart(humidCtx, {
        type: 'line',
        data: {
            labels: chartData.timestamps.map((ts, idx) => 
                idx % Math.ceil(chartData.timestamps.length / 10) === 0 ? ts : ''
            ),
            datasets: [{
                label: 'Humidity (%)',
                data: chartData.humidities,
                borderColor: '#764ba2',
                backgroundColor: 'rgba(118, 75, 162, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 2,
                pointBackgroundColor: '#764ba2',
                pointBorderColor: '#fff',
                pointBorderWidth: 1
            }]
        },
        options: chartOptions
    });
}

/**
 * Update the statistics section with min/max/average values
 */
function updateStatistics(stats) {
    document.getElementById('dataPoints').textContent = stats.dataPoints;
    document.getElementById('tempMin').textContent = stats.minTemp.toFixed(1);
    document.getElementById('tempMax').textContent = stats.maxTemp.toFixed(1);
    document.getElementById('humidMin').textContent = stats.minHumidity.toFixed(1);
}

/**
 * Update the last updated timestamp
 */
function updateTimestamp() {
    const now = new Date();
    const timeString = now.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    document.getElementById('lastUpdated').textContent = timeString;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Display an error message to the user
 */
function showError(message) {
    const errorBanner = document.getElementById('errorBanner');
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.textContent = message;
    errorBanner.classList.remove('hidden');
}
