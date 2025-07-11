import React, { useState, useRef, useEffect } from 'react'
import LiveTranscript from '../components/LiveTranscript'
import ScamScore from '../components/ScamScore'
import SuggestedReply from '../components/SuggestedReply'
import MicToggleButton from '../components/MicToggleButton'

const Home = () => {
    const [isListening, setIsListening] = useState(false)
    const [isClassifying, setIsClassifying] = useState(false)
    const [fullConversation, setFullConversation] = useState('')
    const [scamProbability, setScamProbability] = useState(0)
    const [nonScamProbability, setNonScamProbability] = useState(0)
    const [suggestedReply, setSuggestedReply] = useState('')

    const isReceiverTurn = useRef(true)
    const [showWakeNotice, setShowWakeNotice] = useState(true)
    const [fadeIn, setFadeIn] = useState(false)



    const recognitionRef = useRef(null)
    const recognitionReadyRef = useRef(false)

    useEffect(() => {
        // Initialize speech recognition
        if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            recognitionRef.current = new SpeechRecognition()

            recognitionRef.current.continuous = true
            recognitionRef.current.interimResults = false

            recognitionRef.current.onstart = () => {
                console.log('Speech recognition started.')
                setIsListening(true)
            }

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error)
                setIsListening(false)
            }

            recognitionRef.current.onend = () => {
                console.log('Speech recognition stopped.')
                setIsListening(false)
            }

            recognitionRef.current.onresult = async (event) => {
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        const text = event.results[i][0].transcript.trim()
                        console.log("STT output :", text)
                        const label = isReceiverTurn.current ? 'Receiver' : 'Caller'
                        const labeledLine = `${label}: ${text}`

                        console.log('[🧾 LABELED LINE]', labeledLine);


                        setFullConversation(prev => {
                            const updated = prev + labeledLine + '\n'

                            const turnCount = updated.trim().split('\n').length
                            if (turnCount % 2 == 0 && turnCount != 0) {
                                classifyConversation(updated) // already has correct labels
                            }
                            return updated
                        })

                        isReceiverTurn.current = !isReceiverTurn.current

                    }
                }
            }


            // Wait before allowing recognition
            setTimeout(() => {
                recognitionReadyRef.current = true
                console.log('Speech recognition engine ready.')
            }, 1000)
        }
    }, [fullConversation])

    useEffect(() => {
        const showTimer = setTimeout(() => {
            setShowWakeNotice(true)
            setFadeIn(true)
        }, 4000) // 4s delay

        const hideTimer = setTimeout(() => {
            setFadeIn(false)
            setTimeout(() => setShowWakeNotice(false), 500) // wait for fade-out to finish
        }, 14000) // 4s delay + 10s show

        return () => {
            clearTimeout(showTimer)
            clearTimeout(hideTimer)
        }
    }, [])


    const classifyConversation = async (conversation) => {
        try {
            console.log('[CLASSIFYING]', conversation);
            const response = await fetch('https://sevak-ugba.onrender.com/classify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ conversation })

            })

            const data = await response.json()
            console.log('[BACKEND RESPONSE]', data);


            if (data.scam_probability !== undefined) {
                setScamProbability(data.scam_probability)
                setNonScamProbability(data.non_scam_probability)
            }

            if (data.suggested_reply) {
                setSuggestedReply(data.suggested_reply)
            }
        } catch (error) {
            console.error('Classification error:', error)
        } finally {
            setIsClassifying(false)
        }
    }

    const toggleListening = () => {
        if (!recognitionReadyRef.current) {
            console.warn('Speech recognition engine not ready yet. Please wait a moment.')
            return
        }

        if (!isListening) {
            try {
                recognitionRef.current.start()
            } catch (err) {
                console.error('Recognition start failed:', err)
            }
        } else {
            recognitionRef.current.onend = () => {
                console.log('Speech recognition stopped.')
                recognitionRef.current.stop()
                setIsListening(false)

                // Safe cleanup now
                setFullConversation('')
                setScamProbability(0)
                setNonScamProbability(0)
                setSuggestedReply('')
                isReceiverTurn.current = true

            }

        }
    }

    return (
        <>
            {showWakeNotice && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-50 border border-black text-blue-800 px-4 py-3 rounded-lg shadow-md transition-all duration-500 z-50 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex items-center justify-between space-x-4">
                        <span className="text-sm font-medium">
                            &nbsp; This app runs on a free backend (Render). If it’s not working, wait 1–3 mins for it to wake up. &nbsp;
                        </span>
                        <button
                            onClick={() => {
                                setFadeIn(false)
                                setTimeout(() => setShowWakeNotice(false), 500)
                            }}
                            className="text-black hover:text-red-600 transition-colors"
                        >
                            × &nbsp;
                        </button>
                    </div>
                </div>
            )}

            <div className="min-h-screen flex items-center justify-center p-8">
                <div className="flex items-center lg:gap-12 gap-6">
                    {/* Scam Score Bar - Left Side */}
                    <ScamScore
                        scamProbability={scamProbability}
                        nonScamProbability={nonScamProbability}
                    />

                    {/* Phone Container - Center */}
                    <div className="relative">
                        {/* Phone Frame */}
                        <div className="lg:w-80 lg:h-[600px] w-50 h-[400px] bg-black rounded-[1rem] p-1 shadow-2xl relative border-4 border-black">
                            {/* Screen */}
                            <div className="w-full h-full bg-white rounded-[1rem] flex flex-col overflow-hidden px-4 py-3 space-y-2">
                                {/* Status Bar */}
                                <div className="h-8 w-[97%] bg-gray-50 flex items-center justify-between px-6 text-xs text-gray-600">
                                    <span>&nbsp; 9:41</span>
                                    <div className="flex gap-1">
                                        <div className="w-4 h-2 bg-green-500 rounded-sm"></div>
                                        <div className="w-4 h-2 bg-gray-300 rounded-sm"></div>
                                        <div className="w-4 h-2 bg-gray-300 rounded-sm"></div>
                                    </div>
                                </div>

                                {/* Transcript Area - 80% */}
                                <div className="flex-1 overflow-hidden">
                                    <div className="h-full overflow-y-auto">
                                        <LiveTranscript
                                            conversation={fullConversation}
                                            isListening={isListening}
                                        />
                                    </div>
                                </div>

                                {/* Call Button Area - 20% */}
                                <div className="h-24 flex items-center justify-center bg-gray-100 shrink-0">
                                    <MicToggleButton
                                        isListening={isListening}
                                        onToggle={toggleListening}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Suggested Reply Bubble - Floating from phone */}
                        {suggestedReply && (
                            <SuggestedReply reply={suggestedReply} />
                        )}
                    </div>
                </div>
            </div>
        </>)
}

export default Home