import React from 'react'

const ScamScore = ({ scamProbability, nonScamProbability }) => {
    const scamPercentage = Math.round(scamProbability * 100)
    const nonScamPercentage = Math.round(nonScamProbability * 100)

    const getRiskLevel = (prob) => {
        if (prob < 0.3) return { level: 'LOW', color: 'text-green-600', bgColor: 'bg-green-500' }
        if (prob < 0.6) return { level: 'MEDIUM', color: 'text-yellow-600', bgColor: 'bg-yellow-500' }
        return { level: 'HIGH', color: 'text-red-600', bgColor: 'bg-red-500' }
    }

    const risk = getRiskLevel(scamProbability)

    return (
        <div className="w-23 h-90 bg-white/10 backdrop-blur-md rounded-xl p-4 flex flex-col items-center justify-between shadow-lg border border-white/20">
            {/* Title */}
            <div className="text-center">
                <h3 className="text-white text-sm font-bold mb-1">SCAM</h3>
                <h4 className="text-white text-xs opacity-75">DETECTOR</h4>
            </div>

            {/* Vertical Progress Bar */}
            <div className="relative w-6 h-48 bg-gray-700/50 rounded-full overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-green-400 via-yellow-400 to-red-400 opacity-30"></div>

                {/* Progress fill */}
                <div
                    className={`absolute bottom-0 w-full transition-all duration-500 ease-out ${risk.bgColor}`}
                    style={{ height: `${scamPercentage}%` }}
                ></div>

                {/* Animated glow effect */}
                {scamProbability > 0 && (
                    <div
                        className={`absolute w-full h-4 ${risk.bgColor} opacity-60 blur-sm transition-all duration-500`}
                        style={{ bottom: `${Math.max(0, scamPercentage - 8)}%` }}
                    ></div>
                )}
            </div>

            {/* Risk Level & Percentage */}
            <div className="text-center">
                <div className={`text-xs font-bold ${risk.color} mb-1`}>
                    {risk.level}
                </div>
                <div className="text-white text-lg font-bold">
                    {scamPercentage}%
                </div>
                <div className="text-white/60 text-xs">
                    Risk
                </div>
            </div>

            {/* Confidence indicator */}
            <div className="w-[94%]">
                <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span>Safe</span>
                    <span>Scam</span>
                </div>
                <div className="h-1 bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-400 to-red-400 transition-all duration-500"
                        style={{ width: `${scamPercentage}%` }}
                    ></div>
                </div>
            </div>

            {/* Pulse animation for high risk */}
            {scamProbability > 0.7 && (
                <div className="absolute inset-0 border-2 border-red-500 rounded-xl animate-pulse"></div>
            )}
        </div>
    )
}

export default ScamScore