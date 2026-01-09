
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Attributes, 
  Talent, 
  GameState, 
  GameEvent, 
  Choice, 
  NPC 
} from './types';
import { generateInitialState, processYear, summarizeLife } from './geminiService';
import AttributeBar from './components/AttributeBar';
import EventLog from './components/EventLog';

const App: React.FC = () => {
  const [phase, setPhase] = useState<'intro' | 'setup' | 'playing' | 'ending'>('intro');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [gameState, setGameState] = useState<GameState>({
    attributes: { INT: 0, CHA: 0, STR: 0, FIN: 0, LUK: 0 },
    age: 0,
    money: 0,
    talents: [],
    npcs: [],
    history: [],
    isGameOver: false,
    status: '出生在即',
    currentChoices: [],
    achievements: [],
  });
  const [talentOptions, setTalentOptions] = useState<Talent[]>([]);
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);
  const [summary, setSummary] = useState<string>('');
  const logEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const startSetup = async () => {
    setLoading(true);
    setLoadingMsg('投胎中，正在随机生成初始属性...');
    try {
      const data = await generateInitialState();
      setGameState(prev => ({
        ...prev,
        attributes: data.attributes,
        money: data.attributes.FIN * 1000, // 初始资金基于家境
      }));
      setTalentOptions(data.talents);
      setPhase('setup');
    } catch (error) {
      console.error(error);
      alert('连接天道失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!selectedTalent) return;
    setPhase('playing');
    setLoading(true);
    setLoadingMsg('第一声啼哭，你来到了这个世界...');
    try {
      const initialStep = await processYear({
        ...gameState,
        talents: [selectedTalent]
      }, "作为婴儿出生了");
      
      updateGameState(initialStep, "出生了");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateGameState = (step: any, lastChoiceText: string) => {
    setGameState(prev => {
      const newAttributes = { ...prev.attributes };
      let effectStrs = [];
      
      // Fix: Cast 'val' to number before comparison and arithmetic to resolve 'unknown' operator error
      for (const [key, val] of Object.entries(step.attributeChanges)) {
        const k = key as keyof Attributes;
        const numVal = val as number;
        newAttributes[k] = Math.max(0, Math.min(100, (newAttributes[k] || 0) + numVal));
        if (numVal !== 0) {
          effectStrs.push(`${k} ${numVal > 0 ? '+' : ''}${numVal}`);
        }
      }

      if (step.moneyChange !== 0) {
        effectStrs.push(`存款 ${step.moneyChange > 0 ? '+' : ''}${step.moneyChange}`);
      }

      const newEvent: GameEvent = {
        age: prev.age + (Math.floor(Math.random() * 3) + 1), // 年龄跨度
        description: step.eventDescription,
        effect: effectStrs.join(', '),
        attributesChange: step.attributeChanges,
        moneyChange: step.moneyChange,
      };

      const newState = {
        ...prev,
        age: newEvent.age,
        attributes: newAttributes,
        money: prev.money + step.moneyChange,
        npcs: [...prev.npcs, ...(step.newNpcs || [])],
        history: [...prev.history, newEvent],
        currentChoices: step.choices,
        isGameOver: step.isGameOver,
        deathReason: step.deathReason,
        achievements: Array.from(new Set([...prev.achievements, ...(step.achievements || [])])),
        talents: prev.talents.length === 0 ? [selectedTalent!] : prev.talents,
      };

      if (newState.isGameOver) {
        setPhase('ending');
        handleGameOver(newState);
      }

      return newState;
    });
  };

  const handleChoice = async (choice: Choice) => {
    setLoading(true);
    setLoadingMsg('决策中，命运齿轮正在转动...');
    try {
      const result = await processYear(gameState, choice.text);
      updateGameState(result, choice.text);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGameOver = async (finalState: GameState) => {
    setLoading(true);
    setLoadingMsg('正在结算你的一生...');
    try {
      const res = await summarizeLife(finalState);
      setSummary(res);
    } catch (err) {
      setSummary("这一生走得太快，连天道都来不及感叹。");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount: number) => {
    if (amount >= 100000000) return `${(amount / 100000000).toFixed(2)} 亿`;
    if (amount >= 10000) return `${(amount / 10000).toFixed(2)} 万`;
    return `${amount.toFixed(0)} 元`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center p-4 md:p-8">
      {/* Intro Phase */}
      {phase === 'intro' && (
        <div className="max-w-2xl w-full text-center mt-20 animate-fade-in">
          <h1 className="text-5xl font-black text-slate-800 mb-6 tracking-tighter">
            无限人生 <span className="text-indigo-600">重塑</span>
          </h1>
          <p className="text-lg text-slate-500 mb-10 leading-relaxed">
            如果生命可以重来，你会如何定义你的价值？<br/>
            这是一个由 AI 驱动的人生模拟器，你的每一个决策都将重塑未来。
          </p>
          <button 
            onClick={startSetup}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-2xl shadow-xl shadow-indigo-200 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {loading ? '连接天道中...' : '开始我的新人生'}
          </button>
        </div>
      )}

      {/* Setup Phase */}
      {phase === 'setup' && (
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in mt-10">
          <div className="glass p-8 rounded-3xl shadow-lg border border-white">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2">
              <span className="bg-indigo-100 p-2 rounded-lg text-indigo-600">🧬</span> 初始属性
            </h2>
            <div className="space-y-4">
              <AttributeBar label="智力 (INT)" value={gameState.attributes.INT * 5} icon="🧠" color="bg-blue-400" />
              <AttributeBar label="魅力 (CHA)" value={gameState.attributes.CHA * 5} icon="✨" color="bg-pink-400" />
              <AttributeBar label="体魄 (STR)" value={gameState.attributes.STR * 5} icon="💪" color="bg-green-400" />
              <AttributeBar label="家境 (FIN)" value={gameState.attributes.FIN * 5} icon="🏠" color="bg-amber-400" />
              <AttributeBar label="运气 (LUK)" value={gameState.attributes.LUK * 5} icon="🍀" color="bg-purple-400" />
            </div>
            <p className="mt-6 text-sm text-slate-400 italic">属性总点数固定为20点，通过家境换算的初始资金：{formatMoney(gameState.money)}</p>
          </div>

          <div className="glass p-8 rounded-3xl shadow-lg border border-white flex flex-col">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2">
              <span className="bg-indigo-100 p-2 rounded-lg text-indigo-600">💎</span> 选择天赋
            </h2>
            <div className="space-y-4 flex-grow">
              {talentOptions.map(talent => (
                <button
                  key={talent.id}
                  onClick={() => setSelectedTalent(talent)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                    selectedTalent?.id === talent.id 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-slate-100 hover:border-indigo-200 bg-white'
                  }`}
                >
                  <h3 className="font-bold text-indigo-700">{talent.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{talent.description}</p>
                </button>
              ))}
            </div>
            <button
              onClick={handleStartGame}
              disabled={!selectedTalent || loading}
              className="mt-8 bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              踏入尘世
            </button>
          </div>
        </div>
      )}

      {/* Playing Phase */}
      {phase === 'playing' && (
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left: Stats Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            <div className="glass p-6 rounded-3xl shadow-sm border border-white sticky top-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {gameState.age}
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">人生轨迹</h2>
                  <p className="text-xs text-slate-400">岁数越大，挑战越多</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl">
                  <span className="text-sm text-slate-500">资产总计</span>
                  <span className="font-bold text-emerald-600 font-mono">{formatMoney(gameState.money)}</span>
                </div>
              </div>

              <div className="space-y-2 border-t pt-6">
                <AttributeBar label="智力" value={gameState.attributes.INT} icon="🧠" color="bg-blue-400" />
                <AttributeBar label="魅力" value={gameState.attributes.CHA} icon="✨" color="bg-pink-400" />
                <AttributeBar label="体魄" value={gameState.attributes.STR} icon="💪" color="bg-green-400" />
                <AttributeBar label="家境" value={gameState.attributes.FIN} icon="🏠" color="bg-amber-400" />
                <AttributeBar label="运气" value={gameState.attributes.LUK} icon="🍀" color="bg-purple-400" />
              </div>

              {gameState.talents.length > 0 && (
                <div className="mt-6 border-t pt-6">
                  <span className="text-xs font-bold text-slate-400 block mb-2">天赋能力</span>
                  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                    <h4 className="text-sm font-bold text-indigo-700">{gameState.talents[0].name}</h4>
                    <p className="text-xs text-indigo-500/80 mt-1">{gameState.talents[0].description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Main Game Board */}
          <div className="lg:col-span-6 space-y-6">
            <div className="glass p-8 rounded-3xl shadow-sm border border-white min-h-[400px] flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-9xl font-black">
                {gameState.age}
              </div>
              
              <div className="flex-grow">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                    <p className="text-slate-500 font-medium animate-pulse">{loadingMsg}</p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">下一步决策</h2>
                    {gameState.history.length > 0 && (
                      <div className="mb-10 p-6 bg-white rounded-2xl shadow-sm border border-slate-50">
                        <p className="text-lg leading-relaxed text-slate-700">
                          {gameState.history[gameState.history.length - 1].description}
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-3">
                      {gameState.currentChoices.map(choice => (
                        <button
                          key={choice.id}
                          onClick={() => handleChoice(choice)}
                          disabled={loading}
                          className={`group p-4 rounded-2xl border-2 text-left transition-all flex justify-between items-center ${
                            choice.risk === 'High' 
                            ? 'border-red-100 hover:border-red-500 bg-red-50/30' 
                            : choice.risk === 'Medium'
                            ? 'border-amber-100 hover:border-amber-500 bg-amber-50/30'
                            : 'border-slate-100 hover:border-indigo-500 bg-white'
                          }`}
                        >
                          <div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2 inline-block ${
                              choice.risk === 'High' ? 'bg-red-100 text-red-600' : 
                              choice.risk === 'Medium' ? 'bg-amber-100 text-amber-600' : 
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {choice.risk === 'High' ? '高风险高回报' : choice.risk === 'Medium' ? '中等难度' : '稳健选择'}
                            </span>
                            <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{choice.text}</h3>
                            {choice.requirement && (
                              <p className="text-xs text-slate-400 mt-1">门槛: {choice.requirement}</p>
                            )}
                          </div>
                          <span className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all">→</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Social Panel */}
            {gameState.npcs.length > 0 && (
              <div className="glass p-8 rounded-3xl shadow-sm border border-white">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600">👥</span> 社交圈
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gameState.npcs.map((npc, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-50 flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-slate-500">
                        {npc.name[0]}
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold text-slate-700">{npc.name}</h4>
                          <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{npc.relationType}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1 rounded-full mt-2 overflow-hidden">
                          <div className="bg-emerald-400 h-full" style={{ width: `${npc.favourability}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: History Log */}
          <div className="lg:col-span-3 space-y-6 h-[calc(100vh-4rem)] overflow-y-auto custom-scroll">
            <div className="glass p-6 rounded-3xl shadow-sm border border-white">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600">📜</span> 人生记录
              </h2>
              <EventLog history={gameState.history} />
              <div ref={logEndRef} />
            </div>

            {gameState.achievements.length > 0 && (
              <div className="glass p-6 rounded-3xl shadow-sm border border-white">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="bg-amber-100 p-1.5 rounded-lg text-amber-600">🏆</span> 成就榜单
                </h2>
                <div className="space-y-2">
                  {gameState.achievements.map((ach, i) => (
                    <div key={i} className="text-xs bg-amber-50 text-amber-700 p-2 rounded-lg font-bold border border-amber-100">
                      🏅 {ach}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ending Phase */}
      {phase === 'ending' && (
        <div className="max-w-3xl w-full animate-fade-in py-10">
          <div className="glass p-10 rounded-3xl shadow-2xl border border-white text-center">
            <div className="w-24 h-24 bg-slate-900 text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-8 shadow-xl">
              🕊️
            </div>
            <h1 className="text-4xl font-black text-slate-800 mb-2">尘埃落定</h1>
            <p className="text-slate-400 mb-8 font-mono">终年 {gameState.age} 岁 | 死因：{gameState.deathReason || '寿终正寝'}</p>
            
            <div className="bg-white/50 p-8 rounded-2xl mb-10 text-left relative">
              <span className="absolute top-4 left-4 text-4xl opacity-10 font-serif">"</span>
              <p className="text-lg text-slate-700 italic leading-relaxed relative z-10">
                {loading ? '正在篆刻墓碑文字...' : summary}
              </p>
              <span className="absolute bottom-4 right-4 text-4xl opacity-10 font-serif">"</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-indigo-50 p-4 rounded-2xl">
                <span className="text-xs text-indigo-400 block mb-1">最终资产</span>
                <span className="text-2xl font-black text-indigo-600">{formatMoney(gameState.money)}</span>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl">
                <span className="text-xs text-amber-400 block mb-1">成就达成</span>
                <span className="text-2xl font-black text-amber-600">{gameState.achievements.length} 个</span>
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="bg-indigo-600 text-white font-bold py-4 px-12 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200"
            >
              开启下一世
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
