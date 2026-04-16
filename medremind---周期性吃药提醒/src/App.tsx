import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays, isWithinInterval, startOfDay, parseISO, isSameDay, subDays, getHours } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, ClipboardList, Heart, ChevronRight, Settings2, Pill, Sun, Moon, CheckCircle2, Beaker, X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { calculateMedication, predictNextCycle, calculateFollowUp, getRandomEncouragement, getRandomSuccessMessage } from './utils';

export default function App() {
  const [lmp, setLmp] = useState<string>(() => localStorage.getItem('lmp') || '');
  const [cycleLength, setCycleLength] = useState<number>(() => Number(localStorage.getItem('cycleLength')) || 28);
  const [actualStarts, setActualStarts] = useState<Record<number, string>>(() => {
    const saved = localStorage.getItem('actualStarts');
    return saved ? JSON.parse(saved) : {};
  });
  const [intakeLogs, setIntakeLogs] = useState<Record<string, { morning: boolean; evening: boolean }>>(() => {
    const saved = localStorage.getItem('intakeLogs');
    return saved ? JSON.parse(saved) : {};
  });
  const [showSettings, setShowSettings] = useState(!lmp);
  const [confirmReset, setConfirmReset] = useState(false);
  const [encouragement] = useState(getRandomEncouragement());
  const [missedReminder, setMissedReminder] = useState<{ type: 'morning' | 'evening'; text: string } | null>(null);
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('lmp', lmp);
    localStorage.setItem('cycleLength', cycleLength.toString());
    localStorage.setItem('actualStarts', JSON.stringify(actualStarts));
    localStorage.setItem('intakeLogs', JSON.stringify(intakeLogs));
  }, [lmp, cycleLength, actualStarts, intakeLogs]);

  // Check for missed dose reminders
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      
      // Skip if snoozed
      if (snoozeUntil && now.getTime() < snoozeUntil) {
        setMissedReminder(null);
        return;
      }

      const hours = getHours(now);
      const todayK = format(startOfDay(now), 'yyyy-MM-dd');
      const intake = intakeLogs[todayK] || { morning: false, evening: false };

      // Check if we are in medication period
      const isMedPeriod = medicationSchedules.find(s => 
        isWithinInterval(startOfDay(now), { start: s.startDate, end: s.endDate })
      );

      if (isMedPeriod) {
        if (hours >= 12 && !intake.morning) {
          setMissedReminder({ 
            type: 'morning', 
            text: '亲爱的，别忘了早上的地屈孕酮片哦，身体在等你呵护呢。' 
          });
        } else if (hours >= 22 && !intake.evening) {
          setMissedReminder({ 
            type: 'evening', 
            text: '准时服药才能更好恢复，晚上的地屈孕酮片还没记录呢。' 
          });
        } else {
          setMissedReminder(null);
        }
      } else {
        setMissedReminder(null);
      }
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    checkReminders(); // Initial check
    return () => clearInterval(interval);
  }, [intakeLogs, lmp, cycleLength, actualStarts]);

  const cycles = useMemo(() => {
    const lmpDate = lmp ? parseISO(lmp) : null;
    const result: Date[] = [];
    if (lmpDate) {
      result.push(lmpDate);
      for (let i = 1; i < 4; i++) {
        const actual = actualStarts[i];
        if (actual) {
          result.push(parseISO(actual));
        } else {
          result.push(predictNextCycle(result[i - 1], cycleLength));
        }
      }
    }
    return result;
  }, [lmp, cycleLength, actualStarts]);

  const medicationSchedules = cycles.slice(0, 3).map(date => calculateMedication(date));
  const followUp = cycles[3] ? calculateFollowUp(cycles[3]) : null;

  const today = startOfDay(new Date());
  const todayKey = format(today, 'yyyy-MM-dd');
  const todayIntake = intakeLogs[todayKey] || { morning: false, evening: false };

  const currentMed = medicationSchedules.find(s => 
    isWithinInterval(today, { start: s.startDate, end: s.endDate })
  );

  const nextMed = medicationSchedules.find(s => s.startDate > today);

  const logActualStart = (index: number, date: string) => {
    setActualStarts(prev => ({ ...prev, [index]: date }));
  };

  const toggleIntake = (type: 'morning' | 'evening') => {
    const isNowTaken = !todayIntake[type];
    setIntakeLogs(prev => ({
      ...prev,
      [todayKey]: {
        ...todayIntake,
        [type]: isNowTaken
      }
    }));
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#4A4A4A] font-serif selection:bg-rose-100 italic-style">
      {/* Toast Messages */}
      <AnimatePresence>
        {missedReminder && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: -20, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, y: 20, x: '-50%' }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-sm bg-white border-2 border-orange-200 p-6 rounded-[2.5rem] shadow-2xl space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-50 rounded-2xl shadow-sm mt-1">
                <Bell className="w-6 h-6 text-orange-500 animate-bounce" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-orange-900 text-base">温馨补丁</h4>
                <p className="text-sm text-orange-700 leading-relaxed font-medium">{missedReminder.text}</p>
              </div>
              <button 
                onClick={() => {
                  setMissedReminder(null);
                  setSnoozeUntil(Date.now() + 24 * 60 * 60 * 1000); // effectively ignore until tomorrow
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors self-start"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => {
                  toggleIntake(missedReminder.type);
                  setMissedReminder(null);
                }}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-200 active:scale-95 transition-all text-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                我已服用
              </button>
              <button 
                onClick={() => {
                  setSnoozeUntil(Date.now() + 15 * 60 * 1000); // 15 minutes
                  setMissedReminder(null);
                }}
                className="flex-1 py-3 bg-orange-50 text-orange-600 rounded-xl font-bold active:scale-95 transition-all text-sm"
              >
                稍后提醒
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-rose-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-400 rounded-full flex items-center justify-center shadow-sm">
              <Heart className="text-white w-4 h-4 fill-current" />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-rose-900">暖心提醒</h1>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-rose-50 rounded-full transition-colors"
          >
            <Settings2 className="w-5 h-5 text-rose-300" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-8 space-y-8">
        {/* Encouragement Quote */}
        {!showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center italic text-rose-400 text-sm px-4"
          >
            “ {encouragement} ”
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {showSettings ? (
            <motion.section
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white p-8 rounded-[2rem] shadow-xl shadow-rose-100/50 border border-rose-50 space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-rose-900">设置您的周期</h2>
                <p className="text-sm text-rose-300">我们会为您计算最合适的用药时间</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-rose-400 uppercase tracking-widest ml-1">首月经期第一天</label>
                  <input
                    type="date"
                    value={lmp}
                    onChange={(e) => setLmp(e.target.value)}
                    className="w-full p-4 bg-rose-50/50 border border-rose-100 rounded-2xl focus:ring-2 focus:ring-rose-200 transition-all outline-none text-rose-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-rose-400 uppercase tracking-widest ml-1">平均周期 (天)</label>
                  <input
                    type="number"
                    value={cycleLength}
                    onChange={(e) => setCycleLength(Number(e.target.value))}
                    className="w-full p-4 bg-rose-50/50 border border-rose-100 rounded-2xl focus:ring-2 focus:ring-rose-200 transition-all outline-none text-rose-900"
                  />
                </div>

                <button
                  onClick={() => lmp && setShowSettings(false)}
                  disabled={!lmp}
                  className="w-full py-4 bg-rose-400 text-white font-bold rounded-2xl hover:bg-rose-500 disabled:opacity-50 transition-all shadow-lg shadow-rose-200"
                >
                  开启呵护计划
                </button>

                <button
                  onClick={() => {
                    const testLmp = format(subDays(new Date(), 15), 'yyyy-MM-dd');
                    setLmp(testLmp);
                    setCycleLength(28);
                    setShowSettings(false);
                  }}
                  className="w-full py-3 bg-rose-50 text-rose-400 font-bold rounded-2xl border border-dashed border-rose-200 hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                >
                  <Beaker className="w-4 h-4" />
                  进入测试模式 (模拟服药期)
                </button>

                <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 space-y-2">
                  <div className="flex items-center gap-2 text-orange-700 font-bold text-xs uppercase tracking-widest">
                    <Bell className="w-3 h-3" />
                    定时提醒说明
                  </div>
                  <p className="text-[10px] text-orange-600 leading-relaxed font-medium">
                    若早上 12 点或晚上 10 点仍未打卡，我们会弹出温馨补丁提醒。
                    <br />
                    如需系统级闹钟提醒，请确保浏览器允许本站通知权限。
                  </p>
                  <button 
                    onClick={() => {
                      if ('Notification' in window) {
                        Notification.requestPermission().then(permission => {
                          if (permission === 'granted') alert('通知权限已开启，我们会守护您的健康。');
                        });
                      }
                    }}
                    className="text-[10px] font-extrabold text-orange-500 underline underline-offset-2"
                  >
                    开启系统级提醒
                  </button>
                </div>

                {lmp && (
                  <div className="pt-2">
                    {!confirmReset ? (
                      <button
                        onClick={() => setConfirmReset(true)}
                        className="w-full py-2 text-rose-300 text-sm font-medium hover:text-rose-400 transition-all"
                      >
                        重置所有数据
                      </button>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setLmp('');
                            setCycleLength(28);
                            setActualStarts({});
                            setIntakeLogs({});
                            localStorage.clear();
                            setConfirmReset(false);
                          }}
                          className="flex-1 py-3 bg-rose-100 text-rose-600 font-bold rounded-xl hover:bg-rose-200 transition-all"
                        >
                          确认重置
                        </button>
                        <button
                          onClick={() => setConfirmReset(false)}
                          className="flex-1 py-3 bg-gray-50 text-gray-400 font-bold rounded-xl hover:bg-gray-100 transition-all"
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.section>
          ) : (
            <div className="space-y-8">
              {/* Status Card */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-8 rounded-[2.5rem] shadow-lg border transition-all duration-500 ${
                  currentMed 
                    ? 'bg-gradient-to-br from-rose-400 to-rose-500 text-white border-rose-300 shadow-rose-200' 
                    : 'bg-white border-rose-50 shadow-rose-100/50'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-2xl backdrop-blur-md ${currentMed ? 'bg-white/20' : 'bg-rose-50'}`}>
                    <Clock className={`w-6 h-6 ${currentMed ? 'text-white' : 'text-rose-400'}`} />
                  </div>
                  {currentMed && (
                    <span className="px-4 py-1.5 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]">用药中</span>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className={`text-3xl font-bold tracking-tight ${currentMed ? 'text-white' : 'text-rose-900'}`}>
                    {currentMed ? '今日呵护' : nextMed ? '下个阶段' : '待设置'}
                  </h3>
                  <p className={`text-base font-medium leading-relaxed ${currentMed ? 'text-rose-50' : 'text-rose-300'}`}>
                    {currentMed 
                      ? '地屈孕酮片：早晚各一片' 
                      : nextMed 
                        ? `预计开始：${format(nextMed.startDate, 'MM月dd日')}`
                        : '暂无计划'}
                  </p>
                </div>

                {currentMed && (
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => toggleIntake('morning')}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                        todayIntake.morning 
                          ? 'bg-white text-rose-500 border-white shadow-md' 
                          : 'bg-white/10 text-rose-100 border-white/10'
                      }`}
                    >
                      <Sun className={`w-5 h-5 ${todayIntake.morning ? 'text-rose-500' : 'text-rose-100'}`} />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        {todayIntake.morning ? '晨间已服' : '晨间服药'}
                      </span>
                      <span className="text-[10px] opacity-70">08:00 AM</span>
                    </button>
                    <button 
                      onClick={() => toggleIntake('evening')}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                        todayIntake.evening 
                          ? 'bg-white text-rose-500 border-white shadow-md' 
                          : 'bg-white/10 text-rose-100 border-white/10'
                      }`}
                    >
                      <Moon className={`w-5 h-5 ${todayIntake.evening ? 'text-rose-500' : 'text-rose-100'}`} />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        {todayIntake.evening ? '晚间已服' : '晚间服药'}
                      </span>
                      <span className="text-[10px] opacity-70">06:00 PM</span>
                    </button>
                  </div>
                )}
              </motion.section>

              {/* 3-Month Plan */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-rose-300">周期管理</h2>
                  <CalendarIcon className="w-4 h-4 text-rose-200" />
                </div>

                <div className="space-y-4">
                  {medicationSchedules.map((schedule, idx) => {
                    const cycleStart = cycles[idx];
                    const isCurrentCycle = currentMed && medicationSchedules.indexOf(currentMed) === idx;
                    
                    return (
                      <div 
                        key={idx}
                        className={`bg-white p-6 rounded-[2rem] border transition-all group ${
                          isCurrentCycle ? 'border-rose-200 ring-4 ring-rose-50' : 'border-rose-50 hover:border-rose-100'
                        }`}
                      >
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-colors ${
                            isCurrentCycle ? 'bg-rose-400 text-white' : 'bg-rose-50 text-rose-300'
                          }`}>
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Cycle</span>
                            <span className="text-xl font-bold">{idx + 1}</span>
                          </div>
                          
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-bold text-rose-900">
                                {format(schedule.startDate, 'MM/dd')} - {format(schedule.endDate, 'MM/dd')}
                              </p>
                              {actualStarts[idx] && (
                                <CheckCircle2 className="w-3 h-3 text-rose-300" />
                              )}
                            </div>
                            <p className="text-xs text-rose-300 font-medium">地屈孕酮片 · 10天</p>
                          </div>
                        </div>

                        {/* Actual Start Logger for next cycles */}
                        {idx > 0 && (
                          <div className="mt-4 pt-4 border-t border-rose-50">
                            <label className="text-[10px] font-bold text-rose-200 uppercase tracking-widest block mb-2">
                              {actualStarts[idx] ? '已记录本月经期' : '本月月经已开始？'}
                            </label>
                            <input
                              type="date"
                              value={actualStarts[idx] || ''}
                              onChange={(e) => logActualStart(idx, e.target.value)}
                              className="w-full p-2 bg-rose-50/30 border border-rose-50 rounded-xl text-xs text-rose-400 outline-none focus:border-rose-200 transition-all"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Follow-up Reminder */}
              {followUp && (
                <section className="bg-gradient-to-br from-sage-50 to-sage-100/50 p-8 rounded-[2.5rem] border border-sage-200/50 space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm">
                      <ClipboardList className="w-6 h-6 text-sage-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sage-900 text-lg">复诊提醒</h3>
                      <p className="text-xs text-sage-500 font-medium">完成3个周期治疗后</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-white">
                    <p className="text-sm font-bold text-sage-900">
                      预计复诊：{format(followUp.startDate, 'yyyy年MM月dd日')}
                    </p>
                    <p className="text-xs text-sage-600 mt-2 leading-relaxed">
                      月经第 5-7 天，请前往医院复查 B 超。
                    </p>
                  </div>
                </section>
              )}

              <div className="text-center space-y-2 pb-12">
                <p className="text-[10px] text-rose-200 uppercase tracking-[0.3em]">
                  愿你每天都被温柔以待
                </p>
                <p className="text-[8px] text-gray-300 uppercase tracking-widest">
                  Medical Reminder Assistant
                </p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Custom Styles for Serif Fonts */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Noto+Serif+SC:wght@400;700&display=swap');
        .font-serif { font-family: 'Noto Serif SC', 'Cormorant Garamond', serif; }
        .italic-style h1, .italic-style h2 { font-style: italic; }
      `}} />
    </div>
  );
}
