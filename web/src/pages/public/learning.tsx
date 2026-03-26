import React, { useEffect, useState, useMemo } from 'react';
import { Spin, Empty } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { getDailyLearningToday, getDailyLearningsByMonth } from '@/services/api';
import './learning.less';

const SUBJECT_MAP: Record<string, { icon: string; color: string }> = {
  '美术': { icon: '🎨', color: '#fa8c16' },
  '语言': { icon: '📖', color: '#1890ff' },
  '科学': { icon: '🔬', color: '#52c41a' },
  '社会': { icon: '🌍', color: '#722ed1' },
  '数学': { icon: '🔢', color: '#eb2f96' },
  '音乐': { icon: '🎵', color: '#13c2c2' },
  '体育': { icon: '⚽', color: '#f5222d' },
  '健康': { icon: '💪', color: '#52c41a' },
};

const getSubject = (name: string) => {
  for (const [k, v] of Object.entries(SUBJECT_MAP)) {
    if (name.includes(k)) return { ...v, label: k };
  }
  return { icon: '📝', color: '#52c41a', label: '' };
};

const parseGoals = (goals: string): string[] =>
  goals.split(/\n/).map(s => s.replace(/^\d+[.、．]/, '').trim()).filter(Boolean);

const MONTHS = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];

const WEEKDAYS = ['日','一','二','三','四','五','六'];

const formatDate = (d: string) => {
  const date = new Date(d + 'T00:00:00');
  return `${date.getMonth() + 1}月${date.getDate()}日 周${WEEKDAYS[date.getDay()]}`;
};

const LearningPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<any>(null);
  const [monthData, setMonthData] = useState<any[]>([]);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [monthLoading, setMonthLoading] = useState(false);

  useEffect(() => {
    getDailyLearningToday().then(res => {
      if (res.code === 0) setToday(res.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setMonthLoading(true);
    getDailyLearningsByMonth(year, month).then(res => {
      if (res.code === 0) setMonthData(res.data || []);
    }).finally(() => setMonthLoading(false));
  }, [year, month]);

  const historyItems = useMemo(() =>
    monthData.filter(h => !today || h.id !== today.id),
    [monthData, today]
  );

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth() + 1) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth() + 1;

  if (loading) {
    return <div className="loading-container"><Spin size="large" tip="加载中..." /></div>;
  }

  return (
    <div className="learning-page">
      <section className="learning-hero">
        <span className="learning-badge">Daily Learning</span>
        <h1 className="learning-title">今日所学</h1>
        <p className="learning-sub">记录宝贝每天的成长足迹</p>
      </section>

      {today ? (
        <div className="learning-today-card">
          <div className="card-tag">TODAY</div>
          <div className="card-header">
            <div className="subject-badge" style={{ background: getSubject(today.activity_name).color }}>
              {getSubject(today.activity_name).icon}
            </div>
            <div className="card-info">
              <h2 className="card-name">{today.activity_name}</h2>
              <span className="card-date">{formatDate(today.activity_date)}</span>
            </div>
          </div>
          <div className="card-goals">
            {parseGoals(today.activity_goals).map((g, i) => (
              <div key={i} className="goal-item" style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="goal-num" style={{ background: getSubject(today.activity_name).color }}>{i + 1}</span>
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

      <section className="learning-history">
        <div className="month-nav">
          <button className="month-btn" onClick={prevMonth} aria-label="上一月"><LeftOutlined /></button>
          <span className="month-label">{year}年{MONTHS[month - 1]}</span>
          <button className="month-btn" onClick={nextMonth} disabled={isCurrentMonth} aria-label="下一月"><RightOutlined /></button>
        </div>

        {monthLoading ? (
          <div className="loading-container" style={{ minHeight: 120 }}><Spin /></div>
        ) : historyItems.length > 0 ? (
          <div className="history-timeline">
            {historyItems.map((item) => {
              const subj = getSubject(item.activity_name);
              return (
                <div key={item.id} className="timeline-item">
                  <div className="timeline-dot" style={{ background: subj.color }} />
                  <div className="timeline-card">
                    <div className="timeline-header">
                      <span className="timeline-icon">{subj.icon}</span>
                      <span className="timeline-name">{item.activity_name}</span>
                      <span className="timeline-date">{formatDate(item.activity_date)}</span>
                    </div>
                    <div className="timeline-goals">
                      {parseGoals(item.activity_goals).map((g, i) => (
                        <div key={i} className="timeline-goal">{i + 1}. {g}</div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-container" style={{ minHeight: 120 }}>
            <Empty description="本月暂无记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        )}
      </section>
    </div>
  );
};

export default LearningPage;
