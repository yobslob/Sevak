import React, { useState, useEffect } from 'react'

const SuggestedReply = ({ reply }) => {
    const [isVisible, setIsVisible] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)

    useEffect(() => {
        if (reply && reply.trim() && !reply.includes('No Reply needed')) {
            setIsVisible(true)
            setIsAnimating(true)

            // Auto-hide after 8 seconds
            const timer = setTimeout(() => {
                setIsAnimating(false)
                setTimeout(() => setIsVisible(false), 300)
            }, 8000)

            return () => clearTimeout(timer)
        } else {
            setIsAnimating(false)
            setTimeout(() => setIsVisible(false), 300)
        }
    }, [reply])

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(reply)
            // Could add a toast notification here
        } catch (err) {
            console.error('Failed to copy text: ', err)
        }
    }

    const handleDismiss = () => {
        setIsAnimating(false)
        setTimeout(() => setIsVisible(false), 300)
    }

    if (!isVisible || !reply || reply.includes('No Reply needed')) return null

    return (
        <div className={`absolute -top-32 -right-8 transition-all duration-300 transform ${isAnimating ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'
            }`}>
            {/* Floating bubble */}
            <div className="relative max-w-xs">
                {/* Main bubble */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 p-4 relative">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-semibold text-gray-700">AI Suggestion</span>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Reply text */}
                    <p className="text-sm text-gray-800 leading-relaxed mb-3 font-medium">
                        {reply}
                    </p>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex-1 bg-blue-500 text-white text-xs py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-1"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="px-3 py-2 text-xs text-gray-600 hover:text-gray-800 transition-colors font-medium"
                        >
                            Dismiss
                        </button>
                    </div>

                    {/* Tail pointer */}
                    <div className="absolute bottom-0 left-8 transform translate-y-full">
                        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white/95"></div>
                    </div>
                </div>

                {/* Glow effect */}
                <div className="absolute inset-0 bg-blue-400/20 rounded-2xl blur-xl opacity-50 animate-float"></div>
            </div>
        </div>
    )
}

export default SuggestedReply
