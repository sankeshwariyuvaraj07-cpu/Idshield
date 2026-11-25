import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { apiRequest, getApiBaseUrl } from './services/api'
import {
  createSafetyReport,
  downloadSafetyReportPdf,
  parseSafetyExplanations,
} from './services/safetyReport'
import { formatDashboardDate, summarizeDashboardRecords } from './services/dashboardAnalytics'
import { inspectPdfSignature } from './services/pdfSignature'
import { summarizeQrDestinations } from './services/qrSafety'
import { resolveScanVoiceCommand } from './services/scanCommands'
import { googleAuthEnabled, supabase, supabaseConfigured } from './services/supabase'
import TransitView from './TransitView'
import './App.css'

const iconPaths = {
  shield: <><path d="M12 2 4 5.5V11c0 5.2 3.4 9.9 8 11 4.6-1.1 8-5.8 8-11V5.5L12 2Z" /><path d="m9 12 2 2 4-4" /></>,
  scan: <><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M4 12h16" /><path d="m15 9-3 3-2-2-4 4" /></>,
  upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M20 16.5v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-2" /></>,
  bot: <><rect x="4" y="7" width="16" height="13" rx="3" /><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6M2 12h2m16 0h2" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  fingerprint: <><path d="M12 11a2 2 0 0 0-2 2c0 3-.5 5-1 6M14 13c0 2.5-.2 4.2-.6 6M6.5 17c.3-1.3.5-2.7.5-4a5 5 0 0 1 10 0M4 13a8 8 0 0 1 16 0M12 3a10 10 0 0 1 10 10" /></>,
  alert: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 21v-4h6v4M8 7h1m6 0h1M8 11h1m6 0h1" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" /></>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8" /></>,
  camera: <><path d="M14 5 12 3H8L6 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2l-2-2h-2" /><circle cx="12" cy="12" r="3.5" /></>,
  volume: <><path d="M11 5 6 9H3v6h3l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13" /></>,
  help: <><circle cx="12" cy="12" r="10" /><path d="M9.6 9a2.5 2.5 0 1 1 4.3 1.8c-1.1 1.1-1.9 1.5-1.9 3m0 3h.01" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  bus: <><rect x="5" y="3" width="14" height="15" rx="3" /><path d="M5 10h14M8 18v2m8-2v2M8 13h1m6 0h1" /><circle cx="8" cy="21" r="1" /><circle cx="16" cy="21" r="1" /></>,
}

function Icon({ name, size = 18 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name] || iconPaths.file}</svg>
}

const navItems = [
  ['home', 'Home', 'shield'],
  ['screen', 'Screening', 'scan'],
  ['dashboard', 'Institution', 'building'],
  ['transit', 'Transit', 'bus'],
]

const informationNavItems = [
  ['assistant', 'AI assistant', 'bot'],
  ['research', 'Research notes', 'help'],
  ['about', 'About IDShield', 'target'],
  ['contact', 'Contact', 'users'],
]

function Brand({ onClick }) {
  return <button className="brand" type="button" onClick={onClick} aria-label="IDShield AI home"><span className="brand-mark"><Icon name="shield" size={20} /></span><span className="brand-text">IDShield<span className="brand-ai">AI</span></span></button>
}

function Button({ children, variant = 'ghost', size, className = '', ...props }) {
  return <button className={`btn ${variant} ${size || ''} ${className}`} {...props}>{children}</button>
}

function Eyebrow({ children }) {
  return <div className="eyebrow">{children}</div>
}

function Panel({ children, className = '', ...props }) {
  return <div className={`panel ${className}`} {...props}>{children}</div>
}

function SectionHeading({ eyebrow, title, children }) {
  return <div className="section-heading"><Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2>{children && <p className="lead">{children}</p>}</div>
}

function HomeView({ navigate }) {
  const reduceMotion = useReducedMotion()
  const revealProps = reduceMotion ? { initial: false } : {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: .16 },
    transition: { duration: .65, ease: [.22, 1, .36, 1] },
  }
  return (
    <div className="wrap">
      <motion.section className="hero" initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={reduceMotion ? undefined : { opacity: 1, y: 0 }} transition={{ duration: .7 }}>
        <div className="hero-copy">
          <div className="pill"><span className="pulse" /> Evidence-led document screening</div>
          <h1>Review documents with <span className="gradient-text">clear, bounded signals.</span></h1>
          <p className="lead">Run the checks that are configured, review evidence across 12 safety categories, and see what still needs human verification. IDShield does not make identity or eligibility decisions.</p>
          <div className="hero-actions"><Button variant="primary" size="large" onClick={() => navigate('screen')}><Icon name="upload" /> Screen a document</Button><Button size="large" onClick={() => navigate('assistant')}><Icon name="bot" /> Ask the assistant</Button></div>
          <div className="chips"><span className="chip">OCR on supported images</span><span className="chip">SHA-256 integrity</span><span className="chip">Evidence-first reports</span></div>
        </div>
        <div className="hero-visual" aria-hidden="true"><div className="scanner"><div className="scanner-ring ring-one" /><div className="scanner-ring ring-two" /><div className="scanner-ring ring-three" /><div className="orbit" /><div className="document-card"><span className="doc-photo" /><i /><i /><i /><i /><i /><div className="doc-scanline" /></div><div className="scan-badge"><Icon name="shield" size={29} /></div><div className="float-chip"><span className="pulse" /> Evidence-first review</div></div></div>
      </motion.section>

      <motion.section className="stats" {...revealProps}>
        <div><strong>12</strong><span>Safety report categories</span></div><div><strong>SHA-256</strong><span>File integrity fingerprint</span></div><div><strong>Manual</strong><span>Final review required</span></div>
      </motion.section>

      <motion.section className="section" {...revealProps}>
        <SectionHeading eyebrow="How it works" title="A practical review workflow">Use a synthetic sample to explore the interface, or sign in to analyze a real document with the configured services.</SectionHeading>
        <div className="feature-grid">
          {[
            ['scan', 'Document screening', 'Supported image uploads can be checked with OCR and image-level heuristics. PDF OCR is not configured.'],
            ['layers', 'Safety report', 'Review status, risk level, evidence, and recommended action for each assessment category.'],
            ['lock', 'Private handling', 'Signed-in uploads use private storage. OCR text is not retained in the database or included in exports.'],
          ].map(([icon, title, copy]) => <article className="tech-card feature-card" key={title}><span className="feature-icon"><Icon name={icon} /></span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </motion.section>

      <motion.section className="cta-band" {...revealProps}><Eyebrow>Try the interface</Eyebrow><h2>Start with the synthetic sample</h2><p className="lead">The built-in sample is fictional and produces illustrative results. Do not upload a real document unless you are signed in and have reviewed the privacy notice.</p><div className="hero-actions centered"><Button variant="primary" size="large" onClick={() => navigate('screen')}><Icon name="scan" /> Open screening</Button></div></motion.section>
    </div>
  )
}

function FileChip({ file, onRemove }) {
  return <div className="file-chip"><span className="file-chip-icon"><Icon name="file" /></span><span className="file-chip-copy"><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(1)} KB · SHA-256 generated locally</small></span><button type="button" aria-label="Remove selected file" onClick={onRemove}><Icon name="close" size={16} /></button></div>
}

function ScreeningView({ navigate, onComplete, onToast, session }) {
  const [file, setFile] = useState(null)
  const [demoSample, setDemoSample] = useState(false)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [docType, setDocType] = useState('Identity document')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stageLabel, setStageLabel] = useState('')
  const [error, setError] = useState('')
  const [cloudDocumentId, setCloudDocumentId] = useState('')
  const [deletingUpload, setDeletingUpload] = useState(false)
  const [cameraStream, setCameraStream] = useState(null)
  const [cameraMode, setCameraMode] = useState('document')
  const [cameraError, setCameraError] = useState('')
  const [voiceScanning, setVoiceScanning] = useState(false)
  const [voiceScanNotice, setVoiceScanNotice] = useState('')
  const [portraitPreviewUrl, setPortraitPreviewUrl] = useState('')
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState('')
  const [faceConsent, setFaceConsent] = useState(false)
  const [qrSafety, setQrSafety] = useState(null)
  const [digitalSignature, setDigitalSignature] = useState(null)
  const inputRef = useRef(null)
  const portraitInputRef = useRef(null)
  const videoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const recognitionRef = useRef(null)
  const scanId = useRef(0)

  const selectFile = async (candidate) => {
    if (!candidate) return
    setError('')
    const supported = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
    const extension = candidate.name.split('.').pop()?.toLowerCase()
    const validExtensions = new Set(['png', 'jpg', 'jpeg', 'webp', 'pdf'])
    if (candidate.size > 8 * 1024 * 1024) {
      setError('This file exceeds the 8 MB size limit.')
      return
    }
    if (!supported.has(candidate.type) || !validExtensions.has(extension)) {
      setError('Choose a PNG, JPG, WEBP, or PDF file.')
      return
    }
    setQrSafety(null)
    setDigitalSignature(null)
    if (candidate.type !== 'application/pdf') {
      const signature = new Uint8Array(await candidate.slice(0, 12).arrayBuffer())
      const isPng = signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47
      const isJpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff
      const isWebp = String.fromCharCode(...signature.slice(0, 4)) === 'RIFF' && String.fromCharCode(...signature.slice(8, 12)) === 'WEBP'
      if (!isPng && !isJpeg && !isWebp) {
        setError('The file contents do not match a supported image format.')
        return
      }
    } else {
      const signature = new Uint8Array(await candidate.slice(0, 5).arrayBuffer())
      if (String.fromCharCode(...signature) !== '%PDF-') {
        setError('The file does not have a valid PDF signature.')
        return
      }
      setDigitalSignature(inspectPdfSignature(await candidate.arrayBuffer()))
    }
    if (candidate.type !== 'application/pdf') setDigitalSignature({ status: 'not_applicable', cryptographicVerification: 'unavailable' })
    setFile(candidate)
    setDemoSample(false)
    setConsentAccepted(false)
    if (candidate.type.startsWith('image/')) {
      try {
        const detection = new window.BarcodeDetector({ formats: ['qr_code'] })
        const image = await createImageBitmap(candidate)
        const codes = await detection.detect(image)
        image.close()
        setQrSafety(summarizeQrDestinations(codes.map(({ rawValue }) => rawValue)))
      } catch {
        setQrSafety({ status: 'unavailable', payloadReturned: false, signatureVerification: 'unavailable' })
      }
    } else {
      setQrSafety(null)
    }
  }

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraStream(null)
  }

  const openCamera = async (mode = 'document') => {
    setCameraError('')
    if (mode === 'face' && !faceConsent) {
      setCameraError('Confirm local-only photo comparison consent before opening the face camera.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access needs a supported browser and a secure page (HTTPS or localhost).')
      return
    }
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode === 'face' ? 'user' : 'environment' },
        audio: false,
      })
      cameraStreamRef.current = stream
      setCameraMode(mode)
      setCameraStream(stream)
    } catch (cameraRequestError) {
      setCameraError(`Unable to open the camera: ${cameraRequestError.message}`)
    }
  }

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
      void videoRef.current.play().catch((playError) => {
        setCameraError(`Unable to start the camera preview: ${playError.message}`)
      })
    }
  }, [cameraStream])

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
  }, [])

  useEffect(() => () => {
    recognitionRef.current?.abort?.()
    recognitionRef.current = null
  }, [])

  useEffect(() => () => {
    if (portraitPreviewUrl) URL.revokeObjectURL(portraitPreviewUrl)
  }, [portraitPreviewUrl])

  useEffect(() => () => {
    if (selfiePreviewUrl) URL.revokeObjectURL(selfiePreviewUrl)
  }, [selfiePreviewUrl])

  const captureCameraFrame = async () => {
    const video = videoRef.current
    if (!video?.videoWidth || !video?.videoHeight) {
      setCameraError('Wait for the camera preview to become ready, then try again.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) {
      setCameraError('This browser could not prepare the camera image.')
      return
    }
    context.drawImage(video, 0, 0)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) {
      setCameraError('Unable to capture an image from the camera.')
      return
    }
    if (cameraMode === 'face') {
      if (!faceConsent) {
        setCameraError('Confirm local-only photo comparison consent before capturing a reference photo.')
        return
      }
      const capturedSelfie = new File([blob], 'local-face-comparison.jpg', { type: 'image/jpeg' })
      setSelfiePreviewUrl(URL.createObjectURL(capturedSelfie))
      setFaceConsent(false)
      setCameraError('')
      setVoiceScanNotice('Reference photo captured in this browser only; automated face matching is not configured.')
      return
    }
    await selectFile(new File([blob], 'camera-document.jpg', { type: 'image/jpeg' }))
    setCameraError('')
    stopCamera()
  }

  const captureFacePhoto = () => {
    if (!faceConsent) {
      setCameraError('Confirm local-only photo comparison consent before opening the face camera.')
      return
    }
    if (cameraStream && cameraMode === 'face') {
      void captureCameraFrame()
      return
    }
    void openCamera('face')
  }

  const selectPortraitPhoto = async (candidate) => {
    if (!candidate) return
    if (!faceConsent) {
      setCameraError('Confirm local-only photo comparison consent before selecting a portrait.')
      return
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(candidate.type) || candidate.size > 5 * 1024 * 1024) {
      setCameraError('Choose a PNG, JPG, or WEBP portrait image up to 5 MB.')
      return
    }
    if (portraitPreviewUrl) URL.revokeObjectURL(portraitPreviewUrl)
    setPortraitPreviewUrl(URL.createObjectURL(candidate))
    setFaceConsent(false)
    setCameraError('')
  }

  const startVoiceScan = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceScanNotice('Voice commands are not supported in this browser. Use the camera buttons instead.')
      return
    }
    if (recognitionRef.current) recognitionRef.current.stop()
    const recognition = new Recognition()
    recognition.lang = 'en-IN'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ''
      const command = resolveScanVoiceCommand(transcript)
      if (command === 'open_camera') void openCamera('document')
      else if (command === 'open_face_camera') captureFacePhoto()
      else if (command === 'capture_document' || command === 'capture_face') void captureCameraFrame()
      else if (command === 'stop_camera') stopCamera()
      else setVoiceScanNotice(`Didn't recognize a camera command for "${transcript}". Try “open camera” or “capture document”.`)
    }
    recognition.onerror = (event) => {
      setVoiceScanNotice(`Voice command failed (${event.error}). Use the camera controls or check microphone permission.`)
    }
    recognition.onend = () => {
      setVoiceScanning(false)
      recognitionRef.current = null
    }
    recognitionRef.current = recognition
    setVoiceScanning(true)
    setVoiceScanNotice('Listening for a camera command. Browser speech recognition may process audio outside IDShield.')
    try {
      recognition.start()
    } catch (recognitionError) {
      setVoiceScanning(false)
      recognitionRef.current = null
      setVoiceScanNotice(`Unable to start voice commands: ${recognitionError.message}`)
    }
  }

  const useDemo = async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 960
    canvas.height = 600
    const context = canvas.getContext('2d')
    if (!context) {
      setError('Could not create the synthetic demo image in this browser.')
      return
    }

    context.fillStyle = '#eef4f7'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#183347'
    context.fillRect(0, 0, canvas.width, 118)
    context.fillStyle = '#67e2dc'
    context.fillRect(0, 118, canvas.width, 8)
    context.fillStyle = '#ffffff'
    context.font = '700 31px Arial'
    context.fillText('IDSHIELD SAMPLE DOCUMENT', 52, 62)
    context.fillStyle = '#a9c5d2'
    context.font = '20px Arial'
    context.fillText('SYNTHETIC DEMO — NOT A REAL ID', 54, 94)
    context.fillStyle = '#d6e5ec'
    context.fillRect(55, 171, 190, 225)
    context.fillStyle = '#8faebc'
    context.beginPath()
    context.arc(150, 242, 48, 0, Math.PI * 2)
    context.fill()
    context.fillRect(91, 302, 118, 72)
    context.fillStyle = '#263d4c'
    context.font = '700 24px Arial'
    context.fillText('SAMPLE PERSON', 292, 209)
    context.fillStyle = '#718995'
    context.font = '19px Arial'
    context.fillText('This card is generated for interface testing only.', 292, 256)
    context.fillText('It is not an identity document and has no legal use.', 292, 292)
    context.fillStyle = '#c9dce4'
    context.fillRect(292, 329, 420, 10)
    context.fillRect(292, 356, 350, 10)
    context.fillRect(292, 383, 385, 10)
    context.fillStyle = '#cfdee4'
    context.fillRect(55, 445, 850, 92)
    context.fillStyle = '#234656'
    context.font = '700 25px Arial'
    context.fillText('SYNTHETIC SAMPLE · NOT FOR VERIFICATION', 78, 499)

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      setError('Could not generate the synthetic demo image in this browser.')
      return
    }
    setFile(new File([blob], 'IDShield-synthetic-demo.png', { type: 'image/png' }))
    setDemoSample(true)
    setConsentAccepted(false)
    setError('')
  }

  const reset = () => {
    scanId.current += 1
    stopCamera()
    setFile(null)
    setDemoSample(false)
    setConsentAccepted(false)
    setFaceConsent(false)
    setPortraitPreviewUrl('')
    setSelfiePreviewUrl('')
    setQrSafety(null)
    setDigitalSignature(null)
    setError('')
    setProgress(0)
    setStageLabel('')
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const deleteCloudUpload = async () => {
    if (!cloudDocumentId) return
    setDeletingUpload(true)
    try {
      await apiRequest(`/documents/${cloudDocumentId}`, { method: 'DELETE' })
      setCloudDocumentId('')
      setError('')
      onToast('Private upload deleted.')
    } catch (deleteError) {
      setError(`Unable to delete private upload: ${deleteError.message}`)
    } finally {
      setDeletingUpload(false)
    }
  }

  const analyze = async () => {
    if (!file || busy) return
    if (!session && !demoSample) {
      setError('Sign in before analyzing a real document. Guest mode is limited to the synthetic sample.')
      return
    }
    if (session && !demoSample && !consentAccepted) {
      setError('Confirm that you are authorized to upload this document and consent to private OCR processing.')
      return
    }
    if (session && cloudDocumentId) {
      setError('Delete the existing private upload before starting another cloud analysis.')
      return
    }
    if (!globalThis.crypto?.subtle) {
      setError('This browser does not support local SHA-256 hashing. Use a modern browser on HTTPS or localhost.')
      return
    }
    const id = ++scanId.current
    setBusy(true)
    setError('')
    setProgress(0)
    try {
      const bytes = await file.arrayBuffer()
      const digest = await crypto.subtle.digest('SHA-256', bytes)
      const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
      if (scanId.current !== id) return
      if (session && !demoSample) {
        setStageLabel('Requesting a private upload URL…')
        setProgress(15)
        const intent = await apiRequest('/documents/upload-intents', {
          method: 'POST',
          body: JSON.stringify({ name: file.name, size: file.size, mimeType: file.type, sha256: hash, consentAccepted: true }),
        })
        setCloudDocumentId(intent.documentId)
        setStageLabel('Uploading to private storage…')
        setProgress(35)
        const { error: uploadError } = await supabase.storage
          .from(intent.bucket)
          .uploadToSignedUrl(intent.path, intent.token, file, { contentType: file.type, upsert: false })
        if (uploadError) throw uploadError
        setStageLabel('Running configured OCR and image checks…')
        setProgress(60)
        const analysis = await apiRequest(`/documents/${intent.documentId}/analyze`, { method: 'POST' })
        if (scanId.current !== id) return
        setProgress(100)
        const screening = analysis.ocr.screening
        setQrSafety(screening?.qrSafety || null)
        const localReview = analysis.localModelReview
        onComplete({
          name: analysis.document.name,
          size: analysis.document.size,
          type: docType,
          hash: analysis.document.sha256,
          documentId: analysis.document.id,
          risk: 'Not scored',
          confidence: analysis.ocr.confidence === null ? 'Unavailable' : `${(analysis.ocr.confidence * 100).toFixed(1)}%`,
          anomalies: 0,
          signals: [
            ['ocr.status', analysis.ocr.status, 'FastAPI + Tesseract'],
            ...(Array.isArray(analysis.ocr.languages) ? [['ocr.languages', analysis.ocr.languages.join('+'), 'Configured Tesseract traineddata']] : []),
            ['ocr.word_count', String(analysis.ocr.wordCount ?? 0), 'Processed in memory'],
            ['forgery_model.status', analysis.model.status, 'No model configured'],
            ...(screening ? [
              ['screening.status', screening.finalStatus, 'Human review required'],
              ['visual.ela_score', String(screening.visualForensics.elaScore), 'Heuristic, not proof'],
              ['document.detected_type', screening.ocrExtraction.detectedDocumentType, 'OCR pattern match'],
              ['document.identifier', screening.ocrExtraction.maskedIdentifier || 'Not detected', 'Masked in screening metadata'],
              ['issuer.verification', screening.issuerVerification.status, 'No issuer API configured'],
            ] : []),
            ...(localReview ? [
              ['local_model.status', localReview.status, localReview.model || 'Ollama · local'],
              ...(localReview.status === 'complete'
                ? [
                  ['local_model.image_quality', localReview.imageQuality, 'Visual observation only'],
                  ['local_model.layout_observation', localReview.layoutObservation, 'Visual observation only'],
                  ['local_model.decision', localReview.decision, 'No authenticity decision'],
                ]
                : [['local_model.message', localReview.message, 'No authenticity decision']]),
            ] : []),
          ],
          localModelReview: localReview,
          screening,
          qrSafety: screening?.qrSafety || qrSafety || { status: 'not_checked', signatureVerification: 'unavailable' },
          digitalSignature: digitalSignature || { status: 'not_verified', cryptographicVerification: 'unavailable' },
          duplicateCheck: analysis.duplicateCheck,
          ocrText: analysis.ocr.text,
          remote: true,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
          analyzedAt: new Date().toISOString(),
        })
        setCloudDocumentId('')
        navigate('results')
        return
      }
      setStageLabel('Generated an illustrative report from the synthetic sample; no OCR or forgery checks ran.')
      setProgress(100)
      const seed = Number.parseInt(hash.slice(0, 8), 16)
      const report = {
        name: file.name,
        size: file.size,
        type: docType,
        hash,
        risk: ['Low', 'Review', 'Elevated'][seed % 3],
        confidence: `${72 + (seed % 25)}%`,
        anomalies: seed % 4,
        duplicateCheck: { status: 'unavailable' },
        qrSafety: { status: 'not_checked', signatureVerification: 'unavailable' },
        digitalSignature: { status: 'not_verified', cryptographicVerification: 'unavailable' },
        signals: [
          ['ela.residual.max', ((seed % 500) / 1000).toFixed(3), 'Synthetic sample'],
          ['font.weight.delta', `${(seed % 18) + 2}.${seed % 10}%`, 'Synthetic sample'],
          ['copy_move.pairs', String(seed % 3), 'Synthetic sample'],
          ['ocr.confidence', `0.${80 + (seed % 19)}`, 'Illustrative only'],
        ],
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
        analyzedAt: new Date().toISOString(),
      }
      onComplete(report)
      navigate('results')
    } catch (analysisError) {
      console.error('Unable to complete document analysis.', analysisError)
      setError(analysisError.message || 'The file could not be analyzed. Please retry.')
      onToast('Document analysis failed.')
    } finally {
      if (scanId.current === id) setBusy(false)
    }
  }

  useEffect(() => () => { scanId.current += 1 }, [])

  return (
    <div className="wrap section page-view">
      <SectionHeading eyebrow="Screening console" title="Submit a document for review">{session ? 'Real document scans use private storage and the configured OCR service. Reports are screening aids, not authenticity decisions.' : 'Guest mode is limited to the fictional synthetic sample. Sign in before analyzing a real document.'}</SectionHeading>
      <div className="screen-grid">
        <Panel className="screen-panel">
          <div className={`dropzone ${file ? 'has-file' : ''}`} onClick={(event) => { if (!event.target.closest('button')) inputRef.current?.click() }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void selectFile(event.dataTransfer.files[0]) }}>
            <div className="drop-icon"><Icon name="upload" size={25} /></div><h3>{file ? 'Document ready for review' : 'Drop a document here'}</h3><p>PNG, JPG, WEBP or PDF · up to 8 MB · {session ? 'private cloud processing' : 'processed locally'}</p>
            <div className="drop-actions"><Button type="button" onClick={() => inputRef.current?.click()}><Icon name="file" size={16} /> Browse files</Button><Button type="button" onClick={useDemo}><Icon name="target" size={16} /> Use demo document</Button></div>
          </div>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" hidden onChange={(event) => { void selectFile(event.target.files?.[0]); event.target.value = '' }} />
          <div className="camera-controls">
            <div className="camera-controls-heading"><span className="feature-icon"><Icon name="camera" size={17} /></span><div><strong>Live document camera</strong><small>Capture a frame and continue through the existing review workflow.</small></div></div>
            <div className="camera-actions">
              <Button type="button" onClick={() => void openCamera('document')} disabled={busy}><Icon name="camera" size={15} />Open camera</Button>
              {cameraStream && cameraMode === 'document' && <Button type="button" onClick={() => void captureCameraFrame()}><Icon name="scan" size={15} />Capture document</Button>}
              {cameraStream && <Button type="button" onClick={stopCamera}><Icon name="close" size={15} />Stop camera</Button>}
              <Button type="button" onClick={startVoiceScan} disabled={voiceScanning || busy}><Icon name="mic" size={15} />{voiceScanning ? 'Listening…' : 'Voice commands'}</Button>
            </div>
            {cameraStream && <div className="camera-preview"><video ref={videoRef} autoPlay muted playsInline aria-label={cameraMode === 'face' ? 'Front camera preview for local comparison' : 'Live document camera preview'} /><span>{cameraMode === 'face' ? 'FRONT CAMERA · TEMPORARY PREVIEW' : 'LIVE CAMERA · NOT UPLOADED UNTIL YOU RUN REVIEW'}</span></div>}
            {cameraError && <p className="camera-message error" role="alert">{cameraError}</p>}
            {voiceScanNotice && <p className="camera-message" role="status">{voiceScanNotice}</p>}
            <p className="camera-disclosure">Camera access requires permission and HTTPS or localhost. Voice recognition is browser-provided; audio is not uploaded to IDShield, but the browser may process it externally.</p>
          </div>
          {error && <div className="form-error" role="alert"><Icon name="alert" size={16} />{error}</div>}
          {cloudDocumentId && <div className="cloud-upload-cleanup"><p className="small-muted">A private cloud file was created for this analysis.</p><Button type="button" disabled={deletingUpload} onClick={deleteCloudUpload}><Icon name="close" size={15} />{deletingUpload ? 'Deleting…' : 'Delete private upload'}</Button></div>}
          {file && <FileChip file={file} onRemove={reset} />}
          <Panel className="face-comparison-panel">
            <div className="camera-controls-heading"><span className="feature-icon"><Icon name="eye" size={17} /></span><div><strong>Photo consistency · manual comparison</strong><small>Compare the document portrait and live photo side by side. No face recognition or automated identity match is performed.</small></div></div>
            <label className="document-consent face-consent"><input type="checkbox" checked={faceConsent} onChange={(event) => { setFaceConsent(event.target.checked); setCameraError(''); if (!event.target.checked) { setPortraitPreviewUrl(''); setSelfiePreviewUrl(''); if (cameraMode === 'face') stopCamera() } }} /><span><strong>Consent to temporary local comparison.</strong> I am authorized to view these photos together. They are not uploaded by this comparison feature and are cleared when I leave this screen.</span></label>
            <input ref={portraitInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => { void selectPortraitPhoto(event.target.files?.[0]); event.target.value = '' }} />
            <div className="camera-actions face-actions"><Button type="button" onClick={() => portraitInputRef.current?.click()} disabled={!faceConsent}><Icon name="file" size={15} />Choose portrait image</Button><Button type="button" onClick={captureFacePhoto} disabled={!faceConsent}><Icon name="camera" size={15} />{cameraStream && cameraMode === 'face' ? 'Capture reference photo' : 'Open front camera'}</Button></div>
            {(portraitPreviewUrl || selfiePreviewUrl) && <div className="face-comparison-grid">{[[portraitPreviewUrl, 'Document portrait image'], [selfiePreviewUrl, 'Live reference photo']].map(([preview, label]) => <div className="face-photo-slot" key={label}>{preview ? <img src={preview} alt={label} /> : <div className="face-photo-empty"><Icon name="user" size={24} /><span>{label} not selected</span></div>}<small>{label}</small></div>)}</div>}
            <p className="camera-disclosure">This is a user-led visual aid only. IDShield does not detect faces, calculate similarity, establish identity, or make decisions.</p>
          </Panel>
          {session && file && !demoSample && <label className="document-consent"><input type="checkbox" checked={consentAccepted} onChange={(event) => { setConsentAccepted(event.target.checked); setError('') }} /><span><strong>Confirm authorized processing.</strong> I am authorized to submit this document and consent to private storage and OCR. Extracted text is shown only in this browser session; issuer verification is not performed.</span></label>}
          <div className="form-row"><label className="field-label" htmlFor="documentType">Document type</label><select className="select" id="documentType" value={docType} onChange={(event) => setDocType(event.target.value)}><option>Identity document</option><option>Aadhaar card</option><option>PAN card</option><option>Passport</option><option>Driving licence</option><option>Degree certificate</option><option>Other</option></select></div>
          <div className="screen-actions"><Button variant="primary" disabled={!file || busy || (!session && !demoSample) || (session && !demoSample && !consentAccepted)} onClick={analyze}><Icon name="scan" />{busy ? 'Analyzing…' : demoSample ? 'Run synthetic demo' : 'Run document review'}</Button><Button onClick={reset}>Reset</Button></div>
          {busy && <div className="progress-wrap" aria-live="polite"><div className="progress-label"><span>{stageLabel}</span><span>{progress}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div><p>{session && !demoSample ? 'Cloud analysis runs OCR only; a trained forgery model is not connected.' : 'The synthetic sample produces illustrative results only.'}</p></div>}
        </Panel>
        <div className="side-stack">
          <Panel><Eyebrow>What is processed</Eyebrow><div className="key-value"><span>Text layer</span><strong>{session ? 'Tesseract OCR' : 'Local demo only'}</strong></div><div className="key-value"><span>Image review</span><strong>{session ? 'Local Ollama model' : 'Not run'}</strong></div><div className="key-value"><span>Forgery classifier</span><strong>Not configured</strong></div><div className="key-value"><span>Integrity</span><strong>SHA-256 · local</strong></div><div className="key-value"><span>Private storage</span><strong>{session ? 'Supabase' : 'Not used'}</strong></div><div className="key-value"><span>Issuer registry</span><strong>Not connected</strong></div></Panel>
          <Panel><Eyebrow>Processing notice</Eyebrow><p className="panel-copy">{session ? 'Real scans upload to private storage, then OCR and configured image checks run. No trained forgery model or issuer registry is connected.' : 'Guest mode does not upload documents. Only the fictional synthetic sample can be analyzed without signing in.'} Never rely on this prototype for an identity decision.</p></Panel>
          <Panel><Eyebrow>Accepted formats</Eyebrow><div className="chips format-chips"><span className="tag">PNG</span><span className="tag">JPG</span><span className="tag">WEBP</span><span className="tag">PDF</span></div><p className="small-muted">Maximum 8 MB. Password-protected PDFs are not analyzed by this prototype.</p></Panel>
        </div>
      </div>
    </div>
  )
}

function ResultsView({ report, navigate, onToast, onDelete }) {
  const [tab, setTab] = useState('forensics')
  const [deleting, setDeleting] = useState(false)
  const [aiExplanationResult, setAiExplanationResult] = useState(null)
  useEffect(() => {
    if (!report?.remote) return undefined

    const controller = new AbortController()
    const findings = createSafetyReport(report).findings.map(({ category, status, riskLevel }) => ({
      category,
      status,
      riskLevel,
    }))
    const message = `Return JSON only as {"explanations":{"category":"one concise sentence"}} with one entry for each provided category. Explain only the supplied status and risk level. Do not infer missing facts or make authenticity, approval, rejection, or legal-validity claims. The OCR text and original document are not included. Categories: ${JSON.stringify(findings)}`

    apiRequest('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history: [] }),
      signal: controller.signal,
    }).then(({ reply }) => {
      if (controller.signal.aborted) return
      const parsed = parseSafetyExplanations(reply)
      if (!parsed) throw new Error('The local model returned incomplete safety explanations.')
      setAiExplanationResult({ report, explanations: parsed, status: 'ready' })
    }).catch((error) => {
      if (controller.signal.aborted) return
      console.error('Unable to generate local safety explanations.', error)
      setAiExplanationResult({ report, explanations: null, status: 'unavailable', error: error.message })
    })

    return () => controller.abort()
  }, [report])
  const currentAiExplanation = aiExplanationResult?.report === report
    ? aiExplanationResult
    : { status: report?.remote ? 'loading' : 'idle', explanations: null, error: '' }
  const aiExplanations = currentAiExplanation.explanations
  const aiExplanationStatus = currentAiExplanation.status
  if (!report) return <div className="wrap section page-view"><Panel className="empty-state"><Icon name="file" size={28} /><h2>No report yet</h2><p>Run a screening to create a sample report.</p><Button variant="primary" onClick={() => navigate('screen')}>Open screening console</Button></Panel></div>
  const safetyReport = createSafetyReport(report)
  const reportQrSafety = report.qrSafety || report.screening?.qrSafety || { status: 'not_checked' }
  const qrStatusLabel = {
    insecure_http: 'Insecure HTTP destination detected',
    suspicious_scheme: 'Unsupported QR destination scheme',
    unverified_url: 'HTTPS destination found · not verified',
    decoded_unverified: 'QR detected/decoded · destination unverified',
    unreadable: 'QR detected but unreadable',
    not_found: 'No readable QR detected',
    not_checked: 'QR check not performed',
    unavailable: 'QR check unavailable',
  }[reportQrSafety.status] || 'QR check unavailable'
  const exportedSafetyReport = aiExplanations
    ? {
      ...safetyReport,
      explanation: aiExplanations['Safety Assessment'],
      findings: safetyReport.findings.map((item) => ({
        ...item,
        explanation: aiExplanations[item.category],
      })),
    }
    : safetyReport
  const exportReport = () => {
    const content = [
      report.remote ? 'IDShield AI — OCR processing report' : 'IDShield AI — Synthetic prototype report',
      `File: ${report.name}`,
      `Document type: ${report.type}`,
      `SHA-256: ${report.hash}`,
      report.remote ? 'Forgery model: not configured; no risk score produced.' : `Synthetic risk band: ${report.risk}`,
      `OCR confidence: ${report.confidence}`,
      ...(report.localModelReview?.status ? [`Local vision review: ${report.localModelReview.status}`] : []),
      ...(report.localModelReview?.imageQuality ? [`Local image quality: ${report.localModelReview.imageQuality}`] : []),
      ...(report.localModelReview?.layoutObservation ? [`Local layout observation: ${report.localModelReview.layoutObservation}`] : []),
      `QR check: ${qrStatusLabel}`,
      'QR signature verification: unavailable; no trusted issuer key configured.',
      `PDF signature structure: ${report.digitalSignature?.status === 'signature_present_unverified' ? 'signature marker detected; cryptographic verification unavailable' : report.digitalSignature?.status === 'not_detected' ? 'no signature marker detected; cryptographic verification unavailable' : report.digitalSignature?.status === 'not_applicable' ? 'not applicable to an image file' : 'not verified'}`,
      '',
      report.remote
        ? 'OCR text is intentionally not included in exported reports.'
        : 'Classifier and forensic signals are synthetic, not an authenticity determination.',
      '',
      'SAFETY & RISK ASSESSMENT',
      `Overall status: ${safetyReport.status}`,
      `Overall risk level: ${safetyReport.riskLevel}`,
      exportedSafetyReport.explanation,
      ...exportedSafetyReport.findings.flatMap((item) => [
        '',
        `${item.category}: ${item.status} · ${item.riskLevel} risk`,
        `Reason: ${item.reason}`,
        ...(item.explanation ? [`AI explanation: ${item.explanation}`] : []),
        `Evidence: ${item.evidence}`,
        `Recommended action: ${item.recommendedAction}`,
      ]),
      '',
      safetyReport.regionNotice,
    ].join('\n')
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'idshield-report.txt'
    link.click()
    URL.revokeObjectURL(url)
  }
  const deleteReport = async () => {
    if (!report.remote || !report.documentId) return
    setDeleting(true)
    try {
      await apiRequest(`/documents/${report.documentId}`, { method: 'DELETE' })
      onDelete()
      navigate('screen')
      onToast('Private upload deleted.')
    } catch (deleteError) {
      onToast(`Unable to delete private upload: ${deleteError.message}`)
    } finally {
      setDeleting(false)
    }
  }
  return <div className="wrap section page-view">
    <div className="report-heading"><div><Eyebrow>{report.remote ? 'Private OCR + local vision review · human decision required' : 'Synthetic sample · illustrative results'}</Eyebrow><h2>{report.remote ? 'Document review report' : 'Sample report'}</h2><p className="small-muted">{report.name} · {new Date(report.analyzedAt).toLocaleString()}</p></div><div className="report-actions">{report.remote && <Button disabled={deleting} onClick={deleteReport}><Icon name="close" />{deleting ? 'Deleting…' : 'Delete private file'}</Button>}<Button onClick={() => navigate('assistant')}><Icon name="bot" /> Open assistant</Button><Button onClick={exportReport}><Icon name="download" /> Export text</Button><Button onClick={() => downloadSafetyReportPdf(report, exportedSafetyReport)}><Icon name="download" /> Safety PDF</Button></div></div>
    <div className="report-grid">
      <Panel className="report-preview-panel"><div className="document-preview">{report.previewUrl ? <img src={report.previewUrl} alt="Local uploaded document preview" /> : <div className="pdf-preview"><Icon name="file" size={40} /><strong>PDF document</strong><span>Preview unavailable in this prototype</span></div>}<span className="preview-label">LOCAL PREVIEW</span></div><div className="preview-meta"><span>{report.name}</span><span>{(report.size / 1024).toFixed(1)} KB</span></div><div className="disclosure-inline"><Icon name="lock" size={15} /> File preview remains in this browser session.</div></Panel>
      <Panel className="risk-panel"><div className="risk-gauge"><div className={`risk-circle ${report.remote ? '' : report.risk.toLowerCase()}`}><strong>{report.risk}</strong><span>{report.remote ? 'no classifier score' : 'synthetic risk band'}</span></div></div><div className="key-value"><span>Risk band</span><strong className={report.remote ? '' : `risk-text ${report.risk.toLowerCase()}`}>{report.remote ? 'Not scored · no classifier configured' : `${report.risk} · synthetic`}</strong></div><div className="key-value"><span>OCR confidence</span><strong>{report.confidence}</strong></div><div className="key-value"><span>{report.remote ? 'OCR words' : 'Synthetic signals'}</span><strong>{report.remote ? (report.signals[1]?.[1] ?? '0') : report.anomalies}</strong></div><div className="key-value"><span>Integrity digest</span><strong className="mono">{report.hash.slice(0, 12)}…</strong></div><div className="key-value"><span>Registry match</span><strong>Not connected</strong></div><div className="next-steps"><Eyebrow>Recommended next steps</Eyebrow><ul><li>Independently verify with the document issuer.</li><li>Review the original document in person.</li><li>Do not use this prototype as an authenticity decision.</li></ul></div></Panel>
    </div>
    <Panel className="verification-methods-panel">
      <div className="dashboard-panel-heading"><div><Eyebrow>QR &amp; digital signature checks</Eyebrow><h3>Verification status</h3></div><span className="tag amber">No issuer key configured</span></div>
      <div className="verification-methods-grid">
        <div><span className="verification-label"><Icon name="scan" size={15} /> QR destination scan</span><strong>{qrStatusLabel}</strong><small>Payloads are not displayed or opened. QR destination classification does not verify a document signature.</small></div>
        <div><span className="verification-label"><Icon name="lock" size={15} /> Cryptographic signature</span><strong>{report.digitalSignature?.status === 'signature_present_unverified' ? 'PDF signature marker detected · not verified' : report.digitalSignature?.status === 'not_detected' ? 'No PDF signature marker detected' : report.digitalSignature?.status === 'not_applicable' ? 'Not applicable to image files' : 'Not verified'}</strong><small>{report.digitalSignature?.status === 'signature_present_unverified' ? 'A PDF marker is not proof of a valid signature. Signer, certificate chain, revocation, and signed-byte integrity have not been checked.' : report.digitalSignature?.status === 'not_applicable' ? 'Signature marker inspection is available only for PDFs. No cryptographic signature verification is configured.' : 'No authorized signature provider or trusted issuer certificate is configured. A QR code alone is not a digital signature.'}</small></div>
      </div>
    </Panel>
    <section className="safety-dashboard" aria-labelledby="safety-dashboard-title">
      <div className="safety-dashboard-heading"><div><Eyebrow>{report.remote ? 'AI-assisted safety & risk assessment' : 'Safety & risk assessment'}</Eyebrow><h2 id="safety-dashboard-title">Safety report</h2><p className="small-muted">Evidence-grounded triage. Unavailable checks are explicitly marked rather than treated as clear.</p></div><span className={`safety-status status-${safetyReport.status.toLowerCase().replaceAll(' ', '-')}`}>{safetyReport.status} · {safetyReport.riskLevel} risk</span></div>
      <Panel className={`safety-summary risk-${safetyReport.riskLevel.toLowerCase()}`}><div className="safety-summary-score"><span>Overall risk</span><strong>{safetyReport.riskLevel}</strong><small>{safetyReport.findings.length} assessment categories</small></div><div className="safety-summary-copy"><Eyebrow>{aiExplanations ? 'AI-generated explanation' : 'Automated explanation'}</Eyebrow><p>{aiExplanations?.['Safety Assessment'] || safetyReport.explanation}</p><small>{aiExplanationStatus === 'loading' ? 'Generating explanations locally from category statuses only; OCR text and the document are not sent to the model.' : aiExplanationStatus === 'unavailable' ? `Local AI explanation unavailable${currentAiExplanation.error ? `: ${currentAiExplanation.error}` : ''}. Showing the evidence-based fallback.` : aiExplanations ? 'Generated locally from category statuses only; no OCR text or document image was sent to the model.' : 'Rule-based explanation from available OCR and image signals; it is not an issuer verification or an automatic decision.'}</small></div><div className="safety-counts"><div><strong>{safetyReport.findings.slice(1).filter((item) => item.status === 'Suspicious' || item.status === 'High Risk').length}</strong><span>Review indicators</span></div><div><strong>{safetyReport.findings.slice(1).filter((item) => item.status === 'Unable to Verify').length}</strong><span>Unverified</span></div><div><strong>{safetyReport.findings.slice(1).filter((item) => item.status === 'Safe').length}</strong><span>Safe checks</span></div></div></Panel>
      {safetyReport.highlightedFindings.length > 0 && <Panel className="highlighted-findings"><div className="highlighted-heading"><Icon name="alert" size={17} /><strong>Highlighted review indicators</strong></div><div>{safetyReport.highlightedFindings.map((item) => <span className="highlighted-tag" key={item.category}>{item.category} · {item.riskLevel} risk</span>)}</div></Panel>}
      <div className="safety-findings">{safetyReport.findings.map((item) => <article className={`safety-finding ${item.status === 'Suspicious' || item.status === 'High Risk' ? 'is-highlighted' : ''}`} key={item.category}><div className="safety-finding-heading"><h3>{item.category}</h3><span className={`safety-status status-${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</span></div><div className="safety-risk-level"><span>Risk level</span><strong className={`risk-${item.riskLevel.toLowerCase()}`}>{item.riskLevel}</strong></div><p>{item.reason}</p>{aiExplanations && <div className="safety-detail"><strong>AI-generated explanation</strong><span>{aiExplanations[item.category]}</span></div>}<div className="safety-detail"><strong>Evidence / indicators</strong><span>{item.evidence}</span></div><div className="safety-detail"><strong>Recommended action</strong><span>{item.recommendedAction}</span></div></article>)}</div>
      <div className="region-notice"><Icon name="eye" size={16} /><p><strong>Highlighted regions:</strong> {safetyReport.regionNotice}</p></div>
    </section>
    <div className="tabs" role="tablist" aria-label="Report details">{[['forensics', 'Forensic signals'], ['extracted', 'Extracted data'], ['integrity', 'Integrity & cross-check']].map(([key, title]) => <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{title}</button>)}</div>
    <Panel className="tab-content">{tab === 'forensics' ? <><div className="table-scroll"><table className="data-table"><thead><tr><th>Signal</th><th>Value</th><th>Source</th></tr></thead><tbody>{report.signals.map(([name, value, source]) => <tr key={name}><td className="mono">{name}</td><td>{value}</td><td><span className={`tag ${report.remote ? 'cyan' : 'amber'}`}>{source}</span></td></tr>)}</tbody></table></div><p className="small-muted">{report.remote ? 'OCR and local-model observations are descriptive only; no forgery classifier was run.' : 'These sample signals are generated from the file digest; they do not represent actual forensic analysis.'}</p></> : tab === 'extracted' ? report.remote ? <div className="ocr-result"><Eyebrow>OCR text · current report only</Eyebrow><p>{report.ocrText || 'No readable text was detected.'}</p><small>OCR text is held in page memory and is not saved to the database or included in exports.</small></div> : <div className="empty-state compact"><Icon name="eye" /><strong>No text was extracted</strong><p>OCR is not connected in this local demo.</p></div> : <><div className="key-value"><span>SHA-256</span><strong className="mono hash-value">{report.hash}</strong></div><div className="key-value"><span>File format</span><strong>{report.name.split('.').pop()?.toUpperCase()} · header validated locally</strong></div><div className="key-value"><span>Issuer cross-check</span><strong>Unavailable · issuer APIs are not connected</strong></div></>}</Panel>
    <div className="prototype-warning"><Icon name="alert" size={18} /><p><strong>{report.remote ? 'Model disclosure:' : 'Prototype disclosure:'}</strong> {report.remote ? 'This report contains OCR output and descriptive local-model observations only. No trained forgery classifier, risk score, or authenticity determination was produced; issuer APIs are not connected.' : 'Only file-type validation and SHA-256 hashing are performed on the actual file. Risk, confidence, OCR, and forensic signals are synthetic. This report does not determine authenticity.'}</p></div>
  </div>
}

function AdminMembersPanel({ profile }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyUser, setBusyUser] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const isAdmin = profile?.role === 'institution_admin'

  useEffect(() => {
    if (!isAdmin) return undefined
    const controller = new AbortController()
    apiRequest('/admin/profiles', { signal: controller.signal }).then(({ profiles: memberProfiles }) => {
      if (!controller.signal.aborted) setProfiles(memberProfiles)
    }).catch((loadError) => {
      if (!controller.signal.aborted) setError(loadError.message)
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [isAdmin])

  const inviteMember = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      const { profile: invitedProfile } = await apiRequest('/admin/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email'), fullName: form.get('fullName') }),
      })
      formElement.reset()
      setProfiles((items) => [invitedProfile, ...items])
      setMessage('Invitation sent. The account will join this institution as a member.')
    } catch (inviteError) {
      setError(inviteError.message)
    }
  }

  const changeRole = async (member, role) => {
    setBusyUser(member.id)
    setError('')
    setMessage('')
    try {
      const { profile: updated } = await apiRequest(`/admin/profiles/${member.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
      setProfiles((items) => items.map((item) => item.id === updated.id ? { ...item, role: updated.role } : item))
      setMessage(`Updated ${updated.email}'s role.`)
    } catch (roleError) {
      setError(roleError.message)
    } finally {
      setBusyUser('')
    }
  }

  if (!isAdmin) return null
  return <Panel className="admin-members-panel">
    <div className="panel-title-row"><div><h3>Institution accounts</h3><p className="small-muted">Manage accounts assigned to your institution. Administrator privileges are managed by the API.</p></div><span className="tag cyan">admin</span></div>
    <form className="admin-invite" onSubmit={inviteMember}>
      <div className="form-row"><label className="field-label" htmlFor="inviteFullName">Member name</label><input className="input" id="inviteFullName" name="fullName" autoComplete="name" required maxLength={120} /></div>
      <div className="form-row"><label className="field-label" htmlFor="inviteEmail">Member email</label><input className="input" id="inviteEmail" name="email" type="email" autoComplete="email" required maxLength={254} /></div>
      <Button variant="primary" type="submit"><Icon name="users" /> Invite member</Button>
    </form>
    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p className="form-success" role="status">{message}</p>}
    <div className="table-scroll"><table className="case-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead><tbody>{profiles.map((member) => <tr key={member.id}><td>{member.full_name || '—'}</td><td>{member.email}</td><td>{member.role.replace('_', ' ')}</td><td>{member.id === profile.user.id ? <span className="small-muted">Current account</span> : <Button disabled={busyUser === member.id} onClick={() => changeRole(member, member.role === 'institution_admin' ? 'member' : 'institution_admin')}>{member.role === 'institution_admin' ? 'Make member' : 'Make admin'}</Button>}</td></tr>)}{!loading && profiles.length === 0 && <tr><td colSpan="4">No accounts are assigned to this institution yet.</td></tr>}{loading && <tr><td colSpan="4">Loading institution accounts…</td></tr>}</tbody></table></div>
  </Panel>
}

function DashboardView({ navigate, profile }) {
  const isAdmin = profile?.role === 'institution_admin'
  const [documents, setDocuments] = useState([])
  const [totalDocuments, setTotalDocuments] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const userId = profile?.user?.id

  const refreshHistory = () => {
    setError('')
    setLoading(true)
    setRefreshKey((key) => key + 1)
  }

  useEffect(() => {
    if (!userId || !supabase) return undefined

    let active = true
    supabase
      .from('documents')
      .select('id, mime_type, analysis_status, analysis_summary, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, count, error: queryError }) => {
        if (!active) return
        if (queryError) throw queryError
        setDocuments(data || [])
        setTotalDocuments(count ?? data?.length ?? 0)
      })
      .catch((loadError) => {
        if (!active) return
        console.error('Unable to load document screening history.', loadError)
        setError(loadError.message || 'Screening history is unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [userId, refreshKey])

  const analytics = summarizeDashboardRecords(documents)
  const latestRecords = documents.slice(0, 8)
  const maxMonthlyVolume = Math.max(...analytics.monthlyVolume.map(({ count }) => count), 1)

  return <div className="wrap section page-view">
    <div className="dashboard-welcome">
      <SectionHeading eyebrow={isAdmin ? 'Institution workspace' : 'Secure account workspace'} title="Security operations overview">
        {isAdmin
          ? 'Review institution-scoped screening activity and manage provisioned accounts.'
          : 'Track your real document screening activity. Reports remain triage aids; human review is required.'}
      </SectionHeading>
      <div className="dashboard-actions">
        <Button disabled={loading} onClick={refreshHistory}><Icon name="refresh" size={16} />{loading ? 'Refreshing…' : 'Refresh'}</Button>
        <Button variant="primary" onClick={() => navigate('screen')}><Icon name="scan" /> New screening</Button>
      </div>
    </div>
    <Panel className="dashboard-account-strip">
      <span className="dashboard-avatar">{profile?.user?.email?.[0]?.toUpperCase() || 'U'}</span>
      <div><Eyebrow>Signed in as</Eyebrow><strong>{profile?.user?.email || 'Loading account…'}</strong></div>
      <span className="account-role">{profile?.role?.replace('_', ' ') || 'Loading role…'}</span>
      <span className="dashboard-scope"><Icon name="lock" size={14} /> {isAdmin ? 'Institution-scoped access' : 'Private account records'}</span>
    </Panel>
    {error && <div className="dashboard-error" role="alert"><Icon name="alert" size={17} /><span>{error}</span><Button onClick={refreshHistory}>Retry</Button></div>}
    <section className="dashboard-metrics" aria-label="Document screening statistics" aria-busy={loading}>
      <Panel className="dashboard-metric"><span className="metric-icon"><Icon name="layers" /></span><span className="metric-label">Documents on record</span><strong>{loading || error ? '—' : totalDocuments.toLocaleString()}</strong><small>Visible under your account permissions</small></Panel>
      <Panel className="dashboard-metric"><span className="metric-icon"><Icon name="check" /></span><span className="metric-label">Processed</span><strong>{loading || error ? '—' : analytics.completedCount.toLocaleString()}</strong><small>From up to 500 recent records</small></Panel>
      <Panel className="dashboard-metric"><span className="metric-icon"><Icon name="clock" /></span><span className="metric-label">Awaiting analysis</span><strong>{loading || error ? '—' : analytics.pendingCount.toLocaleString()}</strong><small>Uploaded records not yet processed</small></Panel>
      <Panel className={`dashboard-metric ${analytics.duplicateCount ? 'metric-attention' : ''}`}><span className="metric-icon"><Icon name="alert" /></span><span className="metric-label">Repeated-file signals</span><strong>{loading || error ? '—' : analytics.duplicateCount.toLocaleString()}</strong><small>Exact matches · not a fraud determination</small></Panel>
    </section>
    <section className="dashboard-analytics" aria-label="Screening analytics">
      <Panel className="dashboard-activity-panel">
        <div className="dashboard-panel-heading"><div><Eyebrow>Recent activity</Eyebrow><h3>Screening volume</h3></div><span className="tag cyan">6 months</span></div>
        {loading
          ? <div className="dashboard-loading" role="status"><span className="loading-spinner" /> Loading screening activity…</div>
          : error
            ? <div className="dashboard-chart-error">Activity is unavailable until the secure history can be loaded.</div>
            : <div className="activity-chart" role="img" aria-label={`Monthly screening volume: ${analytics.monthlyVolume.map(({ label, count }) => `${label}: ${count}`).join(', ')}`}>
            {analytics.monthlyVolume.map(({ key, label, count }) => <div className="activity-month" key={key} title={`${label}: ${count} ${count === 1 ? 'document' : 'documents'}`}>
              <span className="activity-count">{count || ''}</span>
              <div className="activity-bar-track"><span style={{ height: `${count ? Math.max(8, (count / maxMonthlyVolume) * 100) : 0}%` }} /></div>
              <span className="activity-label">{label}</span>
            </div>)}
          </div>}
        <p className="dashboard-chart-note">Based on up to 500 recent visible records. No risk or authenticity score is inferred.</p>
      </Panel>
      <Panel className="dashboard-alerts-panel">
        <div className="dashboard-panel-heading"><div><Eyebrow>Signals requiring attention</Eyebrow><h3>Review queue</h3></div><span className={`alert-count ${analytics.alerts.length ? 'has-alerts' : ''}`}>{loading ? '—' : analytics.alerts.length}</span></div>
        {loading
          ? <div className="dashboard-loading" role="status"><span className="loading-spinner" /> Checking saved analysis signals…</div>
          : error
            ? <div className="dashboard-chart-error">Saved review signals could not be loaded.</div>
            : analytics.alerts.length
            ? <div className="dashboard-alert-list">{analytics.alerts.slice(0, 4).map(({ id, type, createdAt }) => <div className="dashboard-alert" key={id}><span className="alert-marker"><Icon name="alert" size={15} /></span><div><strong>{type === 'duplicate' ? 'Exact file match detected' : 'OCR requires attention'}</strong><small>{type === 'duplicate' ? 'Repeat-upload signal · not proof of fraud' : 'The configured OCR check was unavailable or unsupported'}</small><small>{formatDashboardDate(createdAt)}</small></div></div>)}</div>
            : <div className="dashboard-clear-state"><span><Icon name="check" size={18} /></span><strong>No saved review signals</strong><p>Only configured checks are shown. This is not a finding that a document is authentic.</p></div>}
      </Panel>
    </section>
    <Panel className="dashboard-history">
      <div className="dashboard-panel-heading"><div><Eyebrow>Verification history</Eyebrow><h3>Recent document activity</h3></div><span className="small-muted">Showing up to 8 of {documents.length} loaded records</span></div>
      {loading
        ? <div className="dashboard-loading" role="status"><span className="loading-spinner" /> Loading secure history…</div>
        : error
          ? <div className="dashboard-empty-history">History could not be loaded. Retry to check the secure document service.</div>
          : latestRecords.length
            ? <div className="table-scroll"><table className="dashboard-history-table"><thead><tr><th>Document</th><th>Added</th><th>Processing</th><th>OCR status</th><th>Signals</th></tr></thead><tbody>{latestRecords.map((record) => {
              const summary = record.analysis_summary || {}
              const processing = record.analysis_status === 'complete' ? 'Processed' : 'Awaiting analysis'
              const ocrStatus = summary.status === 'complete' ? 'OCR complete' : summary.status === 'unavailable' ? 'OCR unavailable' : summary.status === 'unsupported_file_type' ? 'OCR unsupported' : 'Not run'
              const duplicate = summary.duplicateStatus === 'duplicate_found'
              const fileType = record.mime_type === 'application/pdf' ? 'PDF document' : record.mime_type?.startsWith('image/') ? `${record.mime_type.slice(6).toUpperCase()} image` : 'Document'
              return <tr key={record.id}><td><span className="history-file-icon"><Icon name="file" size={16} /></span><span>{fileType}</span></td><td>{formatDashboardDate(record.created_at)}</td><td><span className={`history-status ${record.analysis_status === 'complete' ? 'is-complete' : 'is-pending'}`}>{processing}</span></td><td>{ocrStatus}</td><td>{duplicate ? <span className="history-alert-tag">Exact repeat</span> : <span className="history-neutral-tag">No saved alert</span>}</td></tr>
            })}</tbody></table></div>
            : <div className="dashboard-empty-history"><Icon name="layers" size={22} /><strong>No document history yet</strong><p>Start a screening to see real, account-scoped activity here.</p><Button variant="primary" onClick={() => navigate('screen')}>Start a screening</Button></div>}
      <p className="dashboard-privacy-note"><Icon name="lock" size={14} /> This view loads document metadata only. OCR text, identifier values, and document images are not requested.</p>
    </Panel>
    {isAdmin && <AdminMembersPanel profile={profile} />}
  </div>
}

const quickQuestions = ['Why was my document flagged?', 'What is SHA-256 used for?', 'How accurate is the model?', 'Is my document stored?', 'Explain QR and signature checks', 'How does voice scanning work?', 'Explain photo consistency']
function assistantAnswer(question) {
  const text = question.toLowerCase()
  if (text.includes('sha') || text.includes('hash') || text.includes('fingerprint')) return 'SHA-256 creates a fixed-length digest from the exact file bytes. Matching digests indicate byte-identical files; a digest does not prove that the original document is genuine.'
  if (text.includes('qr') || text.includes('signature')) return 'IDShield can classify a readable QR destination without displaying or opening its payload. A PDF signature marker may be noted, but cryptographic verification, signer trust, certificate validity, and issuer checks are not configured. QR decoding is not signature verification.'
  if (text.includes('voice') || text.includes('speech') || text.includes('microphone')) return 'Voice scanning uses browser-provided speech recognition for explicit camera commands only. Audio is not uploaded to IDShield, but the browser may process it externally. This is not voice biometrics or identity verification.'
  if (text.includes('face') || text.includes('photo') || text.includes('portrait')) return 'Photo consistency is a consent-gated, local side-by-side visual aid. IDShield does not detect faces, calculate similarity, perform automated face matching, or establish identity.'
  if (text.includes('stored') || text.includes('privacy') || text.includes('upload')) return 'Guest mode only analyzes the fictional sample. Signed-in document review uploads the file to private storage after your consent; extracted OCR text remains in the current page session and is excluded from reports. You can delete the private upload from its report. Browser speech recognition may process voice commands externally.'
  if (text.includes('accurate') || text.includes('confidence') || text.includes('model')) return 'There is no live trained classifier in this prototype, so its synthetic confidence values are not an accuracy measure. Real deployment would require independent evaluation and issuer verification.'
  if (text.includes('error-level') || text.includes('ela') || text.includes('compression')) return 'The configured image check recompresses an image and returns a global difference heuristic. It does not produce localized regions, and scanner noise, recompression, and editing can all affect the result. It cannot prove tampering.'
  if (text.includes('flag') || text.includes('risk') || text.includes('anomal')) return 'The report signals in this demo are deterministic synthetic examples derived from the file hash. They are not the result of live OCR or image forensics. Treat any signal as a prompt for independent human review, never as proof or an automatic rejection.'
  return 'I can explain the prototype’s workflow, SHA-256 integrity fingerprints, synthetic risk signals, and privacy limits. I cannot verify a document or query an issuer registry.'
}

function AssistantView({ onToast, session }) {
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hi, I’m the IDShield assistant. I can explain forensic signals and this prototype’s limits, but I cannot verify authenticity or access issuer registries.' }])
  const [question, setQuestion] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [requestError, setRequestError] = useState('')
  const send = async (value = question) => {
    const trimmed = value.trim()
    if (!trimmed || busy) return
    const history = messages.slice(-8).map(({ role, text }) => ({ role, text }))
    setMessages((items) => [...items, { role: 'user', text: trimmed }])
    setQuestion('')
    setRequestError('')
    setBusy(true)
    try {
      let answer
      if (session) {
        const result = await apiRequest('/assistant/chat', {
          method: 'POST',
          body: JSON.stringify({ message: trimmed, history }),
        })
        answer = result.reply
      } else {
        answer = assistantAnswer(trimmed)
      }
      setMessages((items) => [...items, { role: 'assistant', text: answer }])
      if (speaking && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(answer))
      }
    } catch (error) {
      setRequestError(`The local model could not reply: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }
  const voiceInput = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      onToast('Voice input is not supported by this browser.')
      return
    }
    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => { setListening(false); onToast('Voice input could not be started.') }
    recognition.onresult = (event) => setQuestion(event.results[0][0].transcript)
    recognition.start()
  }
  return <div className="wrap section page-view">
    <SectionHeading eyebrow="AI verification assistant" title="Ask about a result">{session ? 'Signed-in chats use a pretrained local Ollama model. Messages are not stored by IDShield, and the model has not been fine-tuned on your data.' : 'Guest mode uses local help text. Sign in to use the locally hosted model; no hosted AI provider is used.'}</SectionHeading>
    <div className="assistant-layout"><Panel className="chat-card"><div className="chat-heading"><span className="chat-avatar"><Icon name="bot" /></span><div><strong>IDShield Assistant</strong><small><span className="status-dot" />{session ? ' local model · session-only' : ' grounded · local demo'}</small></div><button type="button" className={`icon-button ${speaking ? 'selected' : ''}`} title="Toggle spoken replies" aria-label="Toggle spoken replies" onClick={() => setSpeaking(!speaking)}><Icon name="volume" /></button></div><div className="chat-messages" aria-live="polite">{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === 'assistant' ? <Icon name="bot" size={16} /> : 'You'}</span><p>{message.text}</p></div>)}{busy && <div className="chat-message assistant" role="status"><span><Icon name="bot" size={16} /></span><p>Local model is thinking…</p></div>}</div>{requestError && <div className="form-error" role="alert"><Icon name="alert" size={16} />{requestError}</div>}<div className="quick-replies">{quickQuestions.map((item) => <button type="button" key={item} disabled={busy} onClick={() => send(item)}>{item}</button>)}</div><form className="chat-input" onSubmit={(event) => { event.preventDefault(); void send() }}><input value={question} onChange={(event) => setQuestion(event.target.value)} disabled={busy} placeholder="Ask about risk scores, OCR, privacy…" aria-label="Ask the assistant" /><button type="button" className={`icon-button ${listening ? 'selected' : ''}`} onClick={voiceInput} aria-label="Voice input" disabled={busy}><Icon name="mic" /></button><button className="send-button" type="submit" aria-label="Send message" disabled={busy || !question.trim()}><Icon name="send" size={17} /></button></form></Panel><div className="side-stack"><Panel><Eyebrow>Assistant scope</Eyebrow><div className="key-value"><span>Grounded in</span><strong>{session ? 'local Ollama model' : 'local help text'}</strong></div><div className="key-value"><span>Voice input</span><strong>browser dependent</strong></div><div className="key-value"><span>Spoken replies</span><strong>optional</strong></div><div className="key-value"><span>Data retention</span><strong>page session only</strong></div></Panel><Panel><Eyebrow>Honest limits</Eyebrow><p className="panel-copy">The assistant cannot access issuer databases and will never claim a document is genuine. It can explain sample evidence and recommend independent verification.</p></Panel></div></div>
  </div>
}

function ResearchView() {
  const notes = [
    ['CONFIGURED HEURISTIC', 'Image recompression signal', 'Re-saves an image at a known JPEG quality and returns a global difference heuristic. The current service does not produce localized regions; recompression and scanner noise can look similar.'],
    ['NOT CONFIGURED', 'Copy-move detection', 'No copy-move detector is connected. Repeated patterns are not currently analyzed as a forgery signal.'],
    ['NOT CONFIGURED', 'Typography & baseline audit', 'No trusted issuer template or typography comparator is connected, so font and baseline differences are not assessed.'],
    ['SIGNAL 04', 'Cryptographic integrity', 'SHA-256 identifies exact byte-level file equality. It cannot determine whether the first copy was genuine.'],
    ['NOT CONFIGURED', 'Cross-document consistency', 'The current workflow analyzes one document at a time and does not compare extracted fields across documents.'],
    ['LIMITS', 'What this prototype does not do', 'OCR runs only when the separately configured FastAPI/Tesseract service is available. No trained forgery model, localized region detector, liveness check, face match, or issuer-registry lookup is connected.'],
  ]
  return <div className="wrap section page-view"><SectionHeading eyebrow="Research notes" title="How forensic signals should be interpreted">A technical companion to the prototype: what signals can suggest, what they cannot prove, and where this demo stops.</SectionHeading><div className="research-grid">{notes.map(([tag, title, description]) => <Panel key={title}><span className={`tag ${tag === 'LIMITS' || tag === 'NOT CONFIGURED' ? 'amber' : 'cyan'}`}>{tag}</span><h3>{title}</h3><p className="panel-copy">{description}</p></Panel>)}</div><Panel className="stack-panel"><Eyebrow>Application stack</Eyebrow><div className="chips"><span className="tag">React + Vite</span><span className="tag">Tailwind CSS</span><span className="tag">Framer Motion</span><span className="tag">Node + Express API</span><span className="tag">Supabase Auth + private Storage</span><span className="tag">Python FastAPI + OpenCV + Tesseract</span><span className="tag">Forgery model not configured</span></div></Panel></div>
}

function AboutView() {
  return <div className="wrap section page-view"><SectionHeading eyebrow="About the project" title="A fraud detector that admits uncertainty">Most document-checking tools return a single word. In real verification work, a single word is the least useful thing you can get — because someone has to sign off on that decision.</SectionHeading><div className="about-grid"><div><p className="long-copy">IDShield AI is presented as an academic prototype exploring how verification officers can be given evidence instead of an opaque verdict. Each stage is designed around the constraint that signals should be understandable to a non-technical reviewer.</p><p className="long-copy">The prototype is deliberately conservative. It labels synthetic results, distinguishes hash integrity from authenticity, and lists manual verification steps. It does not connect to an issuer, and no issuer confirmation is implied.</p><p className="long-copy">The workflow can be evaluated with a synthetic demo document without putting real identity data at risk. Do not rely on prototype outputs for real onboarding, access, or eligibility decisions.</p></div><div className="about-cards"><Panel><span className="feature-icon"><Icon name="target" /></span><h3>Design principle</h3><p className="panel-copy">Automated signals must be traceable and clearly labelled.</p></Panel><Panel><span className="feature-icon"><Icon name="users" /></span><h3>Who it serves</h3><p className="panel-copy">Institutional teams exploring responsible document review.</p></Panel><Panel><span className="feature-icon"><Icon name="shield" /></span><h3>Non-goal</h3><p className="panel-copy">IDShield does not automatically reject a document or replace an authorised human reviewer.</p></Panel></div></div></div>
}

function ContactView({ onToast }) {
  const [submitted, setSubmitted] = useState(false)
  return <div className="wrap section page-view"><SectionHeading eyebrow="Contact" title="Talk to the team">Questions about deployment, integration, or research? Send a note using this prototype form.</SectionHeading><div className="contact-grid"><Panel><form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); onToast('Demo form submitted locally; no message was sent.') }}><div className="form-row"><label className="field-label" htmlFor="contactName">Full name</label><input className="input" id="contactName" placeholder="Your name" required /></div><div className="form-row"><label className="field-label" htmlFor="contactEmail">Email</label><input className="input" id="contactEmail" type="email" placeholder="you@institution.edu" required /></div><div className="form-row"><label className="field-label" htmlFor="contactOrg">Institution</label><input className="input" id="contactOrg" placeholder="Organisation name" /></div><div className="form-row"><label className="field-label" htmlFor="contactMessage">Message</label><textarea className="textarea" id="contactMessage" placeholder="How can we help?" required /></div><Button variant="primary" type="submit"><Icon name="send" /> Send message</Button>{submitted && <p className="form-success" role="status">Thanks — this demo form stores nothing and has not sent a message.</p>}</form></Panel><div className="side-stack"><Panel><Eyebrow>Prototype contact</Eyebrow><div className="key-value"><span>Email</span><strong>team@idshield.ai</strong></div><div className="key-value"><span>Response</span><strong>Not monitored in demo</strong></div></Panel><Panel><Eyebrow>Responsible disclosure</Eyebrow><p className="panel-copy">Please do not test this prototype with documents you do not own. No backend or security-reporting workflow is connected.</p></Panel></div></div></div>
}

function AuthView({ navigate, onToast }) {
  const [tab, setTab] = useState('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const signIn = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!supabase) {
      setError('Supabase is not configured. Set the frontend Supabase URL and publishable/anon key.')
      return
    }
    const form = new FormData(event.currentTarget)
    setBusy(true)
    let authError
    try {
      ({ error: authError } = await supabase.auth.signInWithPassword({
        email: String(form.get('email')),
        password: String(form.get('password')),
      }))
    } catch (signInError) {
      setBusy(false)
      setError(`Sign-in failed: ${signInError.message}`)
      return
    }
    setBusy(false)
    if (authError) {
      setError(authError.message)
      return
    }
    navigate('dashboard')
    onToast('Signed in securely with Supabase.')
  }

  const register = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!supabase) {
      setError('Supabase is not configured. Set the frontend environment variables before creating an account.')
      return
    }
    const form = new FormData(event.currentTarget)
    setBusy(true)
    let data
    let authError
    try {
      ({ data, error: authError } = await supabase.auth.signUp({
        email: String(form.get('email')),
        password: String(form.get('password')),
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: String(form.get('name')).trim(),
            phone: String(form.get('phone')).trim(),
          },
        },
      }))
    } catch (signupError) {
      setBusy(false)
      setError(`Account registration failed: ${signupError.message}`)
      return
    }
    setBusy(false)
    if (authError) {
      setError(authError.message)
      return
    }
    if (data.session) {
      navigate('dashboard')
      onToast('Account created. Your initial role is member.')
    } else {
      setMessage('Account created. Check your inbox and confirm your email before signing in.')
    }
  }

  const continueWithGoogle = async () => {
    setError('')
    setMessage('')
    if (!supabase) {
      setError('Supabase is not configured. Set the frontend environment variables before using Google sign-in.')
      return
    }

    setBusy(true)
    let authError
    try {
      ({ error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname },
      }))
    } catch (oauthError) {
      setBusy(false)
      setError(`Google sign-in failed: ${oauthError.message}`)
      return
    }
    if (authError) {
      setBusy(false)
      setError(`Google sign-in failed: ${authError.message}`)
    }
  }

  return <div className="wrap section page-view auth-view"><Panel className="auth-card">
    <div className="auth-tabs"><button type="button" className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); setError(''); setMessage('') }}>Sign in</button><button type="button" className={tab === 'register' ? 'active' : ''} onClick={() => { setTab('register'); setError(''); setMessage('') }}>Register</button></div>
    {tab === 'login' ? <form onSubmit={signIn}>
      <div className="form-row"><label className="field-label" htmlFor="loginEmail">User email ID</label><input className="input" id="loginEmail" name="email" type="email" autoComplete="email" required /></div>
      <div className="form-row"><label className="field-label" htmlFor="loginPassword">Password</label><input className="input" id="loginPassword" name="password" type="password" autoComplete="current-password" required /></div>
      <Button variant="primary" type="submit" className="full-width" disabled={busy}><Icon name="lock" />{busy ? 'Signing in…' : 'Sign in securely'}</Button>
      {googleAuthEnabled && <><div className="divider">OR</div><Button type="button" className="full-width" onClick={continueWithGoogle} disabled={busy}>Continue with Google</Button></>}
      <p className="form-hint">{supabaseConfigured ? 'Sign in uses Supabase Auth. Google sign-in requires the provider to be enabled in Supabase.' : 'Supabase is not configured; secure sign-in is unavailable.'}</p>
    </form> : <form onSubmit={register}>
      <div className="form-row"><label className="field-label" htmlFor="regName">Full name</label><input className="input" id="regName" name="name" autoComplete="name" maxLength={120} required /></div>
      <div className="form-row"><label className="field-label" htmlFor="regEmail">Email address</label><input className="input" id="regEmail" name="email" type="email" autoComplete="email" required /></div>
      <div className="form-row"><label className="field-label" htmlFor="regPhone">Phone number</label><input className="input" id="regPhone" name="phone" type="tel" autoComplete="tel" inputMode="tel" pattern="\\+[1-9][0-9]{7,14}" placeholder="+919876543210" title="Use international format, such as +919876543210." required /></div>
      <div className="form-row"><label className="field-label" htmlFor="regPassword">Password</label><input className="input" id="regPassword" name="password" type="password" autoComplete="new-password" minLength={10} required /></div>
      <Button variant="primary" type="submit" className="full-width" disabled={busy}>{busy ? 'Creating account…' : 'Create member account'}</Button>
      {googleAuthEnabled && <><div className="divider">OR</div><Button type="button" className="full-width" onClick={continueWithGoogle} disabled={busy}>Continue with Google</Button></>}
      <p className="form-hint">We’ll email you a confirmation link. Google users must add a phone number before continuing. Phone numbers are stored on your profile but are not OTP-verified. Aadhaar is not collected.</p>
      <p className="form-hint">New accounts receive the member role. An institution administrator must be provisioned by an operator.</p>
    </form>}
    {error && <div className="form-error" role="alert"><Icon name="alert" size={16} />{error}</div>}
    {message && <p className="form-success" role="status">{message}</p>}
  </Panel></div>
}

function CompleteProfileView({ onComplete }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const savePhone = async (event) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const phone = String(form.get('phone')).trim()
    setBusy(true)
    try {
      await apiRequest('/me/phone', {
        method: 'PATCH',
        body: JSON.stringify({ phone }),
      })
      onComplete(phone)
    } catch (saveError) {
      setError(`Unable to save your phone number: ${saveError.message}`)
    } finally {
      setBusy(false)
    }
  }

  return <div className="wrap section page-view auth-view"><Panel className="auth-card">
    <SectionHeading eyebrow="Complete your profile" title="Add a phone number">Use international format, including the country code. This number is stored on your profile and is not OTP-verified.</SectionHeading>
    <form onSubmit={savePhone}>
      <div className="form-row"><label className="field-label" htmlFor="profilePhone">Phone number</label><input className="input" id="profilePhone" name="phone" type="tel" autoComplete="tel" inputMode="tel" pattern="\\+[1-9][0-9]{7,14}" placeholder="+919876543210" title="Use international format, such as +919876543210." required /></div>
      <Button variant="primary" type="submit" className="full-width" disabled={busy}>{busy ? 'Saving…' : 'Save phone number'}</Button>
    </form>
    {error && <div className="form-error" role="alert"><Icon name="alert" size={16} />{error}</div>}
  </Panel></div>
}

function App() {
  const [view, setView] = useState(() => window.location.hash.replace('#', '') || 'home')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [apiStatus, setApiStatus] = useState('checking')
  const [apiRetry, setApiRetry] = useState(0)
  const [report, setReport] = useState(null)
  const [toast, setToast] = useState('')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const toastTimer = useRef(null)
  const authLoadId = useRef(0)

  const navigate = (next) => {
    setView(next)
    setMobileMenu(false)
    if (window.location.hash !== `#${next}`) window.history.replaceState(null, '', `#${next}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const notify = (message) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 3600)
  }

  useEffect(() => {
    let active = true
    const checkApi = async () => {
      try {
        const apiRoot = getApiBaseUrl().replace(/\/api\/?$/, '')
        const response = await fetch(`${apiRoot}/healthz`, { signal: AbortSignal.timeout(4000) })
        if (!response.ok) throw new Error(`Health check failed (${response.status}).`)
        if (active) setApiStatus('online')
      } catch {
        if (active) setApiStatus('offline')
      }
    }

    checkApi()
    const interval = window.setInterval(checkApi, 30_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [apiRetry])

  useEffect(() => {
    if (!supabase) return undefined
    const loadId = ++authLoadId.current
    supabase.auth.getSession().then(({ data, error }) => {
      if (authLoadId.current !== loadId) return
      if (error) notify(`Unable to restore the sign-in session: ${error.message}`)
      setSession(data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authLoadId.current += 1
      setSession(nextSession)
      setProfile(null)
      if (event === 'SIGNED_IN') {
        setView('dashboard')
        window.history.replaceState(null, '', '#dashboard')
      }
    })
    return () => {
      authLoadId.current += 1
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) return undefined
    const controller = new AbortController()
    apiRequest('/me', { signal: controller.signal }).then((currentProfile) => {
      if (!controller.signal.aborted) setProfile(currentProfile)
    }).catch((profileError) => {
      if (!controller.signal.aborted) notify(`Account profile unavailable: ${profileError.message}`)
    })
    return () => controller.abort()
  }, [session])

  const allowedViews = new Set(['home', 'screen', 'results', 'dashboard', 'transit', 'assistant', 'research', 'about', 'contact', 'auth', 'complete-profile'])
  const requestedView = allowedViews.has(view) ? view : 'home'
  const routeView = session && profile && !profile.phone
    ? 'complete-profile'
    : requestedView === 'complete-profile' && profile?.phone
      ? 'dashboard'
      : requestedView === 'dashboard' && !session
        ? 'auth'
        : requestedView

  useEffect(() => {
    if (routeView !== view) {
      window.history.replaceState(null, '', `#${routeView}`)
    }
  }, [routeView, view])

  useEffect(() => {
    const onHashChange = () => setView(window.location.hash.replace('#', '') || 'home')
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.clearTimeout(toastTimer.current)
      if (report?.previewUrl) URL.revokeObjectURL(report.previewUrl)
    }
  }, [report])

  const routes = {
    home: <HomeView navigate={navigate} />,
    screen: <ScreeningView navigate={navigate} onComplete={setReport} onToast={notify} session={session} />,
    results: <ResultsView report={report} navigate={navigate} onToast={notify} onDelete={() => setReport(null)} />,
    dashboard: <DashboardView navigate={navigate} profile={profile} />,
    transit: <TransitView navigate={navigate} session={session} />,
    assistant: <AssistantView onToast={notify} session={session} />,
    research: <ResearchView />,
    about: <AboutView />,
    contact: <ContactView onToast={notify} />,
    auth: <AuthView navigate={navigate} onToast={notify} />,
    'complete-profile': <CompleteProfileView onComplete={(phone) => {
      setProfile((currentProfile) => currentProfile ? { ...currentProfile, phone } : currentProfile)
      navigate('dashboard')
      notify('Phone number saved. It has not been OTP-verified.')
    }} />,
  }

  const signOut = async () => {
    if (!supabase) {
      setSession(null)
      setProfile(null)
      navigate('home')
      notify('No secure session is connected.')
      return
    }
    let error
    try {
      ({ error } = await supabase.auth.signOut())
    } catch (signOutError) {
      notify(`Sign out failed: ${signOutError.message}`)
      return
    }
    if (error) {
      notify(`Sign out failed: ${error.message}`)
      return
    }
    setView('home')
    notify('Signed out.')
  }

  const currentPage = routeView === 'results' ? 'screen' : routeView
  const currentPageLabel = [...navItems, ...informationNavItems].find(([key]) => key === currentPage)?.[1] || 'Account'
  const toggleSidebar = () => {
    if (window.matchMedia('(max-width: 860px)').matches) {
      setMobileMenu((open) => !open)
      return
    }
    setSidebarCollapsed((collapsed) => !collapsed)
  }

  return <div className="app-shell">
    <div className="ambient ambient-grid" aria-hidden="true" /><div className="ambient ambient-glow" aria-hidden="true" />
    <header className="site-header">
      <div className="nav-inner">
        <button className="sidebar-toggle" type="button" aria-label={mobileMenu ? 'Close navigation' : 'Toggle sidebar'} aria-expanded={window.matchMedia('(max-width: 860px)').matches ? mobileMenu : !sidebarCollapsed} onClick={toggleSidebar}>
          <Icon name={mobileMenu ? 'close' : 'menu'} />
        </button>
        <Brand onClick={() => navigate('home')} />
        <div className="header-page-label"><span>WORKSPACE</span><strong>{currentPageLabel}</strong></div>
        <div className="nav-actions">
          {session && <span className="account-role text-xs">{profile?.role?.replace('_', ' ') || 'signed in'}</span>}
          {session
            ? <Button onClick={signOut}>Sign out</Button>
            : <Button onClick={() => navigate('auth')}>Sign in</Button>}
          <Button variant="primary" onClick={() => navigate('screen')}><Icon name="scan" size={16} /> New screening</Button>
        </div>
      </div>
    </header>
    <div className={`workspace-layout ${sidebarCollapsed ? 'is-collapsed' : ''} ${mobileMenu ? 'mobile-open' : ''}`}>
      {mobileMenu && <button className="sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
      <aside className="app-sidebar" aria-label="Workspace sidebar">
        <nav className="sidebar-navigation" aria-label="Workspace navigation">
          <span className="sidebar-group-label">WORKSPACE</span>
          {navItems.map(([key, label, icon]) => {
            const active = currentPage === key
            return <button type="button" key={key} className={`sidebar-link ${active ? 'active' : ''}`} title={sidebarCollapsed ? label : undefined} aria-current={active ? 'page' : undefined} onClick={() => navigate(key)}>
              <Icon name={icon} size={18} /><span>{label}</span>
            </button>
          })}
          <span className="sidebar-group-label sidebar-secondary-label">INFORMATION</span>
          {informationNavItems.map(([key, label, icon]) => {
            const active = currentPage === key
            return <button type="button" key={key} className={`sidebar-link ${active ? 'active' : ''}`} title={sidebarCollapsed ? label : undefined} aria-current={active ? 'page' : undefined} onClick={() => navigate(key)}>
              <Icon name={icon} size={18} /><span>{label}</span>
            </button>
          })}
        </nav>
        <div className="sidebar-bottom">
          <button className="sidebar-quick-action" type="button" onClick={() => navigate('screen')}><Icon name="plus" size={16} /><span>Start a new screening</span></button>
          <div className={`api-health ${apiStatus}`}>
            <span className="health-dot" />
            <span className="api-health-copy" role="status" aria-live="polite"><strong>Express API</strong><small>{apiStatus === 'checking' ? 'Checking connection' : apiStatus === 'online' ? 'Connected' : 'Unavailable'}</small></span>
            <button type="button" aria-label="Retry API connection check" title="Retry connection check" onClick={() => { setApiStatus('checking'); setApiRetry((attempt) => attempt + 1) }}><Icon name="refresh" size={15} /></button>
          </div>
          <div className="sidebar-account">
            <span className="account-avatar">{session?.user?.email?.[0]?.toUpperCase() || 'G'}</span>
            <span className="sidebar-account-copy"><strong>{session?.user?.email || 'Guest session'}</strong><small>{profile?.role?.replace('_', ' ') || (session ? 'Member account' : 'Local demo')}</small></span>
          </div>
        </div>
      </aside>
      <div className="workspace-content">
        <main id="main-content">{routes[routeView] || routes.home}</main>
        <footer className="site-footer"><div className="wrap"><div className="footer-grid"><div className="footer-about"><Brand onClick={() => navigate('home')} /><p>Identity document screening with evidence and clear limitations.</p></div><div><h4>Screening</h4><button onClick={() => navigate('screen')}>Start a screening</button><button onClick={() => navigate('dashboard')}>Account</button><button onClick={() => navigate('assistant')}>AI assistant</button><button onClick={() => navigate('auth')}>{session ? 'Account sign-in' : 'Sign in'}</button></div><div><h4>Learn</h4><button onClick={() => navigate('research')}>Research notes</button><button onClick={() => navigate('about')}>About IDShield</button><button onClick={() => navigate('contact')}>Contact</button></div><div><h4>Important</h4><p>Reports are triage aids only. Verify documents with the authorized issuer.</p></div></div><div className="footer-bottom"><span>© 2026 IDShield AI</span><span>Automated screening · human review required</span></div></div></footer>
      </div>
    </div>
    {toast && <div className="toast" role="status"><Icon name="check" size={17} />{toast}</div>}
  </div>
}

export default App
