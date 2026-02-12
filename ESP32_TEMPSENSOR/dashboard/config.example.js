/**
 * DS169 IoT Dashboard - Configuration Example
 *
 * IMPORTANT: Copy this file to config.js and add real credentials.
 * Do not commit config.js to git.
 */

window.CONFIG = {
    // Replace with your actual Google Sheets API Key
    API_KEY: 'YOUR_API_KEY_HERE',

    // Replace with your Google Sheet ID (from the sheet URL)
    SHEET_ID: 'YOUR_SHEET_ID_HERE',

    // Name of the sheet to query (visible tab at bottom)
    SHEET_NAME: 'Sheet1',

    // Number of latest entries to display (for performance)
    DISPLAY_LIMIT: 100,

    // API configuration
    DISCOVERY_DOCS: [
        'https://sheets.googleapis.com/$discovery/rest?version=v4'
    ]
};
