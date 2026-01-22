// ======================================================
// SYSTEM INFORMATION MODULE
// ======================================================

class SystemInfo {
    constructor() {
        this.info = {};
        this.gatherInfo();
    }

    gatherInfo() {
        // Browser Information
        this.info.browser = {
            name: this.getBrowserName(),
            version: this.getBrowserVersion(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            online: navigator.onLine
        };

        // Screen Information
        this.info.screen = {
            width: screen.width,
            height: screen.height,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth,
            devicePixelRatio: window.devicePixelRatio || 1
        };

        // Hardware Information (limited by browser security)
        this.info.hardware = {
            cores: navigator.hardwareConcurrency || 'Unknown',
            memory: navigator.deviceMemory || 'Unknown',
            maxTouchPoints: navigator.maxTouchPoints || 0,
            touchSupport: 'ontouchstart' in window
        };

        // Web APIs Support
        this.info.apis = {
            webAudio: !!(window.AudioContext || window.webkitAudioContext),
            webGL: this.detectWebGL(),
            canvas: !!document.createElement('canvas').getContext,
            localStorage: this.testLocalStorage(),
            serviceWorker: 'serviceWorker' in navigator,
            webRTC: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection),
            geolocation: 'geolocation' in navigator,
            notifications: 'Notification' in window
        };

        // Connection Information
        this.info.connection = this.getConnectionInfo();

        // Performance Information
        this.info.performance = this.getPerformanceInfo();
    }

    getBrowserName() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        if (ua.includes('Opera')) return 'Opera';
        return 'Unknown';
    }

    getBrowserVersion() {
        const ua = navigator.userAgent;
        const match = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/(\d+)/);
        return match ? match[2] : 'Unknown';
    }

    detectWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }

    testLocalStorage() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            return false;
        }
    }

    getConnectionInfo() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            return {
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt,
                saveData: connection.saveData
            };
        }
        return { message: 'Connection API not supported' };
    }

    getPerformanceInfo() {
        if ('performance' in window && 'timing' in performance) {
            const timing = performance.timing;
            return {
                loadTime: timing.loadEventEnd - timing.navigationStart,
                domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
                firstPaint: this.getFirstPaintTime()
            };
        }
        return { message: 'Performance API not fully supported' };
    }

    getFirstPaintTime() {
        if ('performance' in window) {
            const paintEntries = performance.getEntriesByType('paint');
            const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
            return firstPaint ? firstPaint.startTime : null;
        }
        return null;
    }

    displayInfo() {
        const container = document.getElementById('system-info-container');
        if (!container) return;

        let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">';

        // Browser Info
        html += this.createInfoCard('🌐 Browser', this.info.browser, [
            'name', 'version', 'platform', 'language', 'online'
        ]);

        // Screen Info
        html += this.createInfoCard('🖥️ Screen', this.info.screen, [
            'width', 'height', 'colorDepth', 'devicePixelRatio'
        ]);

        // Hardware Info
        html += this.createInfoCard('⚙️ Hardware', this.info.hardware, [
            'cores', 'memory', 'touchSupport'
        ]);

        // APIs Support
        html += this.createInfoCard('🔌 APIs Support', this.info.apis, Object.keys(this.info.apis));

        // Connection Info
        html += this.createInfoCard('📡 Connection', this.info.connection, Object.keys(this.info.connection));

        // Performance Info
        html += this.createInfoCard('⚡ Performance', this.info.performance, Object.keys(this.info.performance));

        html += '</div>';
        container.innerHTML = html;
    }

    createInfoCard(title, data, keys) {
        let html = `<div class="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800 mb-3">${title}</h3>
            <div class="space-y-2">`;

        keys.forEach(key => {
            const value = data[key];
            const displayValue = typeof value === 'boolean' ? (value ? '✅ Yes' : '❌ No') : value;
            html += `<div class="flex justify-between">
                <span class="text-gray-600 capitalize">${key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                <span class="font-medium text-gray-800">${displayValue}</span>
            </div>`;
        });

        html += '</div></div>';
        return html;
    }

    exportInfo() {
        const dataStr = JSON.stringify(this.info, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'system_info.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Global instance
const systemInfo = new SystemInfo();
