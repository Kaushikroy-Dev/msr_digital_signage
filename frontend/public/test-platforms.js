/**
 * Platform Testing Utility
 * Inject this script to test different platforms in browser
 * Usage: Copy and paste the test function for the platform you want to test
 * 
 * NOTE: This file should NOT be included in production builds.
 * It's only for development/testing purposes.
 */

(function() {
    'use strict';
    
    // Exit early in production (check for production indicators)
    const isProduction = 
        window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1' &&
        !window.location.hostname.includes('.local') &&
        !window.location.hostname.includes('dev') &&
        !window.location.hostname.includes('test');
    
    if (isProduction) {
        console.warn('[Platform Tester] Test utilities disabled in production');
        return;
    }
    
    // Platform Test Helper
    window.DSPlatformTester = {
        /**
         * Test Tizen (Samsung TV)
         */
        testTizen: function() {
            console.log('🔵 Setting up TIZEN platform test...');
            
            // Remove other platform simulations
            delete window.webOS;
            delete window.PalmSystem;
            delete window.__DS_TEST_PLATFORM__;
            localStorage.removeItem('ds_test_platform');
            
            // Set up Tizen API
            window.tizen = {
                systeminfo: {
                    getPropertyValue: function(prop) {
                        const values = {
                            'platformVersion': '6.0',
                            'modelName': 'Samsung TV 2020',
                            'firmwareVersion': '1500',
                            'DISPLAY': {
                                resolutionWidth: 1920,
                                resolutionHeight: 1080
                            }
                        };
                        const value = values[prop] || '6.0';
                        console.log('[Tizen] getPropertyValue:', prop, '=', value);
                        return Promise.resolve(value);
                    }
                },
                application: {
                    getCurrentApplication: function() {
                        console.log('[Tizen] getCurrentApplication called');
                        return {
                            exit: function() {
                                console.log('[Tizen] Exit called');
                            },
                            getRequestedAppControl: function() {
                                return {
                                    requestAppControl: function() {
                                        console.log('[Tizen] App control requested');
                                    }
                                };
                            }
                        };
                    }
                },
                tvinputdevice: {
                    registerKey: function(key) {
                        console.log('[Tizen] Registered key:', key);
                    }
                },
                ApplicationControlReplyResult: {
                    SUCCEEDED: 'SUCCEEDED'
                }
            };
            
            // Store Tizen API setup function in localStorage for restoration after reload
            const tizenAPISetup = `
                window.tizen = {
                    systeminfo: {
                        getPropertyValue: function(prop) {
                            const values = {
                                'platformVersion': '6.0',
                                'modelName': 'Samsung TV 2020',
                                'firmwareVersion': '1500',
                                'DISPLAY': {
                                    resolutionWidth: 1920,
                                    resolutionHeight: 1080
                                }
                            };
                            const value = values[prop] || '6.0';
                            console.log('[Tizen] getPropertyValue:', prop, '=', value);
                            return Promise.resolve(value);
                        }
                    },
                    application: {
                        getCurrentApplication: function() {
                            console.log('[Tizen] getCurrentApplication called');
                            return {
                                exit: function() {
                                    console.log('[Tizen] Exit called');
                                },
                                getRequestedAppControl: function() {
                                    return {
                                        requestAppControl: function() {
                                            console.log('[Tizen] App control requested');
                                        }
                                    };
                                }
                            };
                        }
                    },
                    tvinputdevice: {
                        registerKey: function(key) {
                            console.log('[Tizen] Registered key:', key);
                        }
                    },
                    ApplicationControlReplyResult: {
                        SUCCEEDED: 'SUCCEEDED'
                    }
                };
                
                // Add Tizen remote handler
                window.addEventListener('tizenhwkey', function(event) {
                    console.log('[Tizen] Hardware key pressed:', event.keyName);
                    if (event.keyName === 'back') {
                        event.preventDefault();
                        console.log('[Tizen] Back button prevented');
                    }
                });
                
                console.log('[Tizen] API restored from test mode');
            `;
            
            // Store the setup code
            localStorage.setItem('ds_test_tizen_api', tizenAPISetup);
            
            // Also set localStorage override for persistence
            localStorage.setItem('ds_test_platform', 'tizen');
            window.__DS_TEST_PLATFORM__ = 'tizen';
            
            // Add Tizen remote handler (for current session)
            window.addEventListener('tizenhwkey', function(event) {
                console.log('[Tizen] Hardware key pressed:', event.keyName);
                if (event.keyName === 'back') {
                    event.preventDefault();
                    console.log('[Tizen] Back button prevented');
                }
            });
            
            console.log('✅ Tizen API configured');
            console.log('✅ Platform override set to: tizen');
            console.log('✅ Tizen API setup stored for restoration after reload');
            console.log('🔄 Reloading page in 1 second...');
            
            setTimeout(() => {
                location.reload();
            }, 1000);
        },
        
        /**
         * Test WebOS (LG TV)
         */
        testWebOS: function() {
            console.log('🟢 Setting up WEBOS platform test...');
            
            delete window.tizen;
            delete window.__DS_TEST_PLATFORM__;
            localStorage.removeItem('ds_test_platform');
            localStorage.removeItem('ds_test_tizen_api');
            
            // Store WebOS API setup for restoration
            const webosAPISetup = `
                window.webOS = {
                    version: '6.0',
                    platform: 'webos',
                    service: {
                        request: function(service, method, params) {
                            console.log('[WebOS] Service request:', service, method);
                            // Return a resolved promise to avoid permission errors
                            return Promise.resolve({
                                returnValue: true,
                                subscribed: false
                            });
                        }
                    },
                    // Mock permissions API to avoid errors
                    permissions: {
                        check: function(permission) {
                            console.log('[WebOS] Permission check:', permission);
                            return Promise.resolve({ allowed: true });
                        },
                        request: function(permission) {
                            console.log('[WebOS] Permission request:', permission);
                            return Promise.resolve({ allowed: true });
                        }
                    }
                };
                
                window.PalmSystem = {
                    identifier: 'com.digitalsignage.player',
                    version: '1.0.0',
                    stageReady: function() {
                        console.log('[WebOS] Stage ready called');
                    }
                };
                
                console.log('[WebOS] API restored from test mode');
            `;
            
            localStorage.setItem('ds_test_webos_api', webosAPISetup);
            
            window.webOS = {
                version: '6.0',
                platform: 'webos',
                service: {
                    request: function(service, method, params) {
                        console.log('[WebOS] Service request:', service, method);
                        return Promise.resolve({
                            returnValue: true,
                            subscribed: false
                        });
                    }
                },
                // Mock permissions API to avoid errors
                permissions: {
                    check: function(permission) {
                        console.log('[WebOS] Permission check:', permission);
                        return Promise.resolve({ allowed: true });
                    },
                    request: function(permission) {
                        console.log('[WebOS] Permission request:', permission);
                        return Promise.resolve({ allowed: true });
                    }
                }
            };
            
            window.PalmSystem = {
                identifier: 'com.digitalsignage.player',
                version: '1.0.0',
                stageReady: function() {
                    console.log('[WebOS] Stage ready called');
                }
            };
            
            localStorage.setItem('ds_test_platform', 'webos');
            window.__DS_TEST_PLATFORM__ = 'webos';
            
            console.log('✅ WebOS API configured');
            console.log('✅ Platform override set to: webos');
            console.log('✅ WebOS API setup stored for restoration after reload');
            console.log('🔄 Reloading page in 1 second...');
            
            setTimeout(() => {
                location.reload();
            }, 1000);
        },
        
        /**
         * Test BrightSign
         */
        testBrightSign: function() {
            console.log('🟡 Setting up BRIGHTSIGN platform test...');
            
            delete window.tizen;
            delete window.webOS;
            delete window.PalmSystem;
            delete window.__DS_TEST_PLATFORM__;
            localStorage.removeItem('ds_test_platform');
            
            // Simulate BrightSign user agent
            Object.defineProperty(navigator, 'userAgent', {
                get: function() {
                    return 'Mozilla/5.0 (BrightSign Player; BrightSign OS 8.0)';
                },
                configurable: true
            });
            
            localStorage.setItem('ds_test_platform', 'brightsign');
            window.__DS_TEST_PLATFORM__ = 'brightsign';
            
            console.log('✅ BrightSign user agent set');
            console.log('✅ Platform override set to: brightsign');
            console.log('🔄 Reloading page in 1 second...');
            
            setTimeout(() => {
                location.reload();
            }, 1000);
        },
        
        /**
         * Test Android
         */
        testAndroid: function() {
            console.log('🟠 Setting up ANDROID platform test...');
            
            delete window.tizen;
            delete window.webOS;
            delete window.PalmSystem;
            delete window.__DS_TEST_PLATFORM__;
            localStorage.removeItem('ds_test_platform');
            
            Object.defineProperty(navigator, 'userAgent', {
                get: function() {
                    return 'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36';
                },
                configurable: true
            });
            
            localStorage.setItem('ds_test_platform', 'android');
            window.__DS_TEST_PLATFORM__ = 'android';
            
            console.log('✅ Android user agent set');
            console.log('✅ Platform override set to: android');
            console.log('🔄 Reloading page in 1 second...');
            
            setTimeout(() => {
                location.reload();
            }, 1000);
        },
        
        /**
         * Test Windows
         */
        testWindows: function() {
            console.log('🔴 Setting up WINDOWS platform test...');
            
            delete window.tizen;
            delete window.webOS;
            delete window.PalmSystem;
            delete window.__DS_TEST_PLATFORM__;
            localStorage.removeItem('ds_test_platform');
            
            Object.defineProperty(navigator, 'platform', {
                get: function() {
                    return 'Win32';
                },
                configurable: true
            });
            
            Object.defineProperty(navigator, 'userAgent', {
                get: function() {
                    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
                },
                configurable: true
            });
            
            localStorage.setItem('ds_test_platform', 'windows');
            window.__DS_TEST_PLATFORM__ = 'windows';
            
            console.log('✅ Windows platform set');
            console.log('✅ Platform override set to: windows');
            console.log('🔄 Reloading page in 1 second...');
            
            setTimeout(() => {
                location.reload();
            }, 1000);
        },
        
        /**
         * Test Linux
         */
        testLinux: function() {
            console.log('🟣 Setting up LINUX platform test...');
            
            delete window.tizen;
            delete window.webOS;
            delete window.PalmSystem;
            delete window.__DS_TEST_PLATFORM__;
            localStorage.removeItem('ds_test_platform');
            
            Object.defineProperty(navigator, 'platform', {
                get: function() {
                    return 'Linux x86_64';
                },
                configurable: true
            });
            
            Object.defineProperty(navigator, 'userAgent', {
                get: function() {
                    return 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
                },
                configurable: true
            });
            
            localStorage.setItem('ds_test_platform', 'linux');
            window.__DS_TEST_PLATFORM__ = 'linux';
            
            console.log('✅ Linux platform set');
            console.log('✅ Platform override set to: linux');
            console.log('🔄 Reloading page in 1 second...');
            
            setTimeout(() => {
                location.reload();
            }, 1000);
        },
        
        /**
         * Clear test platform override
         */
        clear: function() {
            console.log('🧹 Clearing platform test override...');
            
            delete window.tizen;
            delete window.webOS;
            delete window.PalmSystem;
            delete window.__DS_TEST_PLATFORM__;
            localStorage.removeItem('ds_test_platform');
            localStorage.removeItem('ds_test_tizen_api');
            localStorage.removeItem('ds_test_webos_api');
            
            console.log('✅ Platform test override cleared');
            console.log('🔄 Reloading page in 1 second...');
            
            setTimeout(() => {
                location.reload();
            }, 1000);
        },
        
        /**
         * Check current platform
         */
        check: function() {
            console.log('\n📊 Current Platform Status:\n');
            console.log('localStorage override:', localStorage.getItem('ds_test_platform'));
            console.log('window.__DS_TEST_PLATFORM__:', window.__DS_TEST_PLATFORM__);
            console.log('window.tizen:', !!window.tizen);
            console.log('window.webOS:', !!window.webOS);
            console.log('window.PalmSystem:', !!window.PalmSystem);
            console.log('navigator.platform:', navigator.platform);
            console.log('navigator.userAgent:', navigator.userAgent);
            console.log('\n');
        }
    };
    
    console.log('\n✅ Platform Tester loaded!\n');
    console.log('Available commands:');
    console.log('  DSPlatformTester.testTizen()      - Test Tizen (Samsung TV)');
    console.log('  DSPlatformTester.testWebOS()     - Test WebOS (LG TV)');
    console.log('  DSPlatformTester.testBrightSign() - Test BrightSign');
    console.log('  DSPlatformTester.testAndroid()    - Test Android');
    console.log('  DSPlatformTester.testWindows()   - Test Windows');
    console.log('  DSPlatformTester.testLinux()     - Test Linux');
    console.log('  DSPlatformTester.clear()          - Clear test override');
    console.log('  DSPlatformTester.check()          - Check current status\n');
})();
