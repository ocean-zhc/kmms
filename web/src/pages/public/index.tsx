import React, { useEffect, useState } from 'react';
import { Spin, Empty } from 'antd';
import MenuGrid from '@/components/MenuGrid';
import AiSummary from '@/components/AiSummary';
import NutritionAnalysis from '@/components/NutritionAnalysis';
import NoticeBar from '@/components/NoticeBar';
import { getCurrentWeek, getPublicDishes } from '@/services/api';
import './index.less';

const PublicIndex: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState<any>(null);
  const [dishes, setDishes] = useState<any[]>([]);

  useEffect(() => {
    fetchCurrentWeek();
    fetchDishes();
  }, []);

  const fetchCurrentWeek = async () => {
    setLoading(true);
    try {
      const res = await getCurrentWeek();
      if (res.code === 0 && res.data) {
        setWeekData(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDishes = async () => {
    try {
      const res = await getPublicDishes();
      if (res.code === 0) setDishes(res.data || []);
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="正在加载食谱..." />
      </div>
    );
  }

  if (!weekData) {
    return (
      <div className="empty-container">
        <Empty description="本周食谱尚未发布，请稍后查看" />
      </div>
    );
  }

  return (
    <div className="public-index">
      <section className="hero-section">
        <span className="hero-badge">Health & Joy</span>
        <h1 className="hero-title">
          <span className="year-tag">{weekData.year}年</span>
          第{weekData.week_number}周
          <span className="highlight">精心食谱</span>
        </h1>
        <p className="hero-subtitle">用心挑选每一份食材，守护宝宝舌尖上的幸福</p>
        <div className="hero-decor decor-1">🍎</div>
        <div className="hero-decor decor-2">🥦</div>
        <div className="hero-decor decor-3">🥕</div>
      </section>
      <NoticeBar />
      <MenuGrid
        items={weekData.items || []}
        weekStart={weekData.week_start}
        weekEnd={weekData.week_end}
        dishes={dishes}
      />
      <div className="analysis-grid">
        <NutritionAnalysis weekId={weekData.id} />
        <AiSummary weekId={weekData.id} />
      </div>
    </div>
  );
};

export default PublicIndex;
