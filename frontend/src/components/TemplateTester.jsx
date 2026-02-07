import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Loader } from 'lucide-react';
import { validateTemplate } from '../utils/templateValidation';
import api, { API_BASE_URL } from '../lib/api';
import './TemplateTester.css';

export default function TemplateTester({
    template,
    zones,
    mediaAssets = [],
    isOpen,
    onClose
}) {
    const [testResults, setTestResults] = useState(null);
    const [isTesting, setIsTesting] = useState(false);
    const [performanceMetrics, setPerformanceMetrics] = useState(null);
    const [widgetTests, setWidgetTests] = useState({});

    useEffect(() => {
        if (isOpen && template) {
            runTests();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const runTests = async () => {
        setIsTesting(true);
        setTestResults(null);
        setPerformanceMetrics(null);
        setWidgetTests({});

        const startTime = performance.now();

        // Run validation
        const validation = validateTemplate(template, zones, mediaAssets);

        // Test widget configurations
        const widgetTestResults = {};
        zones.forEach(zone => {
            if (zone.contentType === 'widget') {
                widgetTestResults[zone.id] = testWidget(zone);
            }
        });

        // Test media loading
        const mediaTestResults = await testMediaLoading(zones, mediaAssets);

        // Calculate performance
        const endTime = performance.now();
        const loadTime = endTime - startTime;

        setTestResults({
            validation,
            media: mediaTestResults,
            widget: widgetTestResults
        });

        setPerformanceMetrics({
            loadTime: loadTime.toFixed(2),
            zoneCount: zones.length,
            widgetCount: zones.filter(z => z.contentType === 'widget').length,
            mediaCount: zones.filter(z => z.contentType === 'media').length
        });

        setIsTesting(false);
    };

    const testWidget = (zone) => {
        const results = {
            id: zone.id,
            name: zone.name,
            type: zone.widgetType,
            errors: [],
            warnings: [],
            status: 'success'
        };

        const config = zone.widgetConfig || {};

        switch (zone.widgetType) {
            case 'weather':
                if (!config.apiKey || config.apiKey.trim().length === 0) {
                    results.errors.push('Weather API key is missing');
                    results.status = 'error';
                } else {
                    // Test API key validity (basic check)
                    if (config.apiKey.length < 20) {
                        results.warnings.push('API key seems too short. Verify it is correct.');
                    }
                }
                if (!config.location || config.location.trim().length === 0) {
                    results.errors.push('Location is required');
                    results.status = 'error';
                }
                break;

            case 'qrcode':
                if (!config.text && !config.url) {
                    results.errors.push('URL or text is required for QR code');
                    results.status = 'error';
                }
                break;

            case 'webview':
                if (!config.url || config.url.trim().length === 0) {
                    results.errors.push('URL is required for web view');
                    results.status = 'error';
                } else {
                    try {
                        new URL(config.url);
                    } catch {
                        results.errors.push('Invalid URL format');
                        results.status = 'error';
                    }
                }
                break;

            case 'text':
                if (!config.content && !config.text) {
                    results.errors.push('Text content is required');
                    results.status = 'error';
                }
                break;

            default:
                break;
        }

        if (results.warnings.length > 0 && results.status === 'success') {
            results.status = 'warning';
        }

        return results;
    };

    const testMediaLoading = async (zones, assets) => {
        const mediaZones = zones.filter(z => z.contentType === 'media' && z.mediaAssetId);
        const results = {
            total: mediaZones.length,
            loaded: 0,
            failed: 0,
            missing: 0,
            details: []
        };

        for (const zone of mediaZones) {
            const asset = assets.find(a => a.id === zone.mediaAssetId);
            if (!asset) {
                results.missing++;
                results.details.push({
                    zoneId: zone.id,
                    zoneName: zone.name,
                    status: 'missing',
                    message: 'Media asset not found in library'
                });
                continue;
            }

            // Test if media URL is accessible
            try {
                const apiUrl = API_BASE_URL;
                const mediaUrl = `${apiUrl}${asset.url}`;

                const response = await fetch(mediaUrl, { method: 'HEAD' });
                if (response.ok) {
                    results.loaded++;
                    results.details.push({
                        zoneId: zone.id,
                        zoneName: zone.name,
                        assetName: asset.originalName,
                        status: 'success',
                        message: 'Media asset is accessible'
                    });
                } else {
                    results.failed++;
                    results.details.push({
                        zoneId: zone.id,
                        zoneName: zone.name,
                        assetName: asset.originalName,
                        status: 'error',
                        message: `Failed to load: ${response.status} ${response.statusText}`
                    });
                }
            } catch (error) {
                results.failed++;
                results.details.push({
                    zoneId: zone.id,
                    zoneName: zone.name,
                    assetName: asset.originalName,
                    status: 'error',
                    message: `Network error: ${error.message}`
                });
            }
        }

        return results;
    };

    if (!isOpen || !template) return null;

    return (
        <div className="template-tester-overlay" onClick={onClose}>
            <div className="template-tester-modal" onClick={(e) => e.stopPropagation()}>
                <div className="tester-header">
                    <h3>Template Testing Suite</h3>
                    <div className="tester-actions">
                        <button
                            className="btn btn-sm btn-outline"
                            onClick={runTests}
                            disabled={isTesting}
                        >
                            {isTesting ? (
                                <>
                                    <Loader size={16} className="spinning" />
                                    Testing...
                                </>
                            ) : (
                                'Run Tests'
                            )}
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={onClose}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="tester-content">
                    {isTesting ? (
                        <div className="tester-loading">
                            <Loader size={48} className="spinning" />
                            <p>Running tests...</p>
                        </div>
                    ) : testResults ? (
                        <>
                            {/* Validation Results */}
                            <div className="test-section">
                                <h4>Validation Results</h4>
                                <div className="test-summary">
                                    <div className={`test-badge ${testResults.validation.isValid ? 'success' : 'error'}`}>
                                        {testResults.validation.isValid ? (
                                            <>
                                                <CheckCircle size={16} />
                                                Valid
                                            </>
                                        ) : (
                                            <>
                                                <XCircle size={16} />
                                                Invalid
                                            </>
                                        )}
                                    </div>
                                    <div className="test-counts">
                                        <span className="error-count">{testResults.validation.errors.length} errors</span>
                                        <span className="warning-count">{testResults.validation.warnings.length} warnings</span>
                                    </div>
                                </div>

                                {testResults.validation.errors.length > 0 && (
                                    <div className="test-list errors">
                                        <h5>Errors</h5>
                                        {testResults.validation.errors.map((error, idx) => (
                                            <div key={idx} className="test-item error">
                                                <XCircle size={16} />
                                                <span>{error.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {testResults.validation.warnings.length > 0 && (
                                    <div className="test-list warnings">
                                        <h5>Warnings</h5>
                                        {testResults.validation.warnings.map((warning, idx) => (
                                            <div key={idx} className="test-item warning">
                                                <AlertTriangle size={16} />
                                                <span>{warning.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Widget Tests */}
                            {Object.keys(testResults.widget).length > 0 && (
                                <div className="test-section">
                                    <h4>Widget Configuration Tests</h4>
                                    {Object.values(testResults.widget).map((result) => (
                                        <div key={result.id} className={`widget-test-result ${result.status}`}>
                                            <div className="widget-test-header">
                                                <div className="widget-test-name">
                                                    {result.status === 'success' && <CheckCircle size={16} />}
                                                    {result.status === 'error' && <XCircle size={16} />}
                                                    {result.status === 'warning' && <AlertTriangle size={16} />}
                                                    <span>{result.name} ({result.type})</span>
                                                </div>
                                            </div>
                                            {result.errors.length > 0 && (
                                                <div className="widget-test-errors">
                                                    {result.errors.map((error, idx) => (
                                                        <div key={idx} className="test-item error">
                                                            {error}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {result.warnings.length > 0 && (
                                                <div className="widget-test-warnings">
                                                    {result.warnings.map((warning, idx) => (
                                                        <div key={idx} className="test-item warning">
                                                            {warning}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Media Tests */}
                            {testResults.media.total > 0 && (
                                <div className="test-section">
                                    <h4>Media Loading Tests</h4>
                                    <div className="test-summary">
                                        <div className="test-stats">
                                            <span className="stat-item success">
                                                <CheckCircle size={16} />
                                                {testResults.media.loaded} loaded
                                            </span>
                                            <span className="stat-item error">
                                                <XCircle size={16} />
                                                {testResults.media.failed} failed
                                            </span>
                                            <span className="stat-item warning">
                                                <AlertTriangle size={16} />
                                                {testResults.media.missing} missing
                                            </span>
                                        </div>
                                    </div>
                                    <div className="test-list">
                                        {testResults.media.details.map((detail, idx) => (
                                            <div key={idx} className={`test-item ${detail.status}`}>
                                                {detail.status === 'success' && <CheckCircle size={16} />}
                                                {detail.status === 'error' && <XCircle size={16} />}
                                                {detail.status === 'missing' && <AlertTriangle size={16} />}
                                                <div>
                                                    <strong>{detail.zoneName}</strong>
                                                    {detail.assetName && <span> - {detail.assetName}</span>}
                                                    <div className="test-message">{detail.message}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Performance Metrics */}
                            {performanceMetrics && (
                                <div className="test-section">
                                    <h4>Performance Metrics</h4>
                                    <div className="performance-metrics">
                                        <div className="metric-item">
                                            <span className="metric-label">Load Time:</span>
                                            <span className="metric-value">{performanceMetrics.loadTime}ms</span>
                                        </div>
                                        <div className="metric-item">
                                            <span className="metric-label">Total Zones:</span>
                                            <span className="metric-value">{performanceMetrics.zoneCount}</span>
                                        </div>
                                        <div className="metric-item">
                                            <span className="metric-label">Widgets:</span>
                                            <span className="metric-value">{performanceMetrics.widgetCount}</span>
                                        </div>
                                        <div className="metric-item">
                                            <span className="metric-label">Media:</span>
                                            <span className="metric-value">{performanceMetrics.mediaCount}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="tester-empty">
                            <p>Click "Run Tests" to validate your template</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
