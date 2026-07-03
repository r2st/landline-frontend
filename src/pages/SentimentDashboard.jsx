import { useState } from 'react';
import {
  BarChart3, Brain, MessageSquare, TrendingUp, Target,
  AlertCircle, ThumbsUp, ThumbsDown, Minus, Play,
  ChevronRight, Users, Zap, Send, Eye
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useSentimentSummary, useSentimentScores, useAnalyzeSentiment } from '../hooks/useSentiment';
import {
  useTestScenarios, useTestExchanges, useCreateTestExchange,
  useContinueTestExchange, useDeleteTestExchange
} from '../hooks/useEmailTesting';

const SENTIMENT_COLORS = {
  very_positive: '#10b981',
  positive: '#34d399',
  neutral: '#9ca3af',
  mixed: '#fbbf24',
  negative: '#ef4444',
};

const INTENT_ICONS = {
  interested: ThumbsUp,
  meeting_request: Target,
  question: MessageSquare,
  not_now: Minus,
  not_interested: ThumbsDown,
  objection: AlertCircle,
  referral: Users,
  auto_reply: Send,
  out_of_office: Send,
};

function ScoreGauge({ score, size = 'md' }) {
  const pct = ((score - 1) / 9) * 100;
  const color = score >= 7 ? '#10b981' : score >= 4.5 ? '#fbbf24' : '#ef4444';
  const sizeClasses = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-12 h-12 text-sm';

  return (
    <div className={`${sizeClasses} rounded-full border-4 flex items-center justify-center font-bold`}
         style={{ borderColor: color, color }}>
      {score.toFixed(1)}
    </div>
  );
}

function SentimentCard({ label, value, icon: Icon, color, subtitle }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function AnalyzePanel() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const analyze = useAnalyzeSentiment();

  const handleAnalyze = () => {
    if (!text.trim()) return;
    analyze.mutate({ text }, {
      onSuccess: (data) => setResult(data),
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5 text-indigo-600" />
        Analyze Email Reply
      </h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste an email reply to analyze its sentiment, intent, and buying signals..."
        className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
      />
      <button
        onClick={handleAnalyze}
        disabled={analyze.isPending || !text.trim()}
        className="mt-3 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
      >
        {analyze.isPending ? 'Analyzing...' : 'Analyze Sentiment'}
        <Zap className="w-4 h-4" />
      </button>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <ScoreGauge score={result.sentiment_score} size="lg" />
            <div>
              <p className="text-lg font-semibold capitalize">{result.sentiment_label}</p>
              <p className="text-sm text-gray-600">Intent: <span className="font-medium">{result.intent}</span> ({(result.intent_confidence * 100).toFixed(0)}% confident)</p>
            </div>
          </div>

          {result.emotions && Object.keys(result.emotions).length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Emotions Detected</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.emotions).filter(([, v]) => v > 0.2).map(([emotion, intensity]) => (
                  <span key={emotion} className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium">
                    {emotion}: {(intensity * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.buying_signals?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-green-700 mb-2">Buying Signals</p>
              <div className="flex flex-wrap gap-2">
                {result.buying_signals.map((s, i) => (
                  <span key={i} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          {result.objections?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-700 mb-2">Objections</p>
              <div className="flex flex-wrap gap-2">
                {result.objections.map((o, i) => (
                  <span key={i} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">{o}</span>
                ))}
              </div>
            </div>
          )}

          {result.recommended_action && (
            <div className="p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm font-medium text-indigo-900">Recommended Action: <span className="capitalize">{result.recommended_action.replace(/_/g, ' ')}</span></p>
              {result.action_reasoning && <p className="text-xs text-indigo-700 mt-1">{result.action_reasoning}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TestExchangePanel() {
  const { data: scenarios } = useTestScenarios();
  const { data: exchanges, isLoading } = useTestExchanges();
  const createExchange = useCreateTestExchange();
  const continueExchange = useContinueTestExchange();
  const deleteExchange = useDeleteTestExchange();
  const [selectedScenario, setSelectedScenario] = useState('positive_lead');
  const [expandedExchange, setExpandedExchange] = useState(null);

  const handleCreate = () => {
    createExchange.mutate({ scenario: selectedScenario });
  };

  const handleContinue = (exchange) => {
    const senderMessages = exchange.messages?.filter(m => m.role === 'sender') || [];
    const nextStep = senderMessages.length + 1;
    if (nextStep > 4) return;
    continueExchange.mutate({ id: exchange.id, step_number: nextStep });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Play className="w-5 h-5 text-indigo-600" />
        Email Test Exchanges
      </h3>

      <div className="flex gap-3 mb-6">
        <select
          value={selectedScenario}
          onChange={(e) => setSelectedScenario(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
        >
          {scenarios?.map((s) => (
            <option key={s.id} value={s.id}>{s.id.replace(/_/g, ' ')} — {s.description}</option>
          ))}
        </select>
        <button
          onClick={handleCreate}
          disabled={createExchange.isPending}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {createExchange.isPending ? 'Creating...' : 'Run Test'}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500 py-4">Loading exchanges...</p>
      ) : (
        <div className="space-y-3">
          {exchanges?.map((ex) => (
            <div key={ex.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() => setExpandedExchange(expandedExchange === ex.id ? null : ex.id)}
              >
                <div className="flex items-center gap-3">
                  <ChevronRight className={`w-4 h-4 transition-transform ${expandedExchange === ex.id ? 'rotate-90' : ''}`} />
                  <span className="text-sm font-medium text-gray-900">{ex.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    ex.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>{ex.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  {ex.avg_sentiment && <ScoreGauge score={ex.avg_sentiment} />}
                  <span className="text-xs text-gray-500">{ex.total_messages} msgs</span>
                  {ex.outcome && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      ex.outcome === 'meeting_booked' ? 'bg-green-100 text-green-700' :
                      ex.outcome === 'lost' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{ex.outcome?.replace(/_/g, ' ')}</span>
                  )}
                </div>
              </div>

              {expandedExchange === ex.id && (
                <div className="px-4 py-3 border-t border-gray-200">
                  <div className="space-y-3">
                    {ex.messages?.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'sender' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] p-3 rounded-lg text-sm ${
                          msg.role === 'sender'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="font-medium text-xs mb-1 opacity-75">
                            {msg.role === 'sender' ? 'You' : ex.persona_name || 'Prospect'}
                            {msg.step_number ? ` (Step ${msg.step_number})` : ''}
                          </p>
                          <p className="font-medium mb-1">{msg.subject}</p>
                          <p className="whitespace-pre-wrap">{msg.body?.substring(0, 300)}{msg.body?.length > 300 ? '...' : ''}</p>
                          {msg.sentiment_score && (
                            <div className="mt-2 pt-2 border-t border-gray-200/30 flex items-center gap-2">
                              <ScoreGauge score={msg.sentiment_score} />
                              <span className="text-xs capitalize">{msg.intent}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                    {ex.status === 'active' && (
                      <button
                        onClick={() => handleContinue(ex)}
                        disabled={continueExchange.isPending}
                        className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {continueExchange.isPending ? 'Sending...' : 'Send Next Step'}
                      </button>
                    )}
                    <button
                      onClick={() => deleteExchange.mutate(ex.id)}
                      className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {(!exchanges || exchanges.length === 0) && (
            <p className="text-sm text-gray-500 py-4 text-center">No test exchanges yet. Select a scenario and click "Run Test" to get started.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SentimentDashboard() {
  const [days, setDays] = useState(30);
  const { data: summary, isLoading } = useSentimentSummary(days);
  const [activeTab, setActiveTab] = useState('overview');

  const pieData = summary ? [
    { name: 'Positive', value: summary.positive_pct, color: '#10b981' },
    { name: 'Neutral', value: summary.neutral_pct, color: '#9ca3af' },
    { name: 'Negative', value: summary.negative_pct, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sentiment & Testing</h1>
          <p className="text-sm text-gray-600 mt-1">Analyze reply sentiment, run email tests, and optimize your outreach</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'analyze', label: 'Analyze', icon: Brain },
          { id: 'testing', label: 'Email Testing', icon: Play },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SentimentCard
              label="Total Analyzed"
              value={summary?.total_analyzed || 0}
              icon={Eye}
              color="bg-indigo-600"
              subtitle="email replies scored"
            />
            <SentimentCard
              label="Avg Sentiment"
              value={summary?.avg_sentiment?.toFixed(1) || '—'}
              icon={TrendingUp}
              color={
                (summary?.avg_sentiment || 5) >= 7 ? 'bg-green-600' :
                (summary?.avg_sentiment || 5) >= 4.5 ? 'bg-yellow-500' : 'bg-red-600'
              }
              subtitle="out of 10"
            />
            <SentimentCard
              label="Positive"
              value={`${summary?.positive_pct?.toFixed(0) || 0}%`}
              icon={ThumbsUp}
              color="bg-green-600"
              subtitle="of all replies"
            />
            <SentimentCard
              label="Negative"
              value={`${summary?.negative_pct?.toFixed(0) || 0}%`}
              icon={ThumbsDown}
              color="bg-red-600"
              subtitle="of all replies"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Sentiment Trend</h3>
              {summary?.trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={summary.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[1, 10]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avg_score" stroke="#4338ca" strokeWidth={2} dot={false} name="Avg Score" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 py-12 text-center">No sentiment data yet. Analyze some email replies to see trends.</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Sentiment Distribution</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}%`}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 py-12 text-center">No data to display.</p>
              )}
            </div>
          </div>

          {summary?.top_intents?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Reply Intent Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={summary.top_intents} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="intent" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4338ca" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analyze' && <AnalyzePanel />}
      {activeTab === 'testing' && <TestExchangePanel />}
    </div>
  );
}
