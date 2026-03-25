import React, { useEffect, useState } from 'react';
import { Spin, Empty } from 'antd';
import { getDailyLearningToday, getDailyLearnings } from '@/services/api';
import './learning.less';

const SUBJECT_ICONS: Record<string, string> = {
  '美术': '🎨', '语言': '📖', '科学': '🔬', '社会': '🌍',
  '数学': '🔢', '音乐': '🎵', '体育': '⚽', '健康': '💪',
};

const getSubjectIcon = (name: string): string => {
  for (const [k, v] of Object.entries(SUBJECT_ICONS)) {
    if (name.includes(k)) return v;
  }
  return '📝';
};

const parseGoals = (goals: string): string[] =>
  goals.split(/\n/).map(s => s.replace(/^\d+[.、．]/, '').trim()).filter(Boolean);

const LearningPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [todayRes, listRes] = await Promise.all([
          getDailyLearningToday(),
          getDailyLearnings(10),
        ]);
        if (todayRes.code === 0) setToday(todayRes.data);
        if (listRes.code === 0) setHistory(listRes.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="loading-container"><Spin size="large" tip="加载中..." /></div>;
  }

  return (
    <div className="learning-page">
      <section className="learning-hero">
        <span className="learning-badge">Today's Learning</span>
        <h1 className="learning-title">今日所学</h1>
        <p className="learning-sub">记录宝贝每天的成长</p>
        <div className="hero-decor decor-1">📚</div>
        <div className="hero-decor decor-2">✏️</div>
        <div className="hero-decor decor-3">🌟</div>
      </section>

      {today ? (
        <div className="learning-today-card">
          <div className="card-tag">今天</div>
          <div className="card-header">
            <span className="subject-icon">{getSubjectIcon(today.activity_name)}</span>
            <div className="card-info">
              <h2 className="card-name">{today.activity_name}</h2>
              <span className="card-date">{today.activity_date}</span>
            </div>
          </div>
          <div className="card-goals">
            <div className="goals-label">活动目标</div>
            {parseGoals(today.activity_goals).map((g, i) => (
              <div key={i} className="goal-item">
                <span className="goal-num">{i + 1}</span>
                <span className="goal-text">{g}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-container">
          <Empty description="今天还没有发布所学内容" />
        </div>
      )}

      {history.length > (today ? 1 : 0) && (
        <section className="learning-history">
          <h3 className="history-title">近期学习记录</h3>
          <div className="history-list">
            {history
              .filter(h => !today || h.id !== today.id)
              .map((item) => (
                <div key={item.id} className="history-card">
                  <div className="history-header">
                    <span className="subject-icon-sm">{getSubjectIcon(item.activity_name)}</span>
                    <span className="history-name">{item.activity_name}</span>
                    <span className="history-date">{item.activity_date}</span>
                  </div>
                  <div className="history-goals">
                    {parseGoals(item.activity_goals).map((g, i) => (
                      <div key={i} className="history-goal">{i + 1}. {g}</div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default LearningPage;
