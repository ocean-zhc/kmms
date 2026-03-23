import React, { useEffect, useState } from 'react';
import { Card, Spin, Button, Progress, Tag } from 'antd';
import { ExperimentOutlined, ReloadOutlined } from '@ant-design/icons';
import { getNutritionAnalysis } from '@/services/api';
import './NutritionAnalysis.less';

interface NutritionData {
  macronutrients: { protein: number; carbs: number; fat: number };
  micronutrients: { fiber: number; vitamins: number; minerals: number };
  categories: { staple: number; meat: number; veg: number; soup: number; dairy: number; fruit: number };
  score: number;
  summary: string;
  cached?: boolean;
  generated_at?: string;
}

const MACRO_COLORS = { protein: '#52c41a', carbs: '#1890ff', fat: '#faad14' };
const MACRO_LABELS = { protein: '蛋白质', carbs: '碳水', fat: '脂肪' };

const CATEGORY_CONFIG: { key: string; label: string; color: string }[] = [
  { key: 'veg', label: '蔬菜', color: 'green' },
  { key: 'meat', label: '肉蛋', color: 'orange' },
  { key: 'staple', label: '主食', color: 'blue' },
  { key: 'soup', label: '汤羹', color: 'gold' },
  { key: 'dairy', label: '奶制品', color: 'purple' },
  { key: 'fruit', label: '水果', color: 'magenta' },
];

const NutritionAnalysis: React.FC<{ weekId: number }> = ({ weekId }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NutritionData | null>(null);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getNutritionAnalysis(weekId);
      if (res.code === 0) {
        setData(res.data);
      } else {
        setError(res.message || '获取失败');
      }
    } catch {
      setError('营养分析暂不可用');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (weekId) fetchData();
  }, [weekId]);

  if (error) return null;

  const renderDonut = () => {
    if (!data) return null;
    const { protein, carbs, fat } = data.macronutrients;
    const total = protein + carbs + fat;
    const radius = 38;
    const circumference = 2 * Math.PI * radius;

    const segments = [
      { value: protein, color: MACRO_COLORS.protein },
      { value: carbs, color: MACRO_COLORS.carbs },
      { value: fat, color: MACRO_COLORS.fat },
    ];

    let offset = 0;
    return (
      <svg viewBox="0 0 100 100" className="donut-svg">
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * circumference;
          const el = (
            <circle
              key={i}
              cx="50" cy="50" r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth="10"
              strokeDasharray={`${dash} ${circumference}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += dash;
          return el;
        })}
        <text x="50" y="46" textAnchor="middle" className="score-num">{data.score}</text>
        <text x="50" y="60" textAnchor="middle" className="score-label">营养评分</text>
      </svg>
    );
  };

  return (
    <Card
      className="nutrition-card"
      title={
        <span className="nutrition-title">
          <ExperimentOutlined /> 营养分析
        </span>
      }
      extra={
        !loading && data ? (
          <Button type="text" size="small" icon={<ReloadOutlined />} onClick={fetchData} className="refresh-btn">
            刷新
          </Button>
        ) : null
      }
    >
      {loading ? (
        <div className="nutrition-loading">
          <Spin />
          <span>AI正在分析营养数据...</span>
        </div>
      ) : data ? (
        <>
          <div className="nutrition-body">
            {/* 左侧：环形图 */}
            <div className="donut-section">
              <div className="section-label">三大营养素</div>
              <div className="donut-wrapper">
                {renderDonut()}
              </div>
              <div className="legend">
                {(Object.keys(MACRO_LABELS) as Array<keyof typeof MACRO_LABELS>).map((key) => (
                  <div key={key} className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: MACRO_COLORS[key] }} />
                    {MACRO_LABELS[key]} {data.macronutrients[key]}%
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧：微量元素 + 食材品类 */}
            <div className="detail-section">
              <div className="section-label">微量元素充足度</div>
              <div className="progress-group">
                <div className="progress-row">
                  <span>膳食纤维</span>
                  <Progress percent={data.micronutrients.fiber} strokeColor="#73d13d" size="small" />
                </div>
                <div className="progress-row">
                  <span>维生素</span>
                  <Progress percent={data.micronutrients.vitamins} strokeColor="#ffec3d" size="small" />
                </div>
                <div className="progress-row">
                  <span>矿物质</span>
                  <Progress percent={data.micronutrients.minerals} strokeColor="#ffa940" size="small" />
                </div>
              </div>

              <div className="section-label" style={{ marginTop: 16 }}>食材品类分布</div>
              <div className="category-tags">
                {CATEGORY_CONFIG.map((c) => {
                  const count = (data.categories as any)[c.key] || 0;
                  return count > 0 ? (
                    <Tag key={c.key} color={c.color}>{c.label} {count}份</Tag>
                  ) : null;
                })}
              </div>
            </div>
          </div>

          {data.summary && (
            <div className="nutrition-footer">
              <span className="summary-text">💡 {data.summary}</span>
              {data.generated_at && (
                <span className="gen-time">生成于 {data.generated_at}</span>
              )}
            </div>
          )}
        </>
      ) : null}
    </Card>
  );
};

export default NutritionAnalysis;
