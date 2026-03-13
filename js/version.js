async function loadSystemVersion() {
    try {
        // Determine path based on whether the script runs from the root or the /app/ folder
        const isAppPage = window.location.pathname.includes('/app/');
        const versionPath = isAppPage ? '../config/version.json' : 'config/version.json';
        
        const response = await fetch(versionPath);
        if (!response.ok) {
            throw new Error('Failed to load version block');
        }
        
        const data = await response.json();
        
        // Format dates as "13 March 2026"
        const dateObj = new Date(data.buildDate);
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const formattedDate = dateObj.toLocaleDateString('en-GB', options);
        
        // Insert version config inside the footer's span
        const versionSpan = document.getElementById('version');
        if (versionSpan) {
            versionSpan.innerHTML = `v${data.version} <br> Last Updated: ${formattedDate}`;
        }
    } catch (error) {
        console.error('Error fetching version payload:', error);
    }
}

document.addEventListener('DOMContentLoaded', loadSystemVersion);
