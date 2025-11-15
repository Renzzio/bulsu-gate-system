// frontend/src/components/GateControlInterface.js
import React, { useState, useEffect, useRef } from 'react';
import gateService from '../services/gateService';
import visitorService from '../services/visitorService';
import { QrCode, Camera, CameraOff } from 'lucide-react';
import './GateControlInterface.css';

// Import html5-qrcode
import { Html5Qrcode } from 'html5-qrcode';



const GateControlInterface = ({ user, onLogout }) => {
  const [scanInput, setScanInput] = useState('');
  const [scanType, setScanType] = useState('entry');
  const [gateId, setGateId] = useState('');
  const [availableGates, setAvailableGates] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [selectedViolation, setSelectedViolation] = useState('');
  const [violationNotes, setViolationNotes] = useState('');
  const [pendingScanData, setPendingScanData] = useState(null);

  // Range options (simplified since we only want latest)
  const rangeOptions = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];
  
  const qrCodeScannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const scannerId = 'qr-reader';

  // Fetch logs and gates on mount, and set up periodic refresh
  useEffect(() => {
    fetchLatestLog();
    fetchAvailableGates();

    // Auto-refresh latest log every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchLatestLog();
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  // Cleanup QR scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          const state = html5QrCodeRef.current.getState();
          if (state === 2 || state === 3) { // Only stop if scanning or paused
            html5QrCodeRef.current.stop().catch(() => {});
          }
        } catch (err) {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  const fetchAvailableGates = async () => {
    try {
      if (user?.campusId) {
        console.log('Fetching gates for campus:', user.campusId);
        const response = await gateService.getGatesByCampus(user.campusId);
        console.log('Gate response:', response);
        if (response.success && response.gates) {
          setAvailableGates(response.gates);
          // Set the first gate as default if no gate is selected
          if (!gateId && response.gates.length > 0) {
            setGateId(response.gates[0].gateId);
            console.log('Set default gate:', response.gates[0].gateId);
          }
        } else {
          console.warn('No gates returned for this campus:', response);
          setAvailableGates([]);
        }
      } else {
        console.warn('User has no campusId:', user);
      }
    } catch (error) {
      console.error('Failed to load gates:', error);
      setAvailableGates([]);
    }
  };

  const fetchLatestLog = async () => {
    setLogsLoading(true);
    try {
      const response = await gateService.getAccessLogs('day');
      if (response.logs && response.logs.length > 0) {
        // Sort by timestamp to get the latest
        const sortedLogs = response.logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setLogs([sortedLogs[0]]); // Only keep the latest log
      }
    } catch (error) {
      console.error('Failed to load latest log', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleScanSubmit = async (event) => {
    event.preventDefault();
    if (!scanInput.trim()) {
      setStatus({ type: 'error', message: 'Please enter or scan a student ID before submitting.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const scannedId = scanInput.trim();

      // Check if this is a visitor QR code
      if (scannedId.startsWith('VIS-')) {
        // Process visitor QR scan directly (no violation check for visitors)
        try {
          console.log('Processing visitor scan:', { scannedId, scanType, gateId });
          const result = await visitorService.processVisitorScan(scannedId, scanType, gateId);
          console.log('Visitor scan result:', result);

          if (result.success && result.allowed) {
            setStatus({
              type: 'success',
              message: `${result.message} - Usage: ${result.visitor.usageCount}/${result.visitor.maxUses}`,
              details: { visitor: result.visitor, actionType: result.actionType }
            });
          } else {
            setStatus({
              type: 'warning',
              message: `${result.message}`,
              details: result
            });
          }
        } catch (error) {
          console.error('Visitor scan error:', error);
          setStatus({
            type: 'error',
            message: `Visitor scan failed: ${error.message || 'Unknown error'}`,
            details: error
          });
        }
      } else {
        // For student scans, first check if access would be allowed normally
        const payload = {
          studentId: scannedId,
          scanType,
          gateId
        };

        const response = await gateService.scanStudent(payload);

        // If access would be granted, ask guard about violations
        if (response.allowed) {
          // Store pending scan data
          setPendingScanData({
            studentId: scannedId,
            scanType,
            gateId,
            normalResponse: response
          });
          setLoading(false); // Reset loading state
          return; // Exit early, don't show status yet
        } else {
          // Access would be denied anyway, show denied status directly
          setStatus({
            type: 'warning',
            message: response.message,
            details: response
          });
        }
      }

      // Clear input fields
      setScanInput('');

      // Refresh latest log after successful/failed scan
      if (!loading) { // Only if we weren't already loading
        setTimeout(() => {
          fetchLatestLog();
        }, 500); // Small delay to ensure log is saved
      }
    } catch (error) {
      console.error('Scan error:', error);
      setStatus({
        type: 'error',
        message: error.message || 'Scan failed',
        details: error
      });

      // Still refresh logs even on error to show any relevant updates
      setTimeout(() => {
        fetchLatestLog();
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  // Process the scan with optional violation reporting
  const processScanWithViolation = async () => {
    if (!pendingScanData) return;

    setLoading(true);

    try {
      const payload = {
        studentId: pendingScanData.studentId,
        scanType: pendingScanData.scanType,
        gateId: pendingScanData.gateId
      };

      // Add violation info if selected
      if (selectedViolation) {
        payload.violationType = selectedViolation;
        payload.violationNotes = violationNotes || '';
      }

      const response = await gateService.scanStudent(payload);
      setStatus({
        type: response.allowed ? 'success' : 'warning',
        message: response.violationRecorded
          ? `${response.message} • Violation noted: ${selectedViolation}`
          : response.message,
        details: response
      });

      // Clear inputs and violation data
      setScanInput('');
      setSelectedViolation('');
      setViolationNotes('');
      setPendingScanData(null);

      // Refresh latest log
      setTimeout(() => {
        fetchLatestLog();
      }, 500);
    } catch (error) {
      console.error('Scan with violation error:', error);
      setStatus({
        type: 'error',
        message: error.message || 'Scan failed',
        details: error
      });
      setPendingScanData(null);
    } finally {
      setLoading(false);
    }
  };

  // Skip violation reporting and process normal scan
  const processScanWithoutViolation = async () => {
    if (!pendingScanData) return;

    setLoading(true);

    try {
      const response = pendingScanData.normalResponse;
      setStatus({
        type: 'success',
        message: response.message,
        details: response
      });

      // Clear inputs
      setScanInput('');
      setSelectedViolation('');
      setViolationNotes('');
      setPendingScanData(null);

      // Refresh latest log
      setTimeout(() => {
        fetchLatestLog();
      }, 500);
    } catch (error) {
      console.error('Normal scan error:', error);
      setStatus({
        type: 'error',
        message: error.message || 'Scan failed',
        details: error
      });
      setPendingScanData(null);
    } finally {
      setLoading(false);
    }
  };



  const checkCameraPermissions = async () => {
    try {
      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return { granted: false, error: 'Camera access not supported in this browser.' };
      }

      // Check if we're running on HTTPS (required for camera access in most browsers)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        return { granted: false, error: 'Camera access requires a secure HTTPS connection. Please use https:// URL or localhost.' };
      }

      // Request camera permission with a timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Camera permission check timed out')), 5000);
      });

      const permissionPromise = navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      const stream = await Promise.race([permissionPromise, timeoutPromise]);

      // Stop the test stream immediately
      stream.getTracks().forEach(track => track.stop());
      return { granted: true };
    } catch (error) {
      console.error('Camera permission check failed:', error);
      let errorMessage = '';

      if (error.message && error.message.includes('timed out')) {
        errorMessage = 'Camera permission check timed out. Please try again.';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please click "Allow" when prompted for camera permissions, or check browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device. Please ensure you have a working camera.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application. Please close other apps using the camera (like video calls, other browser tabs, or camera apps) and try again.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not meet requirements. Please try with a different camera or device.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Camera access blocked due to security restrictions. Please ensure you\'re using HTTPS or localhost.';
      } else {
        errorMessage = 'Camera access failed. Please check your camera permissions and ensure no other applications are using the camera.';
      }

      return { granted: false, error: errorMessage };
    }
  };

  const startQRScanner = async () => {
    try {
      console.log('Starting QR scanner...');
      setScanError('');

      // Check if Html5Qrcode is available
      if (typeof Html5Qrcode === 'undefined' || !Html5Qrcode) {
        console.error('Html5Qrcode is not available');
        throw new Error('Html5Qrcode library not loaded. Please refresh the page.');
      }

      // Check camera permissions first
      console.log('Checking camera permissions...');
      const permissionCheck = await checkCameraPermissions();
      if (!permissionCheck.granted) {
        throw new Error(permissionCheck.error);
      }

      // Set cameraActive to true first so the DOM element renders
      setCameraActive(true);
      setScanning(true);

      // Wait for the DOM to update and render the scanner element
      await new Promise(resolve => setTimeout(resolve, 200));

      // Ensure the scanner element exists
      const scannerElement = document.getElementById(scannerId);
      if (!scannerElement) {
        console.error('Scanner element not found:', scannerId);
        throw new Error('Scanner element not found');
      }

      // Clean up any existing scanner instance
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          await html5QrCodeRef.current.clear();
        } catch (cleanupError) {
          console.warn('Error cleaning up previous scanner:', cleanupError);
        }
      }

      console.log('Creating new Html5Qrcode instance...');
      html5QrCodeRef.current = new Html5Qrcode(scannerId);

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false
      };

      console.log('Starting camera...');
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' }, // Use back camera if available
        config,
        (decodedText, decodedResult) => {
          // Successfully scanned QR code
          console.log('QR Code scanned:', decodedText);
          handleQRScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Scan error (ignore - it's just scanning, not an actual error)
          // Only log if it's not a common scanning message
          if (!errorMessage.includes('NotFoundException') && !errorMessage.includes('QR code parse error')) {
            console.log('Scanning error:', errorMessage);
          }
        }
      );

      console.log('Camera started successfully');
    } catch (err) {
      console.error('Error starting QR scanner:', err);
      let errorMessage = 'Failed to start camera. ';

      // Use specific error messages
      if (err.message && (err.message.includes('HTTPS') || err.message.includes('localhost'))) {
        errorMessage = err.message;
      } else if (err.name === 'NotAllowedError') {
        errorMessage += 'Camera access denied. Please click "Allow" when prompted for camera permissions.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Camera is already in use by another application. Please close other apps using the camera and try again.';
      } else {
        errorMessage += err.message || 'Please check permissions and try again.';
      }

      setScanError(errorMessage);
      setScanning(false);
      setCameraActive(false);
    }
  };

  const stopQRScanner = async () => {
    try {
      if (html5QrCodeRef.current) {
        console.log('Stopping QR scanner...');
        // Check if scanner is actually running before trying to stop
        try {
          const state = html5QrCodeRef.current.getState();
          console.log('Scanner state:', state);
          if (state === 2 || state === 3) { // 2 = SCANNING, 3 = PAUSED
            await html5QrCodeRef.current.stop();
          }
        } catch (stateError) {
          console.log('State check failed, scanner might not be running:', stateError);
        }

        try {
          await html5QrCodeRef.current.clear();
        } catch (clearError) {
          console.log('Clear failed, scanner might not be initialized:', clearError);
        }
      }
      setScanning(false);
      setCameraActive(false);
      setScanError('');
    } catch (err) {
      console.error('Error stopping QR scanner:', err);
      // Still reset states even if there's an error
      setScanning(false);
      setCameraActive(false);
    }
  };

  const handleQRScanSuccess = (decodedText) => {
    // Extract userID from QR code
    // The QR code could be a userID or a visitor code (VIS- prefixed)
    const scannedId = decodedText.trim();

    // Set the scanned ID to the input field
    setScanInput(scannedId);
    setStatus(null);

    // Stop scanning after successful scan
    try {
      stopQRScanner();
    } catch (error) {
      console.warn('Failed to stop scanner after successful scan:', error);
      // Reset the states manually if stopping fails
      setScanning(false);
      setCameraActive(false);
    }

    // Check if this is a visitor QR code
    const isVisitor = scannedId.startsWith('VIS-');
    let validationMessage = '';

    if (isVisitor) {
      validationMessage = `Visitor QR Code scanned! ID: ${scannedId}`;
    } else {
      validationMessage = `Student ID scanned successfully! ID: ${scannedId}`;
    }

    setStatus({
      type: 'success',
      message: validationMessage
    });

    // Clear the success message after 2 seconds
    setTimeout(() => {
      setStatus(null);
    }, 2000);
  };

  const toggleCamera = async (e) => {
    e?.preventDefault?.();
    console.log('Toggle camera clicked, current state:', { scanning, cameraActive });

    // Add a simple alert to test if button is working
    if (!scanning && !cameraActive) {
      // First time clicking - show that button works
      console.log('Button clicked - attempting to start scanner');

      // Refresh logs when starting camera
      setTimeout(() => {
        fetchLatestLog();
      }, 100);
    } else {
      console.log('Stopping scanner...');

      // Refresh logs when stopping camera
      setTimeout(() => {
        fetchLatestLog();
      }, 500);
    }

    if (scanning) {
      await stopQRScanner();
    } else {
      await startQRScanner();
    }
  };

  return (
    <div className="gate-interface">
      <div className="gate-grid">
        <section className="scanner-panel">
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <button
              type="button"
              className={`camera-toggle ${cameraActive ? 'active' : ''}`}
              onClick={toggleCamera}
              disabled={loading || scanning}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: (loading || scanning) ? 'not-allowed' : 'pointer',
                margin: '0 auto',
                padding: '12px 24px',
                fontSize: '16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: cameraActive ? '#e74c3c' : '#27ae60',
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              {cameraActive ? (
                <>
                  <CameraOff size={20} />
                  Stop Scanner
                </>
              ) : (
                <>
                  <Camera size={20} />
                  Start QR Scanner
                </>
              )}
            </button>
          </div>

          <div className="scanner-body">
            <div className={`camera-preview ${cameraActive ? 'active' : ''}`}>
              {cameraActive ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <div id={scannerId} style={{ width: '100%', height: '100%' }}></div>
                  {scanError && (
                    <div style={{ 
                      position: 'absolute', 
                      top: '10px', 
                      left: '10px', 
                      right: '10px',
                      background: 'rgba(255, 0, 0, 0.9)',
                      color: 'white',
                      padding: '10px',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}>
                      {scanError}
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <QrCode size={16} />
                    Point camera at QR code
                  </div>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  color: '#999',
                  gap: '12px'
                }}>
                  <QrCode size={48} />
                  <p>Click "Start QR Scanner" to begin scanning</p>
                  <p style={{ fontSize: '12px' }}>Make sure to allow camera permissions</p>
                </div>
              )}
            </div>

            <form className="scan-form" onSubmit={handleScanSubmit}>
              <label htmlFor="scan-id">Student ID / QR code value</label>
              <input
                id="scan-id"
                type="text"
                placeholder="Scan or enter student ID"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                autoComplete="off"
                disabled={loading}
              />

              <div className="form-row">
                <div>
                  <label htmlFor="scan-type">Scan Type</label>
                  <select
                    id="scan-type"
                    value={scanType}
                    onChange={(e) => setScanType(e.target.value)}
                    disabled={loading}
                  >
                    <option value="entry">Entry</option>
                    <option value="exit">Exit</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="gate-id">Gate</label>
                  <select
                    id="gate-id"
                    value={gateId}
                    onChange={(e) => setGateId(e.target.value)}
                    disabled={loading}
                    required
                  >
                    <option value="">Select Gate</option>
                    {availableGates.map(gate => (
                      <option key={gate.gateId} value={gate.gateId}>
                        {gate.name} ({gate.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>



              <button type="submit" className="scan-submit" disabled={loading}>
                {loading ? 'Checking...' : 'Scan & Verify'}
              </button>
            </form>
          </div>

          {status && (
            <div className={`scan-status-large ${status.type}`} style={{
              textAlign: 'center',
              margin: '20px auto',
              padding: '40px',
              borderRadius: '15px',
              backgroundColor: status.type === 'success' ? '#27ae60' : status.type === 'warning' ? '#f39c12' : '#e74c3c',
              color: 'white',
              fontSize: '48px',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              maxWidth: '600px'
            }}>
              <div className="status-indicator" style={{ fontSize: '72px', marginBottom: '20px' }}>
                {status.type === 'success' ? '✅ ACCESS GRANTED' : status.type === 'warning' ? '⚠️ ACCESS DENIED' : '❌ ACCESS DENIED'}
              </div>
              <div style={{ fontSize: '24px' }}>
                {status.message}
              </div>
              {status.details?.reasons && status.details.reasons.length > 0 && (
                <div style={{ fontSize: '18px', marginTop: '20px' }}>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {status.details.reasons.map((reason, index) => (
                      <li key={index}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              {status.details?.log?.scheduleSummary && (
                <div className="schedule-summary" style={{ fontSize: '18px', marginTop: '20px' }}>
                  <p><strong>Subject:</strong> {status.details.log.scheduleSummary.subjectName}</p>
                  <p><strong>Time:</strong> {status.details.log.scheduleSummary.startTime} - {status.details.log.scheduleSummary.endTime}</p>
                  <p><strong>Room:</strong> {status.details.log.scheduleSummary.room}</p>
                </div>
              )}
            </div>
          )}

          {/* Latest Log Section */}
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#495057' }}>Latest Access Log</h3>
            {logsLoading ? (
              <div style={{ textAlign: 'center', color: '#999', fontSize: '14px' }}>Loading logs...</div>
            ) : logs.length > 0 ? (
              <div style={{ backgroundColor: 'white', borderRadius: '6px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '14px' }}>{logs[0].studentName || logs[0].studentId || 'Student'}</strong>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      backgroundColor: logs[0].allowed ? '#d4edda' : '#f8d7da',
                      color: logs[0].allowed ? '#155724' : '#721c24'
                    }}>
                      {logs[0].allowed ? 'APROVED' : 'DENIED'}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#6c757d' }}>
                    {new Date(logs[0].timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#495057' }}>
                  {logs[0].scanType === 'entry' ? 'Entry' : 'Exit'} at {logs[0].gateName || logs[0].gateId || 'Gate'}
                </div>
                {logs[0].campusName && (
                  <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>
                    {logs[0].campusName}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#999', fontSize: '14px' }}>No recent logs available</div>
            )}
          </div>
        </section>
      </div>

      {/* Violation Panel - Right Side */}
      {pendingScanData && (
        <section className="violation-panel" style={{
          position: 'fixed',
          right: '24px',
          top: '24px',
          bottom: '24px',
          width: '350px',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          border: '1px solid #e9ecef',
          zIndex: 100,
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: '#e8f5e8',
            border: '1px solid #c8e6c9',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#2e7d2e', fontSize: '18px' }}>
                ✅ Access Granted
              </h3>
              <p style={{ margin: '0', color: '#2e7d2e', fontSize: '16px' }}>
                <strong>{pendingScanData.normalResponse?.log?.studentName || pendingScanData.studentId}</strong> can enter.
              </p>
              {pendingScanData.normalResponse?.log?.campusName && (
                <p style={{ margin: '4px 0 0 0', color: '#2e7d2e', fontSize: '14px', fontStyle: 'italic' }}>
                  📍 {pendingScanData.normalResponse.log.campusName}
                </p>
              )}
              <p style={{ margin: '4px 0 0 0', color: '#2e7d2e', fontSize: '14px', fontStyle: 'italic' }}>
                Check for violations before granting entry
              </p>
          </div>

          <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#495057' }}>
            Report Violation (Optional)
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#495057',
              fontSize: '14px'
            }}>
              Violation Type:
            </label>
            <select
              value={selectedViolation}
              onChange={(e) => setSelectedViolation(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="">No violation - Proceed normally</option>
              <option value="Inappropriate Uniform">Inappropriate Uniform</option>
              <option value="No Student ID">No Student ID</option>
              <option value="Late">Late (after class start)</option>
              <option value="Unauthorized Item">Unauthorized Item</option>
              <option value="Disrupting Behavior">Disrupting Behavior</option>
              <option value="Other">Other (specify below)</option>
            </select>
          </div>

          {(selectedViolation === 'Other') && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#495057',
                fontSize: '14px'
              }}>
                Violation Details:
              </label>
              <input
                type="text"
                value={violationNotes}
                onChange={(e) => setViolationNotes(e.target.value)}
                placeholder="Describe the violation..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          )}

          {selectedViolation && selectedViolation !== 'Other' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#495057',
                fontSize: '14px'
              }}>
                Additional Notes (Optional):
              </label>
              <input
                type="text"
                value={violationNotes}
                onChange={(e) => setViolationNotes(e.target.value)}
                placeholder="Any additional details..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          )}

          <div style={{
            backgroundColor: selectedViolation ? '#fff3cd' : '#f8f9fa',
            border: selectedViolation ? '1px solid #ffeaa7' : '1px solid #dee2e6',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '20px',
            fontSize: '13px',
            color: selectedViolation ? '#856404' : '#6c757d'
          }}>
            {selectedViolation ? (
              <>
                <strong>⚠️ Violation to report:</strong> {selectedViolation}
                {violationNotes && (
                  <div style={{ marginTop: '4px' }}>
                    <strong>Details:</strong> {violationNotes}
                  </div>
                )}
                <div style={{ marginTop: '8px', fontStyle: 'italic' }}>
                  Student will still be granted access, but the violation will be logged and sent to admin.
                </div>
              </>
            ) : (
              <>
                <strong>✓ No violation:</strong> Student will be granted normal access.
                <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                  Access granted without any reported violations.
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={processScanWithoutViolation}
              disabled={loading}
              style={{
                padding: '12px 20px',
                backgroundColor: selectedViolation ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                width: '100%'
              }}
            >
              {loading ? 'Processing...' : (selectedViolation ? 'Cancel Violation' : 'Grant Access')}
            </button>

            {selectedViolation && (
              <button
                onClick={processScanWithViolation}
                disabled={loading}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  width: '100%'
                }}
              >
                {loading ? 'Processing...' : 'Report & Grant Access'}
              </button>
            )}
          </div>

          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: 'transparent',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#6c757d',
            textAlign: 'center'
          }}>
            Student will be granted access in all cases.
            Violation reports help administrators monitor policy compliance.
          </div>
        </section>
      )}
    </div>
  );
};

export default GateControlInterface;
