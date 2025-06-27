import React, { useState } from 'react'

const MicToggleButton = ({ isListening, onToggle }) => {
    const [isPressed, setIsPressed] = useState(false)

    const handlePress = () => {
        setIsPressed(true)
        setTimeout(() => setIsPressed(false), 150)
        onToggle()
    }

    return (
        <div className="flex flex-col items-center gap-2">
            {/* Call status */}
            <div className="text-xs text-gray-600 font-medium">
                {isListening ? 'Call Active' : 'Tap to Start Call'}
            </div>

            {/* Main call button */}
            <button
                onClick={handlePress}
                className={`relative w-15 h-15 rounded-full transition-all duration-200 transform ${isPressed ? 'scale-95' : 'scale-100'
                    } ${isListening
                        ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                        : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30'
                    }`}
            >
                {/* Button content */}
                <div className="flex items-center justify-center w-full h-full">
                    {isListening ? (
                        // End call icon
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.7l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                        </svg>
                    ) : (
                        // Start call icon
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
                        </svg>
                    )}
                </div>

                {/* Pulse animation when listening */}
                {isListening && (
                    <>
                        <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30"></div>
                        <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-20"></div>
                    </>
                )}
            </button>

            {/* Call duration timer */}
            {isListening && <CallTimer />}
        </div>
    )
}

// Simple call timer component
const CallTimer = () => {
    const [seconds, setSeconds] = React.useState(0)

    React.useEffect(() => {
        const interval = setInterval(() => {
            setSeconds(s => s + 1)
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    const formatTime = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60)
        const secs = totalSeconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
            {formatTime(seconds)}
        </div>
    )
}

export default MicToggleButton