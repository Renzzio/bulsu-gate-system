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
  const [approvalData, setApprovalData] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [exitApprovalData, setExitApprovalData] = useState(null); // New state for exit approvals

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
      setShowStatusModal(true);
      return;
    }

    setLoading(true);
    setStatus(null);
    setShowStatusModal(false);

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
            setShowStatusModal(true);
          } else {
            setStatus({
              type: 'warning',
              message: `${result.message}`,
              details: result
            });
            setShowStatusModal(true);
          }
        } catch (error) {
          console.error('Visitor scan error:', error);
          setStatus({
            type: 'error',
            message: `Visitor scan failed: ${error.message || 'Unknown error'}`,
            details: error
          });
          setShowStatusModal(true);
        }
      } else {
        // For students: Immediate schedule check
        const payload = {
          studentId: scannedId,
          scanType,
          gateId
        };

        const response = await gateService.scanStudent(payload);

        // Handle scan results based on schedule
        if (response.exitApprovalNeeded) {
          // Student HAS schedule - show violation modal for entry approval
          setApprovalData({
            studentId: scannedId,
            scanType,
            gateId,
            studentName: response.log?.studentName,
            campusName: response.log?.campusName,
            scheduleSummary: response.log?.scheduleSummary
          });
          setLoading(false);
          return;
        } else {
          // Student has NO schedule - show denial modal immediately
          setStatus({
            type: 'warning',
            message: response.message,
            details: response
          });
          setShowStatusModal(true);
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
      setShowStatusModal(true);

      // Still refresh logs even on error to show any relevant updates
      setTimeout(() => {
        fetchLatestLog();
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  // Process approval with optional violation
  const processApproval = async (guardDecisionOverride = null) => {
    if (!approvalData && !exitApprovalData) return;

    setLoading(true);

    try {
      const payload = {
        studentId: approvalData?.studentId || exitApprovalData?.studentId,
        scanType: approvalData?.scanType || exitApprovalData?.scanType,
        gateId: approvalData?.gateId || exitApprovalData?.gateId
      };

      // Always include violation info (may be empty for normal access)
      payload.violationType = selectedViolation;
      payload.violationNotes = violationNotes || '';

      // Add guard decision for exit approvals
      if (exitApprovalData && guardDecisionOverride) {
        payload.guardDecision = guardDecisionOverride;
      }

      const response = await gateService.scanStudent(payload);

      // Determine appropriate message based on approval type
      let successMessage = approvalData?.scanType === 'entry' ? 'Entry Successful' : 'Exit Successful';

      // Check if this is a valid exit reason (not an actual violation)
      const validExitReasons = [
        'Health Emergency',
        'Family Emergency',
        'Appointment',
        'Authorized Early Dismissal',
        'School Business',
        'Other'
      ];

      const scanType = approvalData?.scanType || exitApprovalData?.scanType;
      const isValidExitReason = scanType === 'exit' && selectedViolation && validExitReasons.includes(selectedViolation);

      if (response.allowed && isValidExitReason) {
        // For valid exit reasons, show as approved - NO violation noted ever
        successMessage = `Exit Approved - ${selectedViolation}`;
      } else if (response.allowed && response.violationRecorded) {
        // For actual violations that were allowed (not valid exit reasons)
        successMessage = `${scanType === 'entry' ? 'Entry' : 'Exit'} Successful • Violation noted: ${selectedViolation || ''}`;
      } else if (response.allowed) {
        successMessage = `${scanType === 'entry' ? 'Entry' : 'Exit'} Successful`;
      }

      setStatus({
        type: response.allowed ? 'success' : 'warning',
        message: response.allowed ? successMessage : 'Access Denied',
        details: {
          ...response,
          log: response.log ? { ...response.log } : undefined // Shallow copy to avoid circular refs
        }
      });
      setShowStatusModal(true);

      // Clear inputs and approval data
      setScanInput('');
      setSelectedViolation('');
      setViolationNotes('');
      setApprovalData(null);
      setExitApprovalData(null);

      // Refresh latest log
      setTimeout(() => {
        fetchLatestLog();
      }, 500);
    } catch (error) {
      console.error('Approval error:', error);
      setStatus({
        type: 'error',
        message: error.message || 'Approval failed',
        details: error
      });
      setShowStatusModal(true);
      setApprovalData(null);
      setExitApprovalData(null);
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

      // Calculate qrbox size based on camera preview container
      const container = scannerElement.closest('.camera-preview');
      let qrboxSize;
      if (container) {
        const containerSize = Math.min(container.clientWidth, container.clientHeight);
        qrboxSize = Math.max(180, Math.min(containerSize * 0.7, 300));
      } else {
        // Fallback to responsive breakpoints
        qrboxSize = (window.innerWidth <= 480) ? 180 : (window.innerWidth <= 768) ? 200 : 250;
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
        qrbox: { width: qrboxSize, height: qrboxSize },
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

        // Reset the ref to ensure it's not reused
        html5QrCodeRef.current = null;
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

  const handleQRScanSuccess = async (decodedText) => {
    console.log('🔍 handleQRScanSuccess called with:', decodedText);

    // Extract userID from QR code - handle both direct IDs and URLs
    let scannedId = decodedText.trim();

    // If it looks like a URL, try to extract student ID
    const urlPattern = /\/student\/([^\/\?]+)$/;
    const match = scannedId.match(urlPattern);
    if (match) {
      scannedId = match[1];
      console.log('🔍 Extracted student ID from URL:', scannedId);
    } else if (scannedId.startsWith('http')) {
      // Try to get the last part as ID
      const parts = scannedId.split('/').filter(part => part);
      if (parts.length > 0) {
        scannedId = parts[parts.length - 1].split('?')[0];
        console.log('🔍 Extracted last part as student ID:', scannedId);
      }
    }

    console.log('🔍 Final scanned ID:', scannedId);

    // Immediately disable scanning to prevent duplicate processing and hide camera
    setScanning(false);
    setCameraActive(false);

    // Set the scanned ID to the input field and show immediate processing feedback
    console.log('🔍 Setting scanInput to:', scannedId);
    setScanInput(scannedId);

    console.log('🔍 Setting status to processing');
    setStatus({ type: 'info', message: `Processing QR code: ${scannedId}` });

    console.log('🔍 Setting showStatusModal to true');
    setShowStatusModal(true);

    // Force component update check
    console.log('🔍 Current state after setState - status:', { type: 'info', message: `Processing QR code: ${scannedId}` }, 'showStatusModal: true');

    // Stop scanning after successful scan
    try {
      await stopQRScanner();
      console.log('✅ Scanner stopped');
    } catch (error) {
      console.warn('⚠️ Failed to stop scanner after successful scan:', error);
    }

    // Defer processing to allow UI to update and prevent state conflicts
    setTimeout(async () => {
      console.log('⏰ setTimeout triggered, starting API processing');
      try {
        // Check if this is a visitor QR code
        if (scannedId.startsWith('VIS-')) {
          console.log('👥 Processing visitor scan');
          // Process visitor QR scan directly
          const result = await visitorService.processVisitorScan(scannedId, scanType, gateId);
          console.log('👥 Visitor scan result:', result);

          if (result.success && result.allowed) {
            setStatus({
              type: 'success',
              message: `${result.message} - Usage: ${result.visitor.usageCount}/${result.visitor.maxUses}`,
              details: { visitor: result.visitor, actionType: result.actionType }
            });
            setShowStatusModal(true);
          } else {
            setStatus({
              type: 'warning',
              message: `${result.message}`,
              details: result
            });
            setShowStatusModal(true);
          }
        } else {
          console.log('🎓 Processing student scan');
          // For students: Check schedule and show approval UI or denial modal
          const payload = {
            studentId: scannedId,
            scanType: scanType,
            gateId: gateId
          };

          console.log('📡 Calling scanStudent API:', payload);
          const response = await gateService.scanStudent(payload);
          console.log('📡 scanStudent response:', response);

          if (scanType === 'entry') {
            // ENTRY LOGIC
            if (response.exitApprovalNeeded) {
              console.log('✅ Student has schedule - showing violation approval modal');
              // Student HAS schedule - show violation modal for entry approval
              setApprovalData({
                studentId: scannedId,
                scanType,
                gateId,
                studentName: response.log?.studentName,
                campusName: response.log?.campusName,
                scheduleSummary: response.log?.scheduleSummary
              });
              // Close the processing modal since we're showing approval modal instead
              setShowStatusModal(false);
              console.log('✅ Approval modal data set, processing modal closed');
            } else {
              console.log('❌ Student has no schedule - showing denial modal');
              // Student has NO schedule - show denial modal immediately
              setStatus({
                type: 'warning',
                message: response.message,
                details: response
              });
              setShowStatusModal(true);
              console.log('❌ Denial modal set');
            }
          } else {
            // EXIT LOGIC
            if (response.exitApprovalNeeded) {
              console.log('🚪 Student has ongoing class - showing exit confirmation modal');
              // Student HAS ongoing class - show guard approval modal for exit
              setExitApprovalData({
                studentId: scannedId,
                scanType,
                gateId,
                studentName: response.log?.studentName,
                campusName: response.log?.campusName,
                scheduleSummary: response.log?.scheduleSummary
              });
              // Close the processing modal since we're showing approval modal instead
              setShowStatusModal(false);
              console.log('🚪 Exit approval modal data set, processing modal closed');
            } else {
              console.log('✅ Student has no ongoing class - showing allowed to exit modal');
              // Student has NO ongoing class - show success modal allowing exit
              setStatus({
                type: 'success',
                message: response.allowed ? 'Exit Allowed - No ongoing classes detected' : response.message,
                details: response
              });
              setShowStatusModal(true);
              console.log('✅ Exit allowed modal set');
            }
          }
        }

        // Refresh latest log after processing
        setTimeout(() => {
          fetchLatestLog();
        }, 500);
      } catch (error) {
        console.error('❌ Scan processing error:', error);
        setStatus({
          type: 'error',
          message: error.message || 'Scan processing failed',
          details: error
        });
        setShowStatusModal(true);
        setScanInput('');
      }
    }, 100);
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
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: (loading || scanning) ? 'pointer' : 'pointer',
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
                      background: 'rgba(220, 53, 69, 0.95)',
                      color: 'white',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)'
                    }}>
                      {scanError}
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    🔴 <span>LIVE</span>
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#333',
                    padding: '10px 20px',
                    borderRadius: '25px',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
                  }}>
                    <QrCode size={18} />
                    Position QR code within frame
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center',
                  padding: '20px'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    boxShadow: '0 4px 15px rgba(33, 150, 243, 0.3)'
                  }}>
                    <QrCode size={40} color="#1976d2" />
                  </div>
                  <h4 style={{
                    margin: '0 0 10px 0',
                    color: '#424242',
                    fontSize: '18px',
                    fontWeight: '600'
                  }}>
                    QR Code Scanner Ready
                  </h4>
                  <p style={{
                    margin: '0 0 8px 0',
                    color: '#666',
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    Click "Start QR Scanner" to begin scanning student IDs
                  </p>
                  <div style={{
                    background: 'linear-gradient(135deg, #fff3cd, #ffeaa7)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #fad44a',
                    fontSize: '13px',
                    color: '#856404',
                    marginTop: '15px'
                  }}>
                    <strong>⚠️ Camera Permission Required</strong><br />
                    Allow access when prompted by your browser
                  </div>
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
                {loading ? 'Checking...' : 'Submit'}
              </button>
            </form>

            {/* Clear approval UI when needed */}
            {(approvalData || exitApprovalData) && (
              <div style={{ margin: '10px 0', textAlign: 'center' }}>
                <button
                  onClick={() => { setApprovalData(null); setExitApprovalData(null); }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Clear & Start New Scan
                </button>
              </div>
            )}
          </div>

          {/* Inline Approval UI for students with schedule */}
          {approvalData && (
            <div style={{
              margin: '20px 0',
              padding: '20px',
              backgroundColor: '#e8f5e8',
              border: '1px solid #c8e6c9',
              borderRadius: '12px'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#2e7d2e', fontSize: '20px' }}>
                  ✅ Student Access Approval Required
                </h3>
                <p style={{ margin: '0', color: '#2e7d2e', fontSize: '16px' }}>
                  <strong>{approvalData.studentName || approvalData.studentId}</strong> has classes today
                </p>
                {approvalData.campusName && (
                  <p style={{ margin: '4px 0 0 0', color: '#2e7d2e', fontSize: '14px', fontStyle: 'italic' }}>
                    📍 {approvalData.campusName}
                  </p>
                )}
                {approvalData.scheduleSummary && (
                  <div style={{ marginTop: '10px', fontSize: '14px', color: '#2e7d2e' }}>
                    <p><strong>Subject:</strong> {approvalData.scheduleSummary.subjectName}</p>
                    <p><strong>Time:</strong> {approvalData.scheduleSummary.startTime} - {approvalData.scheduleSummary.endTime}</p>
                    <p><strong>Room:</strong> {approvalData.scheduleSummary.room}</p>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#495057',
                  fontSize: '14px'
                }}>
                  Report Violation (Optional):
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
                  <option value="">No violation - Grant access normally</option>
                  <option value="No Student ID">No Student ID</option>
                  <option value="Inappropriate Uniform">Inappropriate Uniform</option>
                  <option value="Other">Other (specify below)</option>
                </select>
              </div>

              {selectedViolation === 'Other' && (
                <div style={{ marginBottom: '20px' }}>
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
                <div style={{ marginBottom: '20px' }}>
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
                    <strong>⚠️ Will report:</strong> {selectedViolation}
                    {violationNotes && (
                      <div style={{ marginTop: '4px' }}>
                        <strong>Details:</strong> {violationNotes}
                      </div>
                    )}
                    <div style={{ marginTop: '8px', fontStyle: 'italic' }}>
                      Access will be granted, but violation will be logged for admin review.
                    </div>
                  </>
                ) : (
                  <>
                    <strong>✓ Normal access:</strong> Student will be granted access without violation reports.
                  </>
                )}
              </div>

              <button
                onClick={processApproval}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  backgroundColor: selectedViolation ? '#dc3545' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                {loading ? 'Processing...' : (selectedViolation ? 'Report Violation & Grant Access' : 'Grant Access')}
              </button>
            </div>
          )}

          {/* Exit Approval UI for students attempting to exit during class time */}
          {exitApprovalData && (
            <div style={{
              margin: '20px 0',
              padding: '20px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '12px'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#856404', fontSize: '20px' }}>
                  🚪 Exit During Class Time
                </h3>
                <p style={{ margin: '0', color: '#856404', fontSize: '16px', fontWeight: '600' }}>
                  <strong>{exitApprovalData.studentName || exitApprovalData.studentId}</strong> is attempting to exit during class
                </p>
                {exitApprovalData.campusName && (
                  <p style={{ margin: '4px 0 0 0', color: '#856404', fontSize: '14px', fontStyle: 'italic' }}>
                    📍 {exitApprovalData.campusName}
                  </p>
                )}
                {exitApprovalData.scheduleSummary && (
                  <div style={{ marginTop: '10px', fontSize: '14px', color: '#856404' }}>
                    <p><strong>Current Class:</strong> {exitApprovalData.scheduleSummary.subjectName}</p>
                    <p><strong>Time:</strong> {exitApprovalData.scheduleSummary.startTime} - {exitApprovalData.scheduleSummary.endTime}</p>
                    <p><strong>Room:</strong> {exitApprovalData.scheduleSummary.room}</p>
                  </div>
                )}
                <div style={{
                  marginTop: '15px',
                  padding: '12px 16px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#495057'
                }}>
                  <strong>⚠️ Security Approval Required:</strong> Student is leaving during scheduled class time. As security personnel, you need to confirm whether to allow this exit.
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#495057',
                  fontSize: '14px'
                }}>
                  Reason for untimely exit (Optional - helps with records):
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
                  <option value="">Personal reason - no violation</option>
                  <option value="Health Emergency">Health Emergency</option>
                  <option value="Family Emergency">Family Emergency</option>
                  <option value="Appointment">Medical/Dental Appointment</option>
                  <option value="Authorized Early Dismissal">Authorized Early Dismissal</option>
                  <option value="School Business">School Business</option>
                  <option value="Other">Other (specify below)</option>
                </select>
              </div>

              {selectedViolation === 'Other' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#495057',
                    fontSize: '14px'
                  }}>
                    Specify Reason:
                  </label>
                  <input
                    type="text"
                    value={violationNotes}
                    onChange={(e) => setViolationNotes(e.target.value)}
                    placeholder="Explain the reason for exit..."
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
                <div style={{ marginBottom: '20px' }}>
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
                backgroundColor: selectedViolation ? '#d4edda' : '#fff3cd',
                border: selectedViolation ? '1px solid #c8e6c9' : '1px solid #ffeaa7',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '13px',
                color: selectedViolation ? '#155724' : '#856404'
              }}>
                {selectedViolation ? (
                  <div style={{ marginTop: '4px' }}>
                    <strong>📝 Recorded reason:</strong> {selectedViolation}
                    {violationNotes && (
                      <div style={{ marginTop: '4px' }}>
                        <strong>Details:</strong> {violationNotes}
                      </div>
                    )}
                    <div style={{ marginTop: '8px' }}>
                      Exit will be allowed and logged with the provided reason.
                    </div>
                  </div>
                ) : (
                  <div>
                    <strong>⚠️ No reason specified:</strong> Exit will be allowed but recorded as "Personal reason - no violation".
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => processApproval('approve')}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  {loading ? 'Processing...' : 'Allow Exit'}
                </button>
                <button
                  onClick={() => processApproval('deny')}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  {loading ? 'Processing...' : 'Deny Exit'}
                </button>
              </div>
            </div>
          )}

          {/* Status Modal */}
          {showStatusModal && status && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '90vh',
                overflow: 'auto',
                animation: 'slideUp 0.3s ease'
              }}>
                {/* Modal Header */}
                <div style={{
                  backgroundColor: status.type === 'success' ? '#27ae60' : status.type === 'warning' ? '#f39c12' : status.type === 'info' ? '#007bff' : '#e74c3c',
                  color: 'white',
                  padding: '30px 20px',
                  textAlign: 'center',
                  borderTopLeftRadius: '20px',
                  borderTopRightRadius: '20px',
                  position: 'relative'
                }}>
                  <div style={{ fontSize: '64px', marginBottom: '15px' }}>
                    {status.type === 'success' ? '✅' : status.type === 'warning' ? '⚠️' : status.type === 'info' ? '⏳' : '❌'}
                  </div>
                  <h2 style={{ margin: '0', fontSize: '24px', fontWeight: 'bold' }}>
                    {status.type === 'success' ? 'ACCESS GRANTED' : status.type === 'warning' ? 'ACCESS DENIED' : status.type === 'info' ? 'PROCESSING SCAN' : 'ACCESS DENIED'}
                  </h2>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '30px' }}>
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '20px',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    {status.message}
                  </div>

                  {/* Reasons */}
                  {status.details?.reasons && status.details.reasons.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '16px' }}>Reasons:</h4>
                      <ul style={{ padding: 0, listStyle: 'none' }}>
                        {status.details.reasons.map((reason, index) => (
                          <li key={index} style={{
                            backgroundColor: '#f8f9fa',
                            padding: '8px 12px',
                            marginBottom: '5px',
                            borderRadius: '6px',
                            borderLeft: '3px solid #007bff',
                            fontSize: '14px'
                          }}>
                            • {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Schedule Summary */}
                  {status.details?.log?.scheduleSummary && (
                    <div style={{
                      backgroundColor: '#e8f5e8',
                      border: '1px solid #c8e6c9',
                      borderRadius: '8px',
                      padding: '15px',
                      marginBottom: '20px'
                    }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#2e7d2e', fontSize: '16px' }}>📚 Schedule Details</h4>
                      <div style={{ fontSize: '14px', color: '#2e7d2e' }}>
                        <p style={{ margin: '0 0 5px 0' }}><strong>Subject:</strong> {status.details.log.scheduleSummary.subjectName}</p>
                        <p style={{ margin: '0 0 5px 0' }}><strong>Time:</strong> {status.details.log.scheduleSummary.startTime} - {status.details.log.scheduleSummary.endTime}</p>
                        <p style={{ margin: '0' }}><strong>Room:</strong> {status.details.log.scheduleSummary.room}</p>
                      </div>
                    </div>
                  )}

                  {/* Close Button */}
                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setShowStatusModal(false);
                        setStatus(null);
                      }}
                      style={{
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        padding: '12px 30px',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,123,255,0.3)'
                      }}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                      {logs[0].allowed ? 'APPROVED' : 'DENIED'}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#6c757d' }}>
                    {new Date(logs[0].timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <div style={{ fontSize: '13px', color: '#495057' }}>
                    {logs[0].scanType === 'entry' ? 'Entry' : 'Exit'} at {logs[0].gateName || logs[0].gateId || 'Gate'}
                  </div>
                  {logs[0].campusName && (
                    <div style={{ fontSize: '11px', color: '#6c757d' }}>
                      {logs[0].campusName}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#999', fontSize: '14px' }}>No recent logs available</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default GateControlInterface;
