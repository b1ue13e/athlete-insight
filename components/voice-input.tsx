"use client"

import { useState, useRef, useCallback } from "react"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// ============ Web Speech API 类型定义 ============

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

// ============ 语音解析结果 ============

export interface ParsedGameEvent {
  player?: string
  action: "serve" | "attack" | "block" | "reception" | "dig"
  result: "success" | "error" | "neutral"
  position?: string
  context?: string
  raw: string
}

interface VoiceInputProps {
  onResult: (events: ParsedGameEvent[]) => void
  onTranscript?: (transcript: string) => void
  className?: string
}

// ============ 组件 ============

export function VoiceInput({ onResult, onTranscript, className }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const parseTranscript = useCallback((text: string): ParsedGameEvent[] => {
    const events: ParsedGameEvent[] = []
    const sentences = text.split(/[。，！？\n]/).filter(s => s.trim().length > 0)

    for (const sentence of sentences) {
      const event = parseSentence(sentence.trim())
      if (event) {
        events.push(event)
      }
    }

    return events
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      alert("您的浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "zh-CN"
    recognition.maxAlternatives = 1

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ""
      let interimTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      const currentTranscript = finalTranscript || interimTranscript
      setTranscript(currentTranscript)
      onTranscript?.(currentTranscript)
    }

    recognition.onerror = (event: { error: string }) => {
      console.error("Speech recognition error:", event.error)
      if (event.error === "not-allowed") {
        alert("请允许使用麦克风权限")
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
    setTranscript("")
  }, [onTranscript])

  const stopListening = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
    setIsProcessing(true)

    // 解析语音内容
    const events = parseTranscript(transcript)
    onResult(events)
    
    setIsProcessing(false)
  }, [transcript, parseTranscript, onResult])

  const handleToggle = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  return (
    <div className={cn("space-y-4", className)}>
      {/* 语音按钮 */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={isProcessing}
        className={cn(
          "w-full py-6 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3",
          isListening
            ? "bg-red-500/20 text-red-400 border-2 border-red-500/50 animate-pulse"
            : "bg-[var(--accent)]/10 text-[var(--accent)] border-2 border-[var(--accent)]/30 hover:bg-[var(--accent)]/20",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>解析中...</span>
          </>
        ) : isListening ? (
          <>
            <MicOff className="w-6 h-6" />
            <span>点击结束录入</span>
          </>
        ) : (
          <>
            <Mic className="w-6 h-6" />
            <span>长按语音录入</span>
          </>
        )}
      </button>

      {/* 实时转写显示 */}
      {(isListening || transcript) && (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 min-h-[100px]">
          <div className="text-xs text-[var(--text-muted)] mb-2">
            {isListening ? "正在聆听..." : "识别结果"}
          </div>
          <div className="text-[var(--text-primary)] whitespace-pre-wrap">
            {transcript || "请开始说话..."}
          </div>
          {isListening && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-[var(--accent)] rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 20 + 8}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-[var(--text-muted)]">听取中</span>
            </div>
          )}
        </div>
      )}

      {/* 使用提示 */}
      <div className="text-xs text-[var(--text-muted)] space-y-1">
        <p>💡 试试这样说：</p>
        <ul className="list-disc list-inside pl-2 space-y-0.5">
          <li>"主攻手张三，四号位重扣得分，二传给得到位"</li>
          <li>"发球失误一个，跳发下网"</li>
          <li>"拦网得分，单人拦住对方接应"</li>
          <li>"一传到位，直接组织快攻"</li>
        </ul>
      </div>
    </div>
  )
}

// ============ NLP 解析逻辑 ============

function parseSentence(sentence: string): ParsedGameEvent | null {
  const lower = sentence.toLowerCase()

  // 提取球员名 (假设在开头)
  const playerMatch = sentence.match(/^([\u4e00-\u9fa5]{2,4})/)
  const player = playerMatch ? playerMatch[1] : undefined

  // 动作识别
  let action: ParsedGameEvent["action"] | null = null
  if (lower.includes("发球")) action = "serve"
  else if (lower.includes("扣") || lower.includes("攻") || lower.includes("打")) action = "attack"
  else if (lower.includes("拦")) action = "block"
  else if (lower.includes("接") || lower.includes("一传")) action = "reception"
  else if (lower.includes("防") || lower.includes("救")) action = "dig"

  if (!action) return null

  // 结果识别
  let result: ParsedGameEvent["result"] = "neutral"
  if (lower.includes("得分") || lower.includes("ace") || lower.includes("成功")) {
    result = "success"
  } else if (lower.includes("失误") || lower.includes("下网") || lower.includes("出界")) {
    result = "error"
  }

  // 位置识别
  let position: string | undefined
  if (lower.includes("四号位") || lower.includes("4号位")) position = "4"
  else if (lower.includes("三号位") || lower.includes("3号位")) position = "3"
  else if (lower.includes("二号位") || lower.includes("2号位")) position = "2"
  else if (lower.includes("后排")) position = "back"

  // 上下文提取
  const contextPatterns = [
    { pattern: /给得[到好]位/, value: "一攻到位" },
    { pattern: /调整/, value: "调整攻" },
    { pattern: /乱球/, value: "乱球" },
    { pattern: /探头/, value: "探头" },
    { pattern: /三人拦网/, value: "三人拦网" },
    { pattern: /双人/, value: "双人拦网" },
  ]

  let context: string | undefined
  for (const { pattern, value } of contextPatterns) {
    if (pattern.test(sentence)) {
      context = value
      break
    }
  }

  return {
    player,
    action,
    result,
    position,
    context,
    raw: sentence,
  }
}

// ============ 批量语音录入组件 ============

interface VoiceBatchInputProps {
  onComplete: (data: {
    events: ParsedGameEvent[]
    summary: {
      attacks: { kills: number; errors: number; total: number }
      serves: { aces: number; errors: number; total: number }
      blocks: { points: number; total: number }
    }
  }) => void
  className?: string
}

export function VoiceBatchInput({ onComplete, className }: VoiceBatchInputProps) {
  const [events, setEvents] = useState<ParsedGameEvent[]>([])

  const handleVoiceResult = useCallback((newEvents: ParsedGameEvent[]) => {
    setEvents(prev => [...prev, ...newEvents])
  }, [])

  const handleComplete = useCallback(() => {
    // 统计汇总
    const attacks = { kills: 0, errors: 0, total: 0 }
    const serves = { aces: 0, errors: 0, total: 0 }
    const blocks = { points: 0, total: 0 }

    events.forEach(e => {
      if (e.action === "attack") {
        attacks.total++
        if (e.result === "success") attacks.kills++
        if (e.result === "error") attacks.errors++
      } else if (e.action === "serve") {
        serves.total++
        if (e.result === "success") serves.aces++
        if (e.result === "error") serves.errors++
      } else if (e.action === "block") {
        blocks.total++
        if (e.result === "success") blocks.points++
      }
    })

    onComplete({ events, summary: { attacks, serves, blocks } })
  }, [events, onComplete])

  return (
    <div className={cn("space-y-4", className)}>
      <VoiceInput onResult={handleVoiceResult} />
      
      {/* 已录入事件列表 */}
      {events.length > 0 && (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">已录入事件</span>
            <span className="text-xs text-[var(--text-muted)]">{events.length} 条</span>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {events.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm p-2 rounded bg-[var(--bg-primary)]/50"
              >
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  e.result === "success" ? "bg-green-500" :
                  e.result === "error" ? "bg-red-500" : "bg-gray-500"
                )} />
                <span className="text-[var(--text-secondary)]">{e.action}</span>
                {e.player && <span className="text-[var(--text-primary)]">{e.player}</span>}
                {e.position && <span className="text-xs text-[var(--text-muted)]">{e.position}号位</span>}
                {e.context && <span className="text-xs text-[var(--accent)]">{e.context}</span>}
              </div>
            ))}
          </div>
          <button
            onClick={handleComplete}
            className="w-full mt-3 py-2 bg-[var(--accent)] text-[var(--bg-primary)] rounded-lg font-medium text-sm"
          >
            完成录入
          </button>
        </div>
      )}
    </div>
  )
}
