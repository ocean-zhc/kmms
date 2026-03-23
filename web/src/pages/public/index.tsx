import React, { useEffect, useState } from 'react';
import { Spin, Empty, Typography } from 'antd';
import MenuGrid from '@/components/MenuGrid';
import AiSummary from '@/components/AiSummary';
import NutritionAnalysis from '@/components/NutritionAnalysis';
import { getCurrentWeek, getPublicDishes } from '@/services/api';
import './index.less';

const { Title } = Typography;

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
      <div className="week-title">
        <Title level={3}>
          {weekData.year}年 第{weekData.week_number}周 宝宝食谱
        </Title>
      </div>
      <MenuGrid
        items={weekData.items || []}
        weekStart={weekData.week_start}
        weekEnd={weekData.week_end}
        dishes={dishes}
      />
      <NutritionAnalysis weekId={weekData.id} />
      <AiSummary weekId={weekData.id} />
    </div>
  );
};

export default PublicIndex;
