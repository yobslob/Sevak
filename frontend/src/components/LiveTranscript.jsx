import React, { useEffect, useRef } from 'react'

const LiveTranscript = ({ conversation, isListening }) => {
    const transcriptRef = useRef(null)

    useEffect(() => {
        // Auto-scroll to bottom when new messages arrive
        if (transcriptRef.current) {
            transcriptRef.current.scrollTo({
                top: transcriptRef.current.scrollHeight,
                behavior: 'smooth'
            })

        }
    }, [conversation])

    const formatConversation = (text) => {
        if (!text) return []

        return text
            .split('\n')
            .filter(line => line.trim())
            .map((line, index) => {
                const isReceiver = line.startsWith('Receiver:')
                const cleanText = line.replace(/^(Receiver:|Caller:)\s*/, '')


                return {
                    id: `${index}-${cleanText}`, // ✅ stable, avoids re-renders
                    text: cleanText,
                    isReceiver,
                    timestamp: new Date().toLocaleTimeString('en-US', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                }
            })
    }


    const messages = formatConversation(conversation)

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="text-center py-2 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Live Call</h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    <span className="text-xs text-gray-600">
                        {isListening ? 'Listening...' : 'Not listening'}
                    </span>
                </div>
            </div>

            {/* Messages Container */}
            <div
                ref={transcriptRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin scrollbar-thumb-gray-400"
            >

                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.25a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                                </svg>
                            </div>
                            <p className="text-sm">Start listening to begin transcription</p>
                        </div>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.isReceiver ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] p-10 mb-8 rounded-xl text-xs ${message.isReceiver
                                    ? 'bg-blue-500 text-white rounded-br-sm'
                                    : 'bg-gray-200 text-gray-800 rounded-bl-sm'
                                    }`}
                            >
                                <p className="break-words">&nbsp; {message.text} &nbsp;</p>
                                <p className={`text-xs mt-1 ${message.isReceiver ? 'text-blue-100' : 'text-gray-500'
                                    }`}>
                                    &nbsp;{message.timestamp} &nbsp;
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Typing indicator when listening */}
            {isListening && (
                <div className="px-2 py-1">
                    <div className="flex justify-start">
                        <div className="bg-gray-200 rounded-2xl px-3 py-2 rounded-bl-sm">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default LiveTranscript