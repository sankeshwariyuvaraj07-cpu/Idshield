import { useEffect, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, BusFront, Camera, CameraOff,
  Check, ChevronRight, Clock3, Clipboard, ClipboardCheck, FileCheck2, FileImage,
  Fingerprint, History, Languages, LayoutDashboard, ListOrdered, LockKeyhole,
  QrCode, ScanLine, Shield, ShieldAlert, ShieldCheck, TicketCheck, Upload,
  Users, X, Zap,
} from 'lucide-react'
import { apiRequest } from './services/api'
import './TransitView.css'

const demoHistory = [
  { id: 'TR-8042', passenger: 'Demo passenger A', document: 'Aadhaar · masked', time: '10:42 AM', status: 'MANUAL REVIEW REQUIRED', demo: true },
  { id: 'TR-8041', passenger: 'Demo passenger B', document: 'Alternative ID', time: '10:39 AM', status: 'VERIFIED · DEMO', demo: true },
  { id: 'TR-8040', passenger: 'Demo passenger C', document: 'Aadhaar · masked', time: '10:35 AM', status: 'MANUAL REVIEW REQUIRED', demo: true },
]

const demoResult = {
  mode: 'demo',
  finalStatus: 'VERIFIED · DEMO ONLY',
  document: 'Aadhaar · masked',
  qr: { status: 'fixture (simulated)', signatureVerification: 'not performed' },
  documentIntegrity: 'Demo fixture only · not checked',
  eligibility: 'Demo policy fixture only · not official',
  notice: 'Fictional sample only. No Aadhaar Secure QR signature, document integrity, or official eligibility check was performed.',
}

const menuItems = [
  ['overview', LayoutDashboard, 'overview'],
  ['scanner', ScanLine, 'scanner'],
  ['queue', ListOrdered, 'queue'],
  ['history', History, 'history'],
  ['analytics', BarChart3, 'analytics'],
]

const interfaceCopy = {
  en: {
    overview: 'Overview',
    scanner: 'Smart bus scanner',
    queue: 'Boarding queue',
    history: 'Verification history',
    analytics: 'Analytics & reports',
    startScan: 'Start a scan',
    demo: 'Try fictional demo',
    scannerTitle: 'Scan a travel document',
    camera: 'Open camera',
    capture: 'Capture frame',
    stop: 'Stop camera',
    upload: 'Upload image',
    analyze: 'Analyze image',
    processing: 'Processing image…',
    alternative: 'Alternative-ID review',
    routeReview: 'Route to manual review',
    addQueue: 'Add anonymous slot',
    queueTitle: 'Boarding queue pulse',
    queueDescription: 'Anonymous boarding slots and human-review handoffs for this browser session.',
    startReview: 'Start review',
    takeReview: 'Take review',
    finishReview: 'Mark reviewed',
    waiting: 'Waiting',
    manualReview: 'Manual review',
    inReview: 'In review',
    reviewed: 'Review recorded · no verification outcome',
    demoSlot: 'Fictional demo slot',
    privacyReceipt: 'Privacy receipt',
    copyReceipt: 'Copy privacy receipt',
    receiptCopied: 'Privacy receipt copied.',
    language: 'Switch interface language',
  },
  kn: {
    overview: 'ಮುನ್ನೋಟ',
    scanner: 'ಸ್ಮಾರ್ಟ್ ಬಸ್ ಸ್ಕ್ಯಾನರ್',
    queue: 'ಪ್ರಯಾಣಿಕರ ಸರದಿ',
    history: 'ಪರಿಶೀಲನೆ ಇತಿಹಾಸ',
    analytics: 'ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ವರದಿಗಳು',
    startScan: 'ಸ್ಕ್ಯಾನ್ ಪ್ರಾರಂಭಿಸಿ',
    demo: 'ಕಾಲ್ಪನಿಕ ಡೆಮೋ ನೋಡಿ',
    scannerTitle: 'ಪ್ರಯಾಣದ ಗುರುತಿನ ದಾಖಲೆಯನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    camera: 'ಕ್ಯಾಮೆರಾ ತೆರೆಯಿರಿ',
    capture: 'ಚಿತ್ರ ಸೆರೆಹಿಡಿಯಿರಿ',
    stop: 'ಕ್ಯಾಮೆರಾ ನಿಲ್ಲಿಸಿ',
    upload: 'ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
    analyze: 'ಚಿತ್ರವನ್ನು ವಿಶ್ಲೇಷಿಸಿ',
    processing: 'ಚಿತ್ರವನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…',
    alternative: 'ಪರ್ಯಾಯ ಗುರುತಿನ ಪರಿಶೀಲನೆ',
    routeReview: 'ಕೈಯಾರೆ ಪರಿಶೀಲನೆಗೆ ಕಳುಹಿಸಿ',
    addQueue: 'ಅನಾಮಧೇಯ ಸರದಿ ಸೇರಿಸಿ',
    queueTitle: 'ಬೋರ್ಡಿಂಗ್ ಸರದಿ ಸ್ಥಿತಿ',
    queueDescription: 'ಈ ಬ್ರೌಸರ್ ಅಧಿವೇಶನದ ಅನಾಮಧೇಯ ಸರದಿ ಮತ್ತು ಮಾನವ ಪರಿಶೀಲನೆ ಹಸ್ತಾಂತರ.',
    startReview: 'ಪರಿಶೀಲನೆ ಪ್ರಾರಂಭಿಸಿ',
    takeReview: 'ಪರಿಶೀಲನೆ ಕೈಗೆತ್ತಿಕೊಳ್ಳಿ',
    finishReview: 'ಪರಿಶೀಲನೆ ದಾಖಲಿಸಿ',
    waiting: 'ಕಾಯುತ್ತಿದೆ',
    manualReview: 'ಕೈಯಾರೆ ಪರಿಶೀಲನೆ',
    inReview: 'ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ',
    reviewed: 'ಪರಿಶೀಲನೆ ದಾಖಲಿಸಲಾಗಿದೆ · ದೃಢೀಕರಣವಲ್ಲ',
    demoSlot: 'ಕಾಲ್ಪನಿಕ ಡೆಮೋ ಸರದಿ',
    privacyReceipt: 'ಗೌಪ್ಯತೆ ರಸೀದಿ',
    copyReceipt: 'ಗೌಪ್ಯತೆ ರಸೀದಿಯನ್ನು ನಕಲಿಸಿ',
    receiptCopied: 'ಗೌಪ್ಯತೆ ರಸೀದಿ ನಕಲಾಗಿದೆ.',
    language: 'ಭಾಷೆ ಬದಲಾಯಿಸಿ',
  },
}

const statusClass = (status = '') => status.includes('SUSPICIOUS')
  ? 'suspicious'
  : status.includes('VERIFIED')
    ? 'verified'
    : 'review'

function getQrSummary(qr) {
  if (!qr) return 'Unavailable'
  if (qr.signatureVerification === 'unavailable') {
    const decodeStatus = {
      decoded_unverified: 'Decoded',
      unreadable: 'Unreadable',
      not_found: 'Not found',
    }[qr.status] || 'Unavailable'
    return `${decodeStatus} · digital signature not verified`
  }
  if (qr.signatureVerification === 'not performed') return `${qr.status} · signature not performed`
  return qr.status || 'Unavailable'
}

function TransitView({ session, navigate }) {
  const [section, setSection] = useState('overview')
  const [history, setHistory] = useState(demoHistory)
  const [boardingQueue, setBoardingQueue] = useState([
    { id: 'BQ-DEMO-01', status: 'manual_review', demo: true },
    { id: 'BQ-DEMO-02', status: 'waiting', demo: true },
  ])
  const [result, setResult] = useState(null)
  const [privacyReceipt, setPrivacyReceipt] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [error, setError] = useState('')
  const [alternativeIdOpen, setAlternativeIdOpen] = useState(false)
  const [alternativeDocument, setAlternativeDocument] = useState('operator-approved-id')
  const [receiptCopied, setReceiptCopied] = useState(false)
  const [language, setLanguage] = useState('en')
  const [ticketOpened, setTicketOpened] = useState(false)
  const [eligibilityCategory, setEligibilityCategory] = useState('shakti')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)
  const copy = interfaceCopy[language]

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
  }

  const openCamera = async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is unavailable in this browser. Use a secure (HTTPS) page or upload an image.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraActive(true)
    } catch (cameraError) {
      setError(`Camera could not be opened: ${cameraError.message}`)
    }
  }

  const setImage = (file) => {
    setError('')
    setResult(null)
    setTicketOpened(false)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(file ? URL.createObjectURL(file) : '')
    setSelectedFile(file)
  }

  const captureFrame = () => new Promise((resolve, reject) => {
    const video = videoRef.current
    if (!video?.videoWidth || !video?.videoHeight) {
      reject(new Error('Camera preview is not ready yet.'))
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob((blob) => blob ? resolve(new File([blob], 'transit-capture.jpg', { type: 'image/jpeg' })) : reject(new Error('Could not capture a camera frame.')), 'image/jpeg', 0.9)
  })

  const addHistoryEntry = (scanResult, isDemo) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setHistory((items) => [{
      id: `TR-${Date.now()}`,
      passenger: isDemo ? 'Fictional demo passenger' : 'Passenger · masked',
      document: scanResult.document || 'Image scan',
      time: timestamp,
      status: scanResult.finalStatus,
      demo: isDemo,
    }, ...items])
  }

  const addQueueEntry = (scanResult, isDemo) => {
    const needsReview = scanResult.finalStatus?.includes('REVIEW')
    setBoardingQueue((items) => [{
      id: `BQ-${Date.now()}`,
      status: isDemo ? 'demo' : needsReview ? 'manual_review' : 'waiting',
      demo: isDemo,
    }, ...items])
  }

  const createPrivacyReceipt = (scanResult, mode) => {
    setPrivacyReceipt({
      reference: `PR-${Date.now()}`,
      time: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      mode,
      processed: mode === 'image'
        ? 'Image bytes, OpenCV boundary candidate, QR decode attempt, and OCR summary.'
        : mode === 'alternative'
          ? 'Conductor-selected alternative-ID route only; no document image or identity fields.'
          : 'Fictional demo fixture only; no passenger document was scanned.',
      returned: mode === 'image'
        ? 'Boundary candidate, QR decode status, and OCR counts; no QR payload or OCR text.'
        : 'Manual-review route and generic sample status only.',
      notPerformed: 'Aadhaar signature verification, official scheme eligibility, and fraud classification.',
      retained: 'Nothing by this module. The receipt and history exist only in this page session.',
      status: scanResult.finalStatus,
    })
    setReceiptCopied(false)
  }

  const updateQueueStatus = (id, status) => {
    setBoardingQueue((items) => items.map((item) => item.id === id ? { ...item, status } : item))
  }

  const addAnonymousQueueSlot = () => {
    setBoardingQueue((items) => [{ id: `BQ-${Date.now()}`, status: 'waiting', demo: false }, ...items])
  }

  const routeAlternativeForReview = () => {
    const document = alternativeDocument === 'operator-approved-pass'
      ? 'Operator-approved travel document'
      : alternativeDocument === 'other-approved-document'
        ? 'Other operator-approved document'
        : 'Operator-approved alternative ID'
    const alternativeResult = {
      finalStatus: 'MANUAL REVIEW REQUIRED',
      document: `${document} · conductor-selected`,
      qr: { status: 'not required for this route', signatureVerification: 'not performed' },
      documentIntegrity: 'inconclusive',
      eligibility: 'not established',
      notice: 'Alternative-ID selection does not verify the document or eligibility. Check the operator’s current approved document list and complete the official manual procedure.',
    }
    setResult(alternativeResult)
    setTicketOpened(false)
    setError('')
    addHistoryEntry(alternativeResult, false)
    addQueueEntry(alternativeResult, false)
    createPrivacyReceipt(alternativeResult, 'alternative')
    setAlternativeIdOpen(false)
  }

  const runAnalysis = async () => {
    if (!selectedFile) {
      setError('Capture a camera frame or select an image to continue.')
      return
    }
    if (!session) {
      setError('Sign in with an authorized conductor account to submit an image for in-memory analysis. No image is stored.')
      return
    }
    setBusy(true)
    setError('')
    setResult(null)
    setTicketOpened(false)
    try {
      const analysis = await apiRequest('/transit/analyze', {
        method: 'POST',
        headers: { 'Content-Type': selectedFile.type },
        body: selectedFile,
      })
      const scanResult = {
        ...analysis,
        document: 'Image scan · no identity retained',
        source: 'backend',
      }
      setResult(scanResult)
      addHistoryEntry(scanResult, false)
      addQueueEntry(scanResult, false)
      createPrivacyReceipt(scanResult, 'image')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const runDemo = () => {
    const record = {
      ...demoResult,
      id: `TR-${String(Date.now()).slice(-4)}`,
      passenger: 'Fictional passenger · Demo',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      demo: true,
    }
    setResult(record)
    setTicketOpened(false)
    setError('')
    setHistory((items) => [{ ...record, document: 'Aadhaar · masked', status: record.finalStatus }, ...items])
    addQueueEntry(record, true)
    createPrivacyReceipt(record, 'demo')
  }

  const captureAndSelect = async () => {
    try {
      setImage(await captureFrame())
      stopCamera()
    } catch (captureError) {
      setError(captureError.message)
    }
  }

  const counts = {
    total: history.length,
    verified: history.filter((item) => item.status.includes('VERIFIED')).length,
    review: history.filter((item) => item.status.includes('REVIEW')).length,
    suspicious: history.filter((item) => item.status.includes('SUSPICIOUS')).length,
  }
  const queueCounts = {
    waiting: boardingQueue.filter((item) => item.status === 'waiting').length,
    review: boardingQueue.filter((item) => item.status === 'manual_review').length,
    active: boardingQueue.filter((item) => item.status === 'in_review').length,
  }

  const copyReceipt = async () => {
    if (!privacyReceipt) return
    const receiptText = [
      'IDShield Transit privacy receipt',
      `Reference: ${privacyReceipt.reference}`,
      `Time: ${privacyReceipt.time}`,
      `Mode: ${privacyReceipt.mode}`,
      `Processed: ${privacyReceipt.processed}`,
      `Returned: ${privacyReceipt.returned}`,
      `Not performed: ${privacyReceipt.notPerformed}`,
      `Retention: ${privacyReceipt.retained}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(receiptText)
      setReceiptCopied(true)
    } catch (clipboardError) {
      setError(`Could not copy the privacy receipt: ${clipboardError.message}`)
      setReceiptCopied(false)
    }
  }

  const selectSection = (next) => {
    setSection(next)
    if (next === 'scanner') document.getElementById('transit-scanner')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (next === 'queue') document.getElementById('transit-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (next === 'history') document.getElementById('transit-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (next === 'analytics') document.getElementById('transit-analytics')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (next === 'overview') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={`transit-shell ${language === 'kn' ? 'transit-kannada' : ''}`}>
      <div className="transit-topline">
        <div className="transit-brand"><span className="transit-mark"><BusFront size={20} /></span><span>IDShield <b>Transit</b><small>SMART BUS IDENTITY VERIFICATION</small></span></div>
        <div className="transit-top-actions">
          <span className={`transit-mode ${session ? 'secure' : ''}`}><i />{session ? 'SECURE SESSION' : 'DEMO MODE'}</span>
          <button className="transit-language-toggle" type="button" aria-label={copy.language} aria-pressed={language === 'kn'} onClick={() => setLanguage((current) => current === 'en' ? 'kn' : 'en')}><Languages size={15} /><span>{language === 'en' ? 'English' : 'ಕನ್ನಡ'}</span></button>
          <button className="transit-back" onClick={() => navigate('home')} type="button"><Shield size={16} /> IDShield AI</button>
        </div>
      </div>

      <div className="transit-layout">
        <aside className="transit-sidebar" aria-label="Transit dashboard navigation">
          <div className="transit-sidebar-label">CONDUCTOR WORKSPACE</div>
          {menuItems.map(([id, ItemIcon, label]) => (
            <button type="button" className={`transit-menu-item ${section === id ? 'selected' : ''}`} key={id} onClick={() => selectSection(id)}>
              <ItemIcon size={18} /><span>{copy[label]}</span>{section === id && <ChevronRight size={15} />}
            </button>
          ))}
          <div className="transit-sidebar-bottom">
            <div className="transit-privacy-mini"><LockKeyhole size={17} /><div><b>Privacy first</b><span>Images are not stored by Transit scan.</span></div></div>
            <button className="transit-help" type="button" onClick={() => setError('This prototype does not replace official identity or scheme-eligibility procedures. Please follow your operator’s approved manual review process.')}><AlertTriangle size={15} /> Safety & privacy notice</button>
          </div>
        </aside>

        <div className="transit-main">
          <section className="transit-hero" id="transit-overview">
            <div className="transit-hero-copy">
              <div className="transit-eyebrow"><span className="transit-live-dot" />  PUBLIC TRANSPORT · CONDUCTOR PORTAL</div>
              <h1>Identity checks,<br /><span>made more efficient.</span></h1>
              <p>Assist a conductor’s review with document boundary detection, OCR summaries, and QR decoding. Final identity and travel decisions remain with approved official procedures.</p>
              <div className="transit-hero-actions">
                <button className="transit-primary-button" type="button" onClick={() => selectSection('scanner')}><ScanLine size={18} /> {copy.startScan} <ArrowRight size={16} /></button>
                <button className="transit-secondary-button" type="button" onClick={runDemo}><Zap size={16} /> {copy.demo}</button>
              </div>
              <div className="transit-hero-note"><LockKeyhole size={14} /> No facial biometrics. No passenger image retention.</div>
            </div>
            <div className="transit-hero-visual" aria-hidden="true">
              <div className="transit-orbit orbit-a" /><div className="transit-orbit orbit-b" />
              <div className="transit-hero-card">
                <div className="transit-hero-card-head"><span><ScanLine size={15} /> LIVE ASSIST</span><i>IN-MEMORY</i></div>
                <div className="transit-id-shape"><div className="transit-id-avatar"><Users size={24} /></div><div className="transit-id-lines"><i /><i /><i /></div><div className="transit-qr-pattern"><QrCode size={34} /></div><div className="transit-scan-beam" /></div>
                <div className="transit-stage-row"><span><i className="done" /> Image intake</span><span><i className="pending" /> QR signature check</span></div>
                <div className="transit-stage-caption">Cryptographic verification: unavailable</div>
              </div>
              <div className="transit-float-tag"><ShieldCheck size={16} /><span>Privacy by design<small>Session-only processing</small></span></div>
            </div>
          </section>

          <section className="transit-metrics" aria-label="Conductor dashboard statistics">
            <div className="transit-metric"><span className="metric-icon blue"><Users size={18} /></span><div><small>Passengers checked</small><strong>{counts.total}</strong><em>this browser session · demo data</em></div></div>
            <div className="transit-metric"><span className="metric-icon green"><ShieldCheck size={18} /></span><div><small>Verified</small><strong>{counts.verified}</strong><em>includes labelled demo records</em></div></div>
            <div className="transit-metric"><span className="metric-icon amber"><Clock3 size={18} /></span><div><small>Manual review</small><strong>{counts.review}</strong><em>human decision required</em></div></div>
            <div className="transit-metric"><span className="metric-icon red"><ShieldAlert size={18} /></span><div><small>Suspicious signals</small><strong>{counts.suspicious}</strong><em>no automated accusations</em></div></div>
          </section>

          <section className="transit-shortcuts">
            <div className="transit-section-title"><div><span className="transit-section-kicker">TRANSIT TOOLS</span><h2>One workflow. Clear decisions.</h2></div><span className="transit-data-label"><i /> DEMO INTERFACE</span></div>
            <div className="transit-tool-grid">
              {[
                [ScanLine, 'Smart Bus Scanner', 'Camera or upload intake', 'scanner', 'blue'],
                [FileImage, 'Document Detection', 'OpenCV boundary candidate', 'scanner', 'purple'],
                [QrCode, 'Secure QR Check', 'Decode only · signature unavailable', 'scanner', 'cyan'],
                [Activity, 'AI Fraud Signals', 'No fraud model configured', 'scanner', 'amber'],
                [ListOrdered, 'Boarding Queue Pulse', 'Anonymous live handoff slots', 'queue', 'purple'],
                [History, 'Passenger History', 'Masked, session-only entries', 'history', 'green'],
                [BarChart3, 'Analytics & Reports', 'Clearly labelled sample trends', 'analytics', 'blue'],
              ].map(([ToolIcon, title, detail, target, tone]) => (
                <button className="transit-tool-card" key={title} type="button" onClick={() => selectSection(target)}>
                  <span className={`transit-tool-icon ${tone}`}><ToolIcon size={19} /></span><span className="transit-tool-copy"><b>{title}</b><small>{detail}</small></span><ChevronRight size={16} />
                </button>
              ))}
            </div>
          </section>

          <section className="transit-scanner-section" id="transit-scanner">
            <div className="transit-section-title"><div><span className="transit-section-kicker">CONDUCTOR SCANNER</span><h2>{copy.scannerTitle}</h2><p>Capture or upload a supported image. Authenticated scans are processed in memory; no scan history or image is persisted by this module.</p></div><span className="transit-secure-badge"><LockKeyhole size={14} /> PRIVATE PROCESSING</span></div>
            <div className="transit-scanner-grid">
              <div className="transit-camera-panel">
                <div className="transit-camera-view">
                  {previewUrl
                    ? <img className="transit-preview-image" src={previewUrl} alt="Selected document preview, kept in this browser session" />
                    : <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview" />}
                  {!previewUrl && !cameraActive && <div className="transit-camera-placeholder"><span><Camera size={24} /></span><b>Camera preview</b><small>Open the laptop or phone camera to begin</small></div>}
                  {cameraActive && !previewUrl && <div className="transit-camera-overlay"><span className="scan-corner corner-tl" /><span className="scan-corner corner-tr" /><span className="scan-corner corner-bl" /><span className="scan-corner corner-br" /><div className="transit-camera-line" /></div>}
                  <span className="transit-camera-chip"><i /> {cameraActive && !previewUrl ? 'CAMERA LIVE' : previewUrl ? 'LOCAL PREVIEW' : 'READY'}</span>
                </div>
                <div className="transit-camera-buttons">
                  {cameraActive
                    ? <><button type="button" className="transit-secondary-button" onClick={captureAndSelect}><Camera size={17} /> {copy.capture}</button><button type="button" className="transit-quiet-button" onClick={stopCamera}><CameraOff size={16} /> {copy.stop}</button></>
                    : <button type="button" className="transit-secondary-button" onClick={openCamera}><Camera size={17} /> {copy.camera}</button>}
                  <button type="button" className="transit-quiet-button" onClick={() => fileInputRef.current?.click()}><Upload size={16} /> {copy.upload}</button>
                  {previewUrl && <button className="transit-clear-button" type="button" aria-label="Clear selected image" onClick={() => setImage(null)}><X size={17} /></button>}
                  <input ref={fileInputRef} className="transit-file-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => setImage(event.target.files?.[0] || null)} />
                </div>
                {selectedFile && <div className="transit-selected-file"><FileCheck2 size={16} /><span>{selectedFile.name}</span><small>{(selectedFile.size / 1024).toFixed(0)} KB · browser memory only</small></div>}
              </div>
              <div className="transit-scan-side">
                <div className="transit-panel">
                  <div className="transit-panel-title"><span className="transit-small-icon"><ScanLine size={17} /></span><div><b>Analysis steps</b><small>Signals assist review only</small></div></div>
                  <div className={`transit-step ${busy ? 'processing' : ''}`}><span className="transit-step-icon"><FileImage size={16} /></span><div><b>Document boundary</b><small>OpenCV contour candidate</small></div><em>{busy ? 'PROCESSING' : 'READY'}</em></div>
                  <div className={`transit-step ${busy ? 'processing delay' : ''}`}><span className="transit-step-icon"><QrCode size={16} /></span><div><b>Secure QR decode</b><small>No signature verification configured</small></div><em>DEMO / UNAVAILABLE</em></div>
                  <div className={`transit-step ${busy ? 'processing delay-more' : ''}`}><span className="transit-step-icon"><Activity size={16} /></span><div><b>OCR summary</b><small>No raw text returned or stored</small></div><em>{busy ? 'PROCESSING' : 'READY'}</em></div>
                  <div className="transit-model-note"><AlertTriangle size={15} /><span>YOLOv8 and a calibrated fraud model are not configured. No automated authenticity or fraud verdict is produced.</span></div>
                  <button type="button" className="transit-primary-button transit-analyze-button" disabled={busy || !selectedFile || !session} onClick={runAnalysis}>
                    {busy ? <><span className="transit-spinner" /> {copy.processing}</> : <><ScanLine size={18} /> {copy.analyze} <ArrowRight size={16} /></>}
                  </button>
                  <button type="button" className="transit-alternative-toggle" aria-expanded={alternativeIdOpen} onClick={() => setAlternativeIdOpen((open) => !open)}><FileCheck2 size={15} /> {copy.alternative} <ChevronRight size={14} /></button>
                  {alternativeIdOpen && <div className="transit-alternative-panel">
                    <label>Document category<select value={alternativeDocument} onChange={(event) => setAlternativeDocument(event.target.value)}><option value="operator-approved-id">Operator-approved alternative ID</option><option value="operator-approved-pass">Operator-approved travel / concession document</option><option value="other-approved-document">Other operator-approved document</option></select></label>
                    <p>Use only documents on the operator’s current approved list. This route does not verify the document or decide eligibility.</p>
                    <button className="transit-secondary-button" type="button" onClick={routeAlternativeForReview}><Users size={15} /> {copy.routeReview}</button>
                  </div>}
                  {!session && <p className="transit-signin-hint">Authorized conductor sign-in is required for image analysis. <button type="button" onClick={() => navigate('auth')}>Sign in</button></p>}
                  {error && <div className="transit-error" role="alert"><AlertTriangle size={16} />{error}</div>}
                </div>
              </div>
            </div>
          </section>

          <section className="transit-result-section" aria-live="polite">
            {result ? (
              <div className={`transit-result-card ${statusClass(result.finalStatus)}`}>
                <div className="transit-result-heading">
                  <div className="transit-result-symbol">{result.finalStatus?.includes('SUSPICIOUS') ? <ShieldAlert size={22} /> : result.finalStatus?.includes('VERIFIED') ? <ShieldCheck size={22} /> : <AlertTriangle size={22} />}</div>
                  <div><span className="transit-section-kicker">{result.demo ? 'FICTIONAL DEMO RECORD' : 'SCAN RESULT · HUMAN REVIEW REQUIRED'}</span><h3>Passenger verification</h3></div>
                  <strong className="transit-result-status">{result.finalStatus}</strong>
                </div>
                <div className="transit-result-grid">
                  <div><small>Document</small><b>{result.document}</b></div>
                  <div><small>QR verification</small><b>{getQrSummary(result.qr)}</b></div>
                  <div><small>Document integrity</small><b>{result.documentIntegrity || 'Inconclusive'}</b></div>
                  <div><small>Travel eligibility</small><b>{result.eligibility || 'Not established'}</b></div>
                </div>
                {result.ocr && <div className="transit-result-extra"><span><FileImage size={13} /><b>Boundary candidate:</b> {result.documentDetection?.candidateBoundaryDetected ? 'detected' : 'not detected'}</span><span><Activity size={13} /><b>OCR:</b> {result.ocr.status}{result.ocr.wordCount ? ` · ${result.ocr.wordCount} text segments; text withheld` : ''}</span></div>}
                <p className="transit-result-disclaimer"><AlertTriangle size={15} />{result.notice || 'This result is an assistive scan only. Follow official identity and eligibility verification procedures.'}</p>
                {result.demo && result.finalStatus?.includes('VERIFIED') && <button className="transit-secondary-button transit-ticket-button" type="button" onClick={() => setTicketOpened(true)}><TicketCheck size={16} /> Continue to simulated ticket workflow <ArrowRight size={15} /></button>}
                {ticketOpened && <div className="transit-ticket-confirm" role="status"><Check size={16} /> Demo ticket workflow opened. This does not issue a real ticket or confirm scheme eligibility.</div>}
              </div>
            ) : <div className="transit-result-empty"><ShieldCheck size={19} /><span><b>Passenger verification result</b><small>Scan a document or load a fictional sample. Results appear here; passenger details are not requested.</small></span></div>}
          </section>

          <section className="transit-privacy-receipt" aria-labelledby="transit-receipt-title">
            <div className="transit-receipt-heading">
              <span className="transit-receipt-icon"><LockKeyhole size={17} /></span>
              <div><span className="transit-section-kicker">PRIVACY BY DESIGN</span><h2 id="transit-receipt-title">{copy.privacyReceipt}</h2></div>
              <button className="transit-receipt-copy" type="button" disabled={!privacyReceipt} onClick={copyReceipt}>
                {receiptCopied ? <ClipboardCheck size={15} /> : <Clipboard size={15} />}
                {receiptCopied ? copy.receiptCopied : copy.copyReceipt}
              </button>
            </div>
            {privacyReceipt ? (
              <>
                <div className="transit-receipt-ref"><b>{privacyReceipt.reference}</b><span>{privacyReceipt.time} · {privacyReceipt.mode} mode</span></div>
                <div className="transit-receipt-details">
                  <div><small>Processed</small><span>{privacyReceipt.processed}</span></div>
                  <div><small>Returned</small><span>{privacyReceipt.returned}</span></div>
                  <div><small>Not performed</small><span>{privacyReceipt.notPerformed}</span></div>
                  <div><small>Retention</small><span>{privacyReceipt.retained}</span></div>
                </div>
              </>
            ) : <p className="transit-receipt-empty">After a scan or review route, get a plain-language receipt of what was processed, returned, and deliberately not checked. No passenger data is included.</p>}
          </section>

          <section className="transit-policy">
            <div className="transit-policy-icon"><Fingerprint size={19} /></div>
            <div className="transit-policy-copy"><span className="transit-section-kicker">ELIGIBILITY IS A SEPARATE CHECK</span><h3>Use the operator’s current approved policy</h3><p>Aadhaar possession alone does not establish Shakti eligibility. Supported identity documents, residence requirements, and senior-citizen concessions must follow current official rules and approved procedures. This prototype does not encode or decide eligibility.</p></div>
            <label className="transit-category-select">Category preview<select value={eligibilityCategory} onChange={(event) => setEligibilityCategory(event.target.value)}><option value="shakti">Shakti scheme</option><option value="senior">Senior citizen concession</option><option value="other">Other concession</option></select><small>{eligibilityCategory === 'senior' ? 'Separate concession category · manual policy check' : 'Policy rules not configured · manual review required'}</small></label>
          </section>

          <section className="transit-queue-section" id="transit-queue">
            <div className="transit-section-title">
              <div><span className="transit-section-kicker">BOARDING FLOW · SESSION ONLY</span><h2>{copy.queueTitle}</h2><p>{copy.queueDescription} Queue actions track handoffs only; they do not approve eligibility or issue tickets.</p></div>
              <button className="transit-secondary-button transit-queue-add" type="button" onClick={addAnonymousQueueSlot}><Users size={15} /> {copy.addQueue}</button>
            </div>
            <div className="transit-queue-summary">
              <div><small>Waiting</small><b>{queueCounts.waiting}</b></div>
              <div><small>Manual review</small><b>{queueCounts.review}</b></div>
              <div><small>Active review</small><b>{queueCounts.active}</b></div>
              <span><LockKeyhole size={14} /> Anonymous refs only · clears with this page</span>
            </div>
            <div className="transit-queue-list">
              {boardingQueue.slice(0, 6).map((item) => {
                const action = item.status === 'waiting'
                  ? ['in_review', copy.startReview]
                  : item.status === 'manual_review'
                    ? ['in_review', copy.takeReview]
                    : item.status === 'in_review'
                      ? ['reviewed', copy.finishReview]
                      : null
                const label = item.status === 'waiting'
                  ? copy.waiting
                  : item.status === 'manual_review'
                    ? copy.manualReview
                    : item.status === 'in_review'
                      ? copy.inReview
                      : item.status === 'reviewed'
                        ? copy.reviewed
                        : copy.demoSlot
                return <div className="transit-queue-row" key={item.id}>
                  <span className="transit-queue-ref"><ListOrdered size={15} /> {item.id}</span>
                  <span className={`transit-queue-state ${item.status}`}>{label}</span>
                  {action
                    ? <button type="button" onClick={() => updateQueueStatus(item.id, action[0])}>{action[1]} <ArrowRight size={13} /></button>
                    : <small>{item.demo ? 'Demo only' : 'No further queue action'}</small>}
                </div>
              })}
              {!boardingQueue.length && <div className="transit-queue-empty">No boarding slots in this session. Add an anonymous slot to begin.</div>}
            </div>
          </section>

          <section className="transit-history-section" id="transit-history">
            <div className="transit-section-title"><div><span className="transit-section-kicker">SESSION ACTIVITY</span><h2>Passenger verification history</h2><p>Masked entries exist only in this page session. No passenger identifiers are collected.</p></div><span className="transit-data-label">DEMO + CURRENT SESSION</span></div>
            <div className="transit-history-card">
              <div className="transit-history-head"><span>REFERENCE</span><span>PASSENGER</span><span>DOCUMENT</span><span>TIME</span><span>STATUS</span></div>
              {history.slice(0, 6).map((item) => <div className="transit-history-row" key={item.id}><b>{item.id}</b><span>{item.passenger}</span><span>{item.document}</span><span>{item.time}</span><strong className={`transit-status-tag ${statusClass(item.status)}`}>{item.status}</strong></div>)}
              {!history.length && <div className="transit-no-history">No scans in this session.</div>}
              <div className="transit-history-foot"><LockKeyhole size={13} /> Browser memory only · history clears when this page is closed</div>
            </div>
          </section>

          <section className="transit-analytics-section" id="transit-analytics">
            <div className="transit-section-title"><div><span className="transit-section-kicker">OPERATIONS SNAPSHOT</span><h2>Verification analytics</h2><p>Illustrative demo data only. This dashboard is not connected to a live fleet or database.</p></div><span className="transit-data-label">SAMPLE DATA</span></div>
            <div className="transit-analytics-grid">
              <div className="transit-chart-card"><div className="transit-chart-title"><div><b>Daily checks</b><small>Illustrative passenger volume · past 7 days</small></div><span><Activity size={16} /> 7 days</span></div><div className="transit-bars" role="img" aria-label="Illustrative daily checks over seven days: 48, 62, 54, 81, 69, 92, 75">{[['M', 48], ['T', 62], ['W', 54], ['T', 81], ['F', 69], ['S', 92], ['S', 75]].map(([day, value], index) => <div className="transit-bar-col" key={`${day}-${index}`}><span>{value}</span><i style={{ height: `${value}%` }} /><small>{day}</small></div>)}</div><div className="transit-chart-legend"><span><i className="blue-dot" /> Demo checks</span><span>Average review time <b>18 sec · demo</b></span></div></div>
              <div className="transit-chart-card"><div className="transit-chart-title"><div><b>Review outcomes</b><small>No live verification metrics available</small></div><BarChart3 size={17} /></div><div className="transit-analytics-footstats"><span>Demo verification success rate <b>86%</b></span><span>Average verification time <b>18 sec</b></span></div><div className="transit-outcome-list">{[['Verified', 86, 'verified'], ['Manual review', 10, 'review'], ['Suspicious signal', 4, 'suspicious']].map(([label, percent, kind]) => <div key={label} className="transit-outcome"><div><span>{label}</span><b>{percent}%</b></div><i><em className={kind} style={{ width: `${percent}%` }} /></i></div>)}</div><div className="transit-chart-legend"><span>Fictional illustration</span><span>Not a performance claim</span></div></div>
            </div>
          </section>

          <section className="transit-safety-footer">
            <div><Shield size={18} /><span><b>Built for responsible assistance</b><small>No covert face recognition · no biometric capture · no automated passenger accusations.</small></span></div>
            <button type="button" onClick={() => setError('Transit scans use temporary in-memory processing. Do not upload a passenger document without the required consent and operator authorization. Follow approved privacy and data-protection requirements.')}><LockKeyhole size={15} /> Privacy notice <ArrowRight size={14} /></button>
          </section>
          <div className="transit-footerline"><span>IDSHIELD TRANSIT · PILOT DEMONSTRATION</span><span>Identity authenticity and eligibility are not established by this prototype.</span></div>
        </div>
      </div>
    </div>
  )
}

export default TransitView
