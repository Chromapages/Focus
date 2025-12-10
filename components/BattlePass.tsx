import React from 'react';
import { UserProfile, LEVEL_THRESHOLDS, REWARDS } from '../types';
import { Trophy, Lock, Unlock, Star, Flame } from 'lucide-react';

interface BattlePassProps {
  userProfile: UserProfile;
}

const BattlePass: React.FC<BattlePassProps> = ({ userProfile }) => {
  const currentLevel = userProfile.level;
  const nextLevelXP = LEVEL_THRESHOLDS[currentLevel] || 10000;
  const prevLevelXP = LEVEL_THRESHOLDS[currentLevel - 1] || 0;
  const progressInLevel = userProfile.xp - prevLevelXP;
  const totalLevelXP = nextLevelXP - prevLevelXP;
  const percent = Math.min(100, Math.max(0, (progressInLevel / totalLevelXP) * 100));

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="battle-pass-gradient p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Trophy size={120} />
        </div>
        <div className="relative z-10 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Star className="fill-yellow-300 text-yellow-300" />
              Level {currentLevel}
            </h2>
            <p className="text-slate-100 opacity-90 text-sm mt-1">
              {userProfile.xp} XP Total
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-orange-200 font-bold bg-orange-900/30 px-3 py-1 rounded-full text-xs">
              <Flame size={14} className="fill-orange-400 text-orange-400" />
              {userProfile.streakDays} Day Streak
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs font-semibold mb-1 opacity-90">
            <span>Level {currentLevel}</span>
            <span>Level {currentLevel + 1}</span>
          </div>
          <div className="w-full bg-black/20 rounded-full h-4 backdrop-blur-sm">
            <div 
              className="bg-gradient-to-r from-yellow-300 to-yellow-500 h-4 rounded-full shadow-lg transition-all duration-1000 ease-out"
              style={{ width: `${percent}%` }}
            ></div>
          </div>
          <div className="text-right text-xs mt-1 opacity-80">
            {Math.floor(nextLevelXP - userProfile.xp)} XP to next reward
          </div>
        </div>
      </div>

      {/* Rewards Track */}
      <div className="p-4 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Season Rewards</h3>
        <div className="space-y-3">
          {REWARDS.map((reward) => {
            const isUnlocked = currentLevel > reward.level;
            const isNext = currentLevel === reward.level;
            
            return (
              <div 
                key={reward.level}
                className={`flex items-center gap-4 p-3 rounded-lg border ${
                  isUnlocked ? 'bg-green-50 border-green-200 opacity-60' : 
                  isNext ? 'bg-white border-purple-300 shadow-md ring-1 ring-purple-100' : 
                  'bg-slate-100 border-slate-200 opacity-70 grayscale'
                }`}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0
                  ${isUnlocked ? 'bg-green-100 text-green-600' : isNext ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-400'}
                `}>
                  {isUnlocked ? <Unlock size={18} /> : isNext ? reward.level : <Lock size={18} />}
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold text-sm ${isNext ? 'text-purple-900' : 'text-slate-700'}`}>
                    {reward.name}
                  </h4>
                  <p className="text-xs text-slate-500">{reward.description}</p>
                </div>
                {isNext && (
                  <div className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">
                    Next
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BattlePass;