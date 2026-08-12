'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

// ============================================
// ImageCropper — modal บังคับ crop รูปภาพตามอัตราส่วนที่กำหนด
// เขียนด้วย Canvas API ล้วน ไม่มี dependency ภายนอก
// ============================================

type Box = { x: number; y: number; w: number; h: number } // พื้นที่ crop บน "จอ" (screen space, พิกัดใน canvas แสดงผล)

const HANDLE_SIZE = 14 // ขนาดจุดจับมุมสำหรับ resize (px บนจอ)
const MIN_BOX = 40 // ขนาดพื้นที่ crop เล็กสุดที่ยอมให้ (px บนจอ)

export default function ImageCropper({
  file, aspectRatio, outputWidth, outputHeight, title, onCancel, onConfirm,
}: {
  file: File
  aspectRatio: number // width / height เช่น 2 สำหรับ 2:1, 1 สำหรับ 1:1
  outputWidth: number // ขนาดไฟล์ผลลัพธ์ที่ต้องการ (px จริง) เช่น 1200
  outputHeight: number // เช่น 600
  title: string
  onCancel: () => void
  onConfirm: (croppedFile: File) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [imgLoaded, setImgLoaded] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 }) // ขนาด canvas ที่แสดงบนจอ
  const [imgDisplay, setImgDisplay] = useState({ x: 0, y: 0, w: 0, h: 0 }) // ตำแหน่ง/ขนาดรูปที่ scale ลงมาแสดงในกรอบ
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 0, h: 0 })

  // drag state
  const dragRef = useRef<{
    mode: 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | null
    startX: number
    startY: number
    startBox: Box
  } | null>(null)

  // โหลดรูปภาพจากไฟล์
  useEffect(() => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setImgLoaded(true)
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // คำนวณขนาด canvas + ตำแหน่งรูปที่แสดง + กรอบ crop เริ่มต้น (กึ่งกลาง เต็มพื้นที่เท่าที่ทำได้)
  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !containerRef.current) return
    const img = imgRef.current
    const containerW = Math.min(containerRef.current.clientWidth, 600)
    const containerH = 420

    // สเกลรูปให้พอดีกรอบแสดงผล (contain)
    const scale = Math.min(containerW / img.width, containerH / img.height)
    const dispW = img.width * scale
    const dispH = img.height * scale
    const dispX = (containerW - dispW) / 2
    const dispY = (containerH - dispH) / 2

    setCanvasSize({ w: containerW, h: containerH })
    setImgDisplay({ x: dispX, y: dispY, w: dispW, h: dispH })

    // กรอบ crop เริ่มต้น: ใหญ่สุดเท่าที่พอดีในรูป ตามอัตราส่วนที่กำหนด กึ่งกลางรูป
    let boxW = dispW
    let boxH = boxW / aspectRatio
    if (boxH > dispH) {
      boxH = dispH
      boxW = boxH * aspectRatio
    }
    const boxX = dispX + (dispW - boxW) / 2
    const boxY = dispY + (dispH - boxH) / 2
    setBox({ x: boxX, y: boxY, w: boxW, h: boxH })
  }, [imgLoaded, aspectRatio])

  // วาดภาพ + overlay มืด + กรอบ crop
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !imgLoaded) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvasSize.w
    canvas.height = canvasSize.h

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // วาดรูปเต็ม (สลัวไว้ก่อน)
    ctx.drawImage(img, imgDisplay.x, imgDisplay.y, imgDisplay.w, imgDisplay.h)

    // overlay มืดครอบทั้งหมด ยกเว้นส่วนที่เป็นกรอบ crop
    ctx.save()
    ctx.fillStyle = 'rgba(15,23,42,0.6)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.clearRect(box.x, box.y, box.w, box.h)
    // วาดรูปส่วนที่อยู่ในกรอบ crop ให้ชัดเจน (ไม่มืด)
    ctx.save()
    ctx.beginPath()
    ctx.rect(box.x, box.y, box.w, box.h)
    ctx.clip()
    ctx.drawImage(img, imgDisplay.x, imgDisplay.y, imgDisplay.w, imgDisplay.h)
    ctx.restore()
    ctx.restore()

    // เส้นกรอบ
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 2
    ctx.strokeRect(box.x, box.y, box.w, box.h)

    // เส้น grid สามส่วน (rule of thirds)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    for (let i = 1; i <= 2; i++) {
      const gx = box.x + (box.w / 3) * i
      ctx.beginPath(); ctx.moveTo(gx, box.y); ctx.lineTo(gx, box.y + box.h); ctx.stroke()
      const gy = box.y + (box.h / 3) * i
      ctx.beginPath(); ctx.moveTo(box.x, gy); ctx.lineTo(box.x + box.w, gy); ctx.stroke()
    }

    // จุดจับมุมทั้ง 4
    ctx.fillStyle = '#2563eb'
    const corners = [
      [box.x, box.y], [box.x + box.w, box.y],
      [box.x, box.y + box.h], [box.x + box.w, box.y + box.h],
    ]
    for (const [cx, cy] of corners) {
      ctx.beginPath()
      ctx.arc(cx, cy, HANDLE_SIZE / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }, [imgLoaded, canvasSize, imgDisplay, box])

  useEffect(() => { draw() }, [draw])

  function getHandleAt(x: number, y: number): 'nw' | 'ne' | 'sw' | 'se' | null {
    const r = HANDLE_SIZE
    if (Math.abs(x - box.x) < r && Math.abs(y - box.y) < r) return 'nw'
    if (Math.abs(x - (box.x + box.w)) < r && Math.abs(y - box.y) < r) return 'ne'
    if (Math.abs(x - box.x) < r && Math.abs(y - (box.y + box.h)) < r) return 'sw'
    if (Math.abs(x - (box.x + box.w)) < r && Math.abs(y - (box.y + box.h)) < r) return 'se'
    return null
  }

  function getPointerPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function handlePointerDown(e: React.MouseEvent | React.TouchEvent) {
    const { x, y } = getPointerPos(e)
    const handle = getHandleAt(x, y)
    if (handle) {
      dragRef.current = { mode: `resize-${handle}` as any, startX: x, startY: y, startBox: { ...box } }
    } else if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
      dragRef.current = { mode: 'move', startX: x, startY: y, startBox: { ...box } }
    } else {
      dragRef.current = null
    }
  }

  function clampBoxToImage(b: Box): Box {
    let { x, y, w, h } = b
    // จำกัดไม่ให้เล็กกว่าขั้นต่ำ
    w = Math.max(w, MIN_BOX)
    h = w / aspectRatio
    // จำกัดไม่ให้ใหญ่กว่ารูปที่แสดง
    if (w > imgDisplay.w) { w = imgDisplay.w; h = w / aspectRatio }
    if (h > imgDisplay.h) { h = imgDisplay.h; w = h * aspectRatio }
    // จำกัดตำแหน่งไม่ให้หลุดขอบรูป
    x = Math.max(imgDisplay.x, Math.min(x, imgDisplay.x + imgDisplay.w - w))
    y = Math.max(imgDisplay.y, Math.min(y, imgDisplay.y + imgDisplay.h - h))
    return { x, y, w, h }
  }

  function handlePointerMove(e: React.MouseEvent | React.TouchEvent) {
    if (!dragRef.current) return
    e.preventDefault()
    const { x, y } = getPointerPos(e)
    const { mode, startX, startY, startBox } = dragRef.current
    const dx = x - startX
    const dy = y - startY

    if (mode === 'move') {
      setBox(clampBoxToImage({ ...startBox, x: startBox.x + dx, y: startBox.y + dy }))
      return
    }

    // resize: ใช้ค่า dx เป็นหลัก คำนวณ w ใหม่ตามทิศทางมุมที่ลาก แล้วคง aspect ratio
    let newW = startBox.w
    let newX = startBox.x
    let newY = startBox.y

    if (mode === 'resize-se') {
      newW = startBox.w + dx
    } else if (mode === 'resize-sw') {
      newW = startBox.w - dx
      newX = startBox.x + dx
    } else if (mode === 'resize-ne') {
      newW = startBox.w + dx
    } else if (mode === 'resize-nw') {
      newW = startBox.w - dx
      newX = startBox.x + dx
    }
    newW = Math.max(newW, MIN_BOX)
    const newH = newW / aspectRatio

    // ปรับ y ตามว่ามุมบนหรือล่างถูกลาก (คงมุมตรงข้ามให้อยู่กับที่)
    if (mode === 'resize-nw' || mode === 'resize-ne') {
      newY = startBox.y + startBox.h - newH
    }

    setBox(clampBoxToImage({ x: newX, y: newY, w: newW, h: newH }))
  }

  function handlePointerUp() {
    dragRef.current = null
  }

  function handleConfirm() {
    const img = imgRef.current
    if (!img) return

    // แปลงพิกัดกรอบ crop จาก "จอ" กลับเป็นพิกัดจริงของรูปต้นฉบับ
    const scale = img.width / imgDisplay.w // px จริง ต่อ px จอ
    const srcX = (box.x - imgDisplay.x) * scale
    const srcY = (box.y - imgDisplay.y) * scale
    const srcW = box.w * scale
    const srcH = box.h * scale

    // วาดลง canvas ผลลัพธ์ตามขนาดที่กำหนด (เช่น 1200x600)
    const outCanvas = document.createElement('canvas')
    outCanvas.width = outputWidth
    outCanvas.height = outputHeight
    const ctx = outCanvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputWidth, outputHeight)

    outCanvas.toBlob(blob => {
      if (!blob) return
      const croppedFile = new File([blob], file.name, { type: 'image/jpeg' })
      onConfirm(croppedFile)
    }, 'image/jpeg', 0.92)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 660,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px 0 20px' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>ปรับตำแหน่งรูปภาพ — {title}</h3>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
            ลากเพื่อย้ายตำแหน่ง หรือดึงมุมเพื่อปรับขนาด (คงอัตราส่วนอัตโนมัติ)
          </p>
        </div>

        <div ref={containerRef} style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
          {!imgLoaded ? (
            <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
              กำลังโหลดรูปภาพ…
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              style={{ borderRadius: 8, touchAction: 'none', cursor: 'move', maxWidth: '100%' }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
          )}
        </div>

        <div style={{
          padding: '12px 20px', borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>ยกเลิก</button>
          <button type="button" className="btn btn-sm" disabled={!imgLoaded} onClick={handleConfirm}>
            ใช้รูปนี้
          </button>
        </div>
      </div>
    </div>
  )
}
