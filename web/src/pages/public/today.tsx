import React, { useEffect, useState } from 'react';
import { Spin, Empty } from 'antd';
import AiSummary from '@/components/AiSummary';
import NutritionAnalysis from '@/components/NutritionAnalysis';
import { getTodayMenu } from '@/services/api';
import './today.less';

const MEAL_TYPES = [
  { key: 'lunch', label: '营养午餐', icon: '🍚', gradient: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)', border: '#ffa940', decor: ['🍖', '🥬', '🍲'], accent: '#fa8c16' },
  { key: 'snack', label: '快乐午点', icon: '🧁', gradient: 'linear-gradient(135deg, #f0f5ff 0%, #d6e4ff 100%)', border: '#597ef7', decor: ['🧃', '🍪', '🍰'], accent: '#597ef7' },
];

const FOOD_EMOJI_RULES: [RegExp, string][] = [
  [/饭|米/, '🍚'], [/面|粉|饼/, '🍜'], [/汤|羹/, '🍲'], [/粥/, '🥣'],
  [/包|馒|卷|饺|馄/, '🥟'], [/鱼|虾|蟹/, '🐟'], [/鸡/, '🍗'],
  [/肉|排骨|牛|猪|鸭/, '🥩'], [/蛋|卵/, '🥚'], [/豆|腐/, '🫘'],
  [/奶|酸奶|牛乳/, '🥛'], [/果|苹|梨|蕉|橙|莓|桃|瓜(?!肉|鸡|骨)/, '🍎'],
  [/菜|菠|芹|萝卜|白菜|青|蔬|藕|笋|茄|椒|花菜|木耳|香菇|蘑/, '🥬'],
  [/糕|饼干|面包|蛋糕|琪玛/, '🍰'], [/玉米/, '🌽'],
];

const getDishEmoji = (name: string): string => {
  for (const [p, e] of FOOD_EMOJI_RULES) {
    if (p.test(name)) return e;
  }
  return '🍽';
};

const parseDishes = (content: string): string[] => {
  if (!content) return [];
  if (content.includes('|||')) return content.split('|||').map(s => s.trim()).filter(Boolean);
  return [content];
};

const TodayMenu: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchToday();
  }, []);

  const fetchToday = async () => {
    setLoading(true);
    try {
      const res = await getTodayMenu();
      if (res.code === 0 && res.data) {
        setData(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="正在加载今日食谱..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="empty-container">
        <Empty description="今日食谱尚未发布，请稍后查看" />
      </div>
    );
  }

  const hasItems = data.items?.some((i: any) => i.content);

  if (!hasItems) {
    return (
      <div className="empty-container">
        <Empty description={`${data.weekday_name}暂无食谱安排`} />
      </div>
    );
  }

  return (
    <div className="today-page">
      <section className="today-hero">
        <div className="today-hero-bg" />
        <div className="today-hero-content">
          <span className="today-badge">Today's Menu</span>
          <h1 className="today-title">
            <span className="today-weekday">{data.weekday_name}</span>
            <span className="today-highlight">今日食谱</span>
          </h1>
          <p className="today-date">{data.date}</p>
        </div>
        <div className="hero-decor decor-1">🥗</div>
        <div className="hero-decor decor-2">🍳</div>
        <div className="hero-decor decor-3">🥤</div>
      </section>

      <div className="today-meals">
        {MEAL_TYPES.map((meal) => {
          const item = data.items?.find((i: any) => i.meal_type === meal.key);
          if (!item?.content) return null;
          const dishes = parseDishes(item.content);
          return (
            <div
              key={meal.key}
              className={`today-meal-card meal-${meal.key}`}
              style={{ background: meal.gradient, borderColor: meal.border }}
            >
              <div className="card-decor decor-a">{meal.decor[0]}</div>
              <div className="card-decor decor-b">{meal.decor[1]}</div>
              <div className="card-decor decor-c">{meal.decor[2]}</div>
              <div className="meal-header">
                <span className="meal-icon">{meal.icon}</span>
                <span className="meal-label">{meal.label}</span>
                <span className="meal-count" style={{ background: meal.accent }}>{dishes.length}道</span>
              </div>
              <div className="meal-dishes">
                {dishes.map((name, i) => (
                  <div key={i} className="dish-pill" style={{ animationDelay: `${i * 0.08}s` }}>
                    <span className="dish-emoji">{getDishEmoji(name)}</span>
                    <span className="dish-name">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="today-analysis">
        <NutritionAnalysis weekId={data.week_id} weekday={data.weekday} />
        <AiSummary weekId={data.week_id} weekday={data.weekday} />
      </div>
    </div>
  );
};

export default TodayMenu;
